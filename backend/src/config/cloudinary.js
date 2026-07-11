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

// One shared pipeline for image and short video attachments.
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'campus-connect',
    resource_type: 'auto',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov'],
  },
});

// Create upload middleware with FIXED file filter
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB
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
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ];
    
    // Check by file extension as well
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov'];
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      console.log('✅ File accepted:', file.originalname);
      cb(null, true);
    } else {
      console.log('❌ File rejected:', file.originalname, 'Type:', file.mimetype);
      cb(new Error(`Invalid file type. ${file.mimetype} is not allowed. Upload an image or MP4, WEBM, or MOV video.`));
    }
  },
});

console.log('✅ Cloudinary configured successfully');

module.exports = { cloudinary, upload };
