const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Donation, AdminSettings } = require('../models');
const { storage, uploadImage, deleteImage, getImageUrl } = require('../utils/cloudinary');

// Configure multer with Cloudinary storage
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Get ticket price
router.get('/ticket-price', async (req, res) => {
  try {
    const settings = await AdminSettings.findOne();
    res.json({ ticketPrice: settings?.ticketPrice || 2.00 });
  } catch (error) {
    console.error('Error fetching ticket price:', error);
    res.status(500).json({ error: 'Failed to fetch ticket price' });
  }
});

// Create donation with Cloudinary
router.post('/', upload.single('screenshot'), async (req, res) => {
  console.log('📥 Received donation submission:', req.body);

  try {
    const { fullName, email, phone, location, tickets, paymentLinkUsed } = req.body;
    
    // Validate required fields
    if (!fullName || !email || !phone || !location || !tickets || !paymentLinkUsed) {
      return res.status(400).json({ 
        error: 'All fields are required',
        missing: {
          fullName: !fullName,
          email: !email,
          phone: !phone,
          location: !location,
          tickets: !tickets,
          paymentLinkUsed: !paymentLinkUsed
        }
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Payment screenshot is required' });
    }

    const settings = await AdminSettings.findOne();
    const ticketCount = parseInt(tickets);
    
    if (ticketCount < 1 || ticketCount > 50) {
      return res.status(400).json({ error: 'Number of tickets must be between 1 and 50' });
    }

    const amount = (settings?.ticketPrice || 2.00) * ticketCount;
    
    // Cloudinary file info is available in req.file
    const cloudinaryFile = req.file;
    
    const donation = await Donation.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      location: location.trim(),
      tickets: ticketCount,
      amount: amount,
      paymentScreenshot: cloudinaryFile.path, // Cloudinary URL
      paymentScreenshotPublicId: cloudinaryFile.filename, // Cloudinary public_id
      paymentLinkUsed: paymentLinkUsed.trim(),
    });

    console.log('✅ Donation created successfully:', donation.id);
    console.log('📸 Image stored in Cloudinary:', cloudinaryFile.path);

    res.status(201).json({
      message: 'Donation submitted successfully! Your tickets will be sent to your email after confirmation.',
      donation: {
        id: donation.id,
        fullName: donation.fullName,
        email: donation.email,
        tickets: donation.tickets,
        amount: donation.amount,
        status: donation.status,
        paymentScreenshot: donation.paymentScreenshot
      }
    });
  } catch (error) {
    console.error('❌ Error creating donation:', error);
    
    // Delete uploaded file from Cloudinary if donation creation failed
    if (req.file && req.file.filename) {
      try {
        await deleteImage(req.file.filename);
        console.log('🗑️ Deleted uploaded image from Cloudinary due to error');
      } catch (deleteError) {
        console.error('Error deleting image from Cloudinary:', deleteError);
      }
    }

    res.status(500).json({ 
      error: 'Failed to submit donation',
      details: error.message 
    });
  }
});

// Get image URL for a donation
router.get('/:id/screenshot', async (req, res) => {
  try {
    const donation = await Donation.findByPk(req.params.id);
    
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    if (!donation.paymentScreenshot) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }

    // Redirect to Cloudinary URL
    res.redirect(donation.paymentScreenshot);
  } catch (error) {
    console.error('Error fetching screenshot:', error);
    res.status(500).json({ error: 'Failed to fetch screenshot' });
  }
});

// Delete donation and its screenshot
router.delete('/:id', async (req, res) => {
  try {
    const donation = await Donation.findByPk(req.params.id);
    
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    // Delete screenshot from Cloudinary if exists
    if (donation.paymentScreenshotPublicId) {
      try {
        await deleteImage(donation.paymentScreenshotPublicId);
        console.log('🗑️ Deleted image from Cloudinary:', donation.paymentScreenshotPublicId);
      } catch (deleteError) {
        console.error('Error deleting image from Cloudinary:', deleteError);
        // Continue with donation deletion even if image deletion fails
      }
    }

    // Delete donation from database
    await donation.destroy();

    res.json({ message: 'Donation and associated screenshot deleted successfully' });
  } catch (error) {
    console.error('Error deleting donation:', error);
    res.status(500).json({ error: 'Failed to delete donation' });
  }
});

// Get all donations (for admin)
router.get('/', async (req, res) => {
  try {
    console.log('Fetching all donations...');
    const donations = await Donation.findAll({
      order: [['createdAt', 'DESC']],
    });
    
    console.log(`Found ${donations.length} donations`);
    res.json(donations);
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch donations',
      details: error.message 
    });
  }
});

module.exports = router;