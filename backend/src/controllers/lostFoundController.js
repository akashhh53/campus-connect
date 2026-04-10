const LostFoundItem = require('../models/lost&Found/lostFoundItem');
const User = require('../models/userIdentity/user');

// Report a lost item
const reportLostItem = async (req, res) => {
  try {
    // 1. Get logged-in user
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // 2. Check if user has college
    if (!user.collegeId) {
      return res.status(400).json({ 
        success: false, 
        message: "You are not associated with any college" 
      });
    }

    // 3. Get data from request body
    const { title, description, location } = req.body;

    // 4. Validate required fields
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: "Title is required" 
      });
    }
    
    if (!location) {
      return res.status(400).json({ 
        success: false, 
        message: "Location is required" 
      });
    }

    // 5. Handle image uploads (from multer)
    let imageUrls = [];
    let mainImage = null;

    if (req.files && req.files.length > 0) {
      // Get URLs from Cloudinary
      imageUrls = req.files.map(file => file.path);
      mainImage = imageUrls[0]; // First image as main
    }

    // 6. Create lost item in database
    const lostItem = await LostFoundItem.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      type: "lost",
      reportedBy: user._id,
      collegeId: user.collegeId,
      location: location.trim(),
      images: imageUrls,
      mainImage: mainImage,
      status: "pending",
      isDeleted: false
    });

    // 7. Populate reporter details
    await lostItem.populate('reportedBy', 'name email phone');

    // 8. Send response
    res.status(201).json({
      success: true,
      message: "Lost item reported successfully",
      data: lostItem
    });

  } catch (error) {
    console.error("Report Lost Item Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to report lost item", 
      error: error.message 
    });
  }
};

// Report a found item (NEW)
const reportFoundItem = async (req, res) => {
  try {
    // 1. Get logged-in user
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // 2. Check if user has college
    if (!user.collegeId) {
      return res.status(400).json({ 
        success: false, 
        message: "You are not associated with any college" 
      });
    }

    // 3. Get data from request body
    const { title, description, location } = req.body;

    // 4. Validate required fields
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: "Title is required" 
      });
    }
    
    if (!location) {
      return res.status(400).json({ 
        success: false, 
        message: "Location is required" 
      });
    }

    // 5. Handle image uploads
    let imageUrls = [];
    let mainImage = null;

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadToCloudinary(file.buffer, 'lost-found-items');
          imageUrls.push(result.secure_url);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
        }
      }
      mainImage = imageUrls[0] || null;
    }

    // 6. Create found item (notice type is "found")
    const foundItem = await LostFoundItem.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      type: "found",  // ← DIFFERENT: type is "found"
      reportedBy: user._id,
      collegeId: user.collegeId,
      location: location.trim(),
      images: imageUrls,
      mainImage: mainImage,
      status: "pending",
      isDeleted: false
    });

    // 7. Populate reporter details
    await foundItem.populate('reportedBy', 'name email phone');

    // 8. Send success response
    res.status(201).json({
      success: true,
      message: "Found item reported successfully",
      data: foundItem
    });

  } catch (error) {
    console.error("Report Found Item Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to report found item", 
      error: error.message 
    });
  }
};

// Get all items from user's college (with filters and pagination)
// Get all items from user's college (with enhanced filters)
const getAllItems = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user || !user.collegeId) {
      return res.status(400).json({ 
        success: false, 
        message: "User not associated with any college" 
      });
    }

    // Build filter
    let filter = {
      collegeId: user.collegeId,
      isDeleted: false
    };

    // 1. Filter by type (lost/found)
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    // 2. Filter by status (pending/claimed/resolved)
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // 3. NEW: Filter by date range
    if (req.query.fromDate) {
      filter.createdAt = { ...filter.createdAt, $gte: new Date(req.query.fromDate) };
    }
    if (req.query.toDate) {
      filter.createdAt = { ...filter.createdAt, $lte: new Date(req.query.toDate) };
    }

    // 4. NEW: Search by title or location
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { location: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // 5. NEW: Filter by reporter (useful for admins)
    if (req.query.reportedBy && (user.role?.name === 'admin' || user.role?.name === 'globalAdmin')) {
      filter.reportedBy = req.query.reportedBy;
    }

    // 6. NEW: Filter by claimant (who claimed the item)
    if (req.query.claimedBy) {
      filter.claimedBy = req.query.claimedBy;
    }

    // 7. Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 8. Sorting (default: newest first)
    let sort = { createdAt: -1 };
    if (req.query.sortBy) {
      const sortField = req.query.sortBy;
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
      sort = { [sortField]: sortOrder };
    }

    // 9. Execute query
    const items = await LostFoundItem.find(filter)
      .populate('reportedBy', 'name email phone')
      .populate('claimedBy', 'name email phone')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // 10. Get total count for pagination
    const total = await LostFoundItem.countDocuments(filter);

    // 11. Send response with metadata
    res.json({
      success: true,
      filters: {
        type: req.query.type || null,
        status: req.query.status || null,
        search: req.query.search || null,
        fromDate: req.query.fromDate || null,
        toDate: req.query.toDate || null
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      count: items.length,
      items
    });

  } catch (error) {
    console.error("Get All Items Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch items", 
      error: error.message 
    });
  }
};

// Get items reported by logged-in user
// Get items reported by logged-in user
const getMyItems = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Build filter
    let filter = {
      reportedBy: user._id,
      isDeleted: false
    };

    // 1. Filter by type
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    // 2. Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // 3. NEW: Filter by date range
    if (req.query.fromDate) {
      filter.createdAt = { ...filter.createdAt, $gte: new Date(req.query.fromDate) };
    }
    if (req.query.toDate) {
      filter.createdAt = { ...filter.createdAt, $lte: new Date(req.query.toDate) };
    }

    // 4. NEW: Search by title
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: 'i' };
    }

    // 5. Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 6. Sorting
    let sort = { createdAt: -1 };
    if (req.query.sortBy) {
      const sortField = req.query.sortBy;
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
      sort = { [sortField]: sortOrder };
    }

    // 7. Execute query
    const items = await LostFoundItem.find(filter)
      .populate('claimedBy', 'name email phone')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // 8. Get total count
    const total = await LostFoundItem.countDocuments(filter);

    // 9. Send response
    res.json({
      success: true,
      filters: {
        type: req.query.type || null,
        status: req.query.status || null,
        search: req.query.search || null
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      count: items.length,
      items
    });

  } catch (error) {
    console.error("Get My Items Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch your items", 
      error: error.message 
    });
  }
};

// Get single item by ID
const getItemById = async (req, res) => {
  try {
    // 1. Get logged-in user
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // 2. Get item ID from URL params
    const { id } = req.params;

    // 3. Find item by ID with populated fields
    const item = await LostFoundItem.findById(id)
      .populate('reportedBy', 'name email phone profilePicture')
      .populate('claimedBy', 'name email phone');

    // 4. Check if item exists
    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: "Item not found" 
      });
    }

    // 5. Check if item belongs to user's college (security)
    if (item.collegeId.toString() !== user.collegeId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied - Item from another college" 
      });
    }

    // 6. Send response
    res.json({
      success: true,
      item
    });

  } catch (error) {
    console.error("Get Item By ID Error:", error);
    
    // Handle invalid ObjectId format
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid item ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch item", 
      error: error.message 
    });
  }
};


// Update my item
const updateItem = async (req, res) => {
  try {
    // 1. Get logged-in user
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // 2. Get item ID from URL params
    const { id } = req.params;

    // 3. Get update data from request body
    const { title, description, location, removeImages } = req.body;

    // 4. Find the item
    const item = await LostFoundItem.findById(id);

    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: "Item not found" 
      });
    }

    // 5. Check if user is the reporter (ownership check)
    if (item.reportedBy.toString() !== user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "You can only update your own reports" 
      });
    }

    // 6. Check if item can be updated (only pending items can be updated)
    if (item.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot update item that is already claimed or resolved" 
      });
    }

    // 7. Update text fields if provided
    if (title) item.title = title.trim();
    if (description) item.description = description.trim();
    if (location) item.location = location.trim();

    // 8. Handle image removal (if any images to remove)
    if (removeImages && removeImages.length > 0) {
      // Parse removeImages if it's a string (from form-data)
      let imagesToRemove = removeImages;
      if (typeof removeImages === 'string') {
        imagesToRemove = JSON.parse(removeImages);
      }
      
      // Filter out removed images
      item.images = item.images.filter(img => !imagesToRemove.includes(img));
      
      // Update main image if it was removed
      if (item.mainImage && imagesToRemove.includes(item.mainImage)) {
        item.mainImage = item.images[0] || null;
      }
    }

    // 9. Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImageUrls = [];
      
      for (const file of req.files) {
        try {
          const result = await uploadToCloudinary(file.buffer, 'lost-found-items');
          newImageUrls.push(result.secure_url);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
        }
      }
      
      // Add new images to existing ones
      item.images = [...item.images, ...newImageUrls];
      
      // Set main image if none exists
      if (!item.mainImage && newImageUrls.length > 0) {
        item.mainImage = newImageUrls[0];
      }
    }

    // 10. Save updated item
    await item.save();

    // 11. Populate reporter and claimant details
    await item.populate('reportedBy', 'name email phone');
    await item.populate('claimedBy', 'name email phone');

    // 12. Send success response
    res.json({
      success: true,
      message: "Item updated successfully",
      item
    });

  } catch (error) {
    console.error("Update Item Error:", error);
    
    // Handle invalid ObjectId format
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid item ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Failed to update item", 
      error: error.message 
    });
  }
};


// Delete my item (soft delete)
const deleteItem = async (req, res) => {
  try {
    // 1. Get logged-in user
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // 2. Get item ID from URL params
    const { id } = req.params;

    // 3. Find the item
    const item = await LostFoundItem.findById(id);

    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: "Item not found" 
      });
    }

    // 4. Check if user is the reporter (ownership check)
    if (item.reportedBy.toString() !== user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "You can only delete your own reports" 
      });
    }

    // 5. Soft delete - mark as deleted (not actually remove from database)
    item.isDeleted = true;
    await item.save();

    // 6. Send success response
    res.json({
      success: true,
      message: "Item deleted successfully",
      deletedItem: {
        _id: item._id,
        title: item.title,
        type: item.type
      }
    });

  } catch (error) {
    console.error("Delete Item Error:", error);
    
    // Handle invalid ObjectId format
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid item ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete item", 
      error: error.message 
    });
  }
};


// Claim a found item
const claimItem = async (req, res) => {
  try {
    // 1. Get logged-in user
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // 2. Get item ID from URL params
    const { id } = req.params;

    // 3. Find the item
    const item = await LostFoundItem.findById(id);

    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: "Item not found" 
      });
    }

    // 4. Check if item belongs to user's college
    if (item.collegeId.toString() !== user.collegeId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied - Item from another college" 
      });
    }

    // 5. Check if item is a found item (can only claim found items)
    if (item.type !== 'found') {
      return res.status(400).json({ 
        success: false, 
        message: "Can only claim found items. Lost items cannot be claimed." 
      });
    }

    // 6. Check if item is still pending (not already claimed or resolved)
    if (item.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Item is already ${item.status}. Cannot claim.` 
      });
    }

    // 7. Check if user is claiming their own found item
    if (item.reportedBy.toString() === user._id.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: "You cannot claim your own found item" 
      });
    }

    // 8. Update item status to claimed
    item.status = 'claimed';
    item.claimedBy = user._id;
    await item.save();

    // 9. Populate details for response
    await item.populate('reportedBy', 'name email phone');
    await item.populate('claimedBy', 'name email phone');

    // 10. Send success response
    res.json({
      success: true,
      message: "Item claimed successfully. The reporter will be notified to verify your claim.",
      item: {
        _id: item._id,
        title: item.title,
        type: item.type,
        status: item.status,
        claimedBy: item.claimedBy,
        reportedBy: item.reportedBy
      }
    });

  } catch (error) {
    console.error("Claim Item Error:", error);
    
    // Handle invalid ObjectId format
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid item ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Failed to claim item", 
      error: error.message 
    });
  }
};


// Resolve item (mark as resolved)
const resolveItem = async (req, res) => {
  try {
    // 1. Get logged-in user
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // 2. Get item ID from URL params
    const { id } = req.params;

    // 3. Find the item
    const item = await LostFoundItem.findById(id);

    if (!item) {
      return res.status(404).json({ 
        success: false, 
        message: "Item not found" 
      });
    }

    // 4. Check if item belongs to user's college
    if (item.collegeId.toString() !== user.collegeId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied - Item from another college" 
      });
    }

    // 5. Check if user is authorized to resolve
    const isReporter = item.reportedBy.toString() === user._id.toString();
    const isAdmin = user.role?.name === 'admin' || user.role?.name === 'globalAdmin';
    
    if (!isReporter && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Only the reporter or admin can resolve items" 
      });
    }

    // 6. Check if item is already resolved
    if (item.status === 'resolved') {
      return res.status(400).json({ 
        success: false, 
        message: "Item is already resolved" 
      });
    }

    // 7. Update item status to resolved
    item.status = 'resolved';
    await item.save();

    // 8. Populate details for response
    await item.populate('reportedBy', 'name email phone');
    await item.populate('claimedBy', 'name email phone');

    // 9. Send success response
    res.json({
      success: true,
      message: "Item marked as resolved successfully",
      item: {
        _id: item._id,
        title: item.title,
        type: item.type,
        status: item.status,
        reportedBy: item.reportedBy,
        claimedBy: item.claimedBy,
        resolvedAt: item.updatedAt
      }
    });

  } catch (error) {
    console.error("Resolve Item Error:", error);
    
    // Handle invalid ObjectId format
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid item ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Failed to resolve item", 
      error: error.message 
    });
  }
};
module.exports = {
  reportLostItem,
  reportFoundItem,
  getAllItems,
  getMyItems,
  getItemById,
  updateItem,
  deleteItem,
  claimItem,
  resolveItem
};