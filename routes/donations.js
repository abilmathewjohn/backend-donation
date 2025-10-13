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
router.post('/', upload.single('screenshot'), async (req, res) => {
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
      paymentLinkUsed 
    } = req.body;

    const settings = await AdminSettings.findOne();
    const totalAmount = (settings?.pricePerTeam || 20.00) + (settings?.registrationFee || 20.00);
    
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
      amount: totalAmount,
      paymentScreenshot: req.file.path,
      paymentScreenshotPublicId: req.file.filename,
      paymentLinkUsed: paymentLinkUsed.trim(),
    });

    res.status(201).json({
      message: 'Team registration submitted successfully!',
      donation: {
        id: donation.id,
        participantName: donation.participantName,
        email: donation.email,
        amount: donation.amount,
        status: donation.status,
      }
    });
  } catch (error) {
    console.error('Error creating donation:', error);
    res.status(500).json({ 
      error: 'Failed to submit registration',
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