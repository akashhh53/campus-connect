const express = require('express');
const router = express.Router();
const userMiddleware = require('../middleware/userMiddleware');
const {
  reportLostItem,
  reportFoundItem,
  getAllItems,
  getMyItems,
  getItemById,
  updateItem,
  deleteItem,
  claimItem,
  resolveItem
} = require('../controllers/lostFoundController');
const {upload}  = require('../config/cloudinary');

// All routes require authentication
router.use(userMiddleware);

// Report routes
router.post(
  '/lost-found/report-lost',
  upload.array('images', 5), // 'images' is the field name in form-data
  reportLostItem
);

router.post(
  '/lost-found/report-found',
  upload.array('images', 5),
  reportFoundItem
);



// What below API Does:
// Auto-filters by college - Only shows items from logged-in user's college

// Optional filters - Can filter by type (lost/found) and status

// Pagination - Controls how many items per page

// Sorting - Newest items first

// Populated data - Shows reporter and claimant details
router.get('/lost-found/items', getAllItems);


// What below API Does:
// Shows only items reported by the logged-in user

// Auto-filters by user ID - No need to specify

// Optional filters - Can filter by type (lost/found) and status

// Shows claimant info - If someone claimed a found item

// Pagination support - Controls items per page

// Sorting - Newest items first
router.get('/lost-found/my-items', getMyItems);



// What below API Does:
// Fetches single item by ID

// Populates reporter details (name, email, phone)

// Populates claimant details (if item is claimed)

// Security check - Ensures item belongs to user's college

// Error handling - Handles invalid IDs and not found cases
router.get('/lost-found/items/:id', getItemById); 



// What below API Does:
// Updates text fields - title, description, location

// Adds new images - Upload and add to existing images

// Removes existing images - Remove specified images from array

// Updates main image - Automatically updates if main image is removed

// Ownership check - Only reporter can update

// Status check - Only pending items can be updated
router.put('/lost-found/items/:id', upload.array('images', 5), updateItem);


// What below API Does:
// Soft Delete - Marks item as deleted without removing from database

// Ownership Check - Only the reporter can delete their own items

// Validation - Checks if item exists and ID is valid

// Hides from Queries - Deleted items are filtered out in all GET requests
router.delete('/lost-found/items/:id', deleteItem);


// What below API Does:
// Only for Found Items - Can only claim items with type: "found"

// Status Check - Can only claim items with status: "pending"

// Ownership Check - Cannot claim your own found item

// College Check - Can only claim items from your college

// Updates Status - Changes status from "pending" to "claimed"

// Records Claimant - Saves who claimed the item

router.post('/lost-found/items/:id/claim', claimItem);




router.put('/lost-found/items/:id/resolve', resolveItem);
// router.put('/lost-found/items/:id/resolve', resolveItem);

module.exports = router;