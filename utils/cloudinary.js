const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create storage engine for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'donation-system',
    format: async (req, file) => {
      // Return the file format
      return file.mimetype.split('/')[1] || 'png';
    },
    public_id: (req, file) => {
      // Generate unique filename
      return `screenshot-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    },
    transformation: [
      { width: 800, height: 600, crop: 'limit' }, // Resize images
      { quality: 'auto' }, // Optimize quality
      { format: 'auto' } // Auto format
    ]
  },
});

// Utility functions for Cloudinary
const cloudinaryUtils = {
  // Upload image
  uploadImage: async (filePath) => {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'donation-system',
        transformation: [
          { width: 800, height: 600, crop: 'limit' },
          { quality: 'auto' },
          { format: 'auto' }
        ]
      });
      return result;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  },

  // Delete image
  deleteImage: async (publicId) => {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw error;
    }
  },

  // Get image URL
  getImageUrl: (publicId, options = {}) => {
    return cloudinary.url(publicId, {
      secure: true,
      ...options
    });
  },

  // Extract public ID from URL
  getPublicIdFromUrl: (url) => {
    const matches = url.match(/\/v\d+\/(.+)\.\w+$/);
    return matches ? matches[1] : null;
  }
};

module.exports = {
  cloudinary,
  storage,
  ...cloudinaryUtils
};