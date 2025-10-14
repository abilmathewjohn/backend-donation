const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Donation, AdminSettings } = require('../models');
const { storage, deleteImage } = require('../utils/cloudinary');

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

router.get('/ticket-price', async (req, res) => {
  try {
    const settings = await AdminSettings.findOne();
    if (!settings) {
      return res.json({ ticketPrice: 2.00 }); // Fallback to default
    }
    res.json({ ticketPrice: settings.ticketPrice || 2.00 });
  } catch (error) {
    console.error('Error fetching ticket price:', error);
    res.status(500).json({ error: 'Failed to fetch ticket price', details: error.message });
  }
});

// Create donation with Cloudinary
//Update the POST endpoint
router.post('/', upload.single('screenshot'), async (req, res) => {
  console.log('📥 Received team registration submission:', req.body);

  try {
    const { 
      participantName, 
      teammateName, 
      address, 
      contactNumber1, 
      contactNumber2, 
      email, 
      whatsappNumber, 
      zone, 
      howKnown, 
      otherHowKnown, 
      diocese, 
      previousParticipation, 
      paymentLinkUsed,
      amount
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'participantName', 'teammateName', 'address', 'contactNumber1', 
      'email', 'whatsappNumber', 'zone', 'howKnown', 'diocese', 
      'previousParticipation', 'paymentLinkUsed', 'amount'
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        missingFields: missingFields
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Payment screenshot is required' });
    }

    // Create team registration
    const donation = await Donation.create({
      participantName: participantName.trim(),
      teammateName: teammateName.trim(),
      address: address.trim(),
      contactNumber1: contactNumber1.trim(),
      contactNumber2: contactNumber2?.trim(),
      email: email.trim().toLowerCase(),
      whatsappNumber: whatsappNumber.trim(),
      zone: zone.trim(),
      howKnown: howKnown.trim(),
      otherHowKnown: otherHowKnown?.trim(),
      diocese: diocese.trim(),
      previousParticipation: previousParticipation === 'true',
      teamRegistration: true, // Always true for team registration
      teamSize: 2, // Fixed team size of 2 persons
      amount: parseFloat(amount) || 0,
      paymentScreenshot: req.file.path,
      paymentScreenshotPublicId: req.file.filename,
      paymentLinkUsed: paymentLinkUsed.trim(),
      status: 'pending'
    });

    console.log('✅ Team registration created successfully:', donation.id);

    res.status(201).json({
      message: 'Team registration submitted successfully! Your registration will be confirmed via email.',
      donation: {
        id: donation.id,
        participantName: donation.participantName,
        teammateName: donation.teammateName,
        email: donation.email,
        amount: donation.amount,
        status: donation.status,
      }
    });
  } catch (error) {
    console.error('❌ Error creating team registration:', error);
    
    // Delete uploaded file if registration creation failed
    if (req.file && req.file.filename) {
      try {
        await deleteImage(req.file.filename);
        console.log('🗑️ Deleted uploaded image from Cloudinary due to error');
      } catch (deleteError) {
        console.error('Error deleting image from Cloudinary:', deleteError);
      }
    }

    res.status(500).json({ 
      error: 'Failed to submit team registration',
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