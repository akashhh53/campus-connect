const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Validate environment variables
if (!process.env.CLOUDINARY_CLOUD_NAME || 
    !process.env.CLOUDINARY_API_KEY || 
    !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Cloudinary credentials missing in .env file');
  process.exit(1);
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'lost-found-items',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }],
  },
});

// Create upload middleware with FIXED file filter
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Log what we're receiving (for debugging)
    console.log('File received:', file.originalname, 'MIME type:', file.mimetype);
    
    // Expanded allowed types
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'image/x-png',  // Some systems use this for PNG
      'image/pjpeg',  // Progressive JPEG
    ];
    
    // Check by file extension as well
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      console.log('✅ File accepted:', file.originalname);
      cb(null, true);
    } else {
      console.log('❌ File rejected:', file.originalname, 'Type:', file.mimetype);
      cb(new Error(`Invalid file type. ${file.mimetype} is not allowed. Only JPEG, PNG, GIF, and WEBP are allowed.`));
    }
  },
});

console.log('✅ Cloudinary configured successfully');

module.exports = { cloudinary, upload };