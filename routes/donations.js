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

// backend/routes/donations.js - Update the amount parsing section
router.post('/', upload.single('screenshot'), async (req, res) => {
  console.log('📥 Received donation submission:', req.body);
  console.log('📸 File received:', req.file);

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
      teamRegistration,
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

    // DEBUG: Log the raw amount received
    console.log('🔍 Raw amount received:', amount, 'Type:', typeof amount);

    // FIX: More robust amount parsing
    let parsedAmount;
    try {
      // Handle different formats that might come from the frontend
      if (typeof amount === 'string') {
        // Remove any extra formatting or thousand separators
        let cleanAmount = amount.replace(/[^\d.,]/g, '');
        
        // Handle European format (comma as decimal separator)
        if (cleanAmount.includes(',') && !cleanAmount.includes('.')) {
          cleanAmount = cleanAmount.replace(',', '.');
        }
        
        // Remove any extra decimal points (like in "20.000.00")
        const parts = cleanAmount.split('.');
        if (parts.length > 2) {
          // If there are multiple decimal points, take the first part as integer and last part as decimal
          cleanAmount = `${parts[0]}.${parts[parts.length - 1]}`;
        }
        
        parsedAmount = parseFloat(cleanAmount);
      } else {
        parsedAmount = parseFloat(amount);
      }
      
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ 
          error: 'Invalid amount format',
          details: `Amount must be a positive number. Received: ${amount} (parsed as: ${parsedAmount})`
        });
      }
      
      // Ensure exactly 2 decimal places
      parsedAmount = Math.round(parsedAmount * 100) / 100;
    } catch (parseError) {
      console.error('❌ Amount parsing error:', parseError);
      return res.status(400).json({ 
        error: 'Invalid amount format',
        details: `Could not parse amount: ${amount}. Error: ${parseError.message}`
      });
    }

    console.log('💰 Final parsed amount:', parsedAmount, 'Type:', typeof parsedAmount);

    // Create donation with team registration
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
      previousParticipation: previousParticipation === 'true' || previousParticipation === true,
      teamRegistration: teamRegistration === 'true' || teamRegistration === true,
      amount: parsedAmount, // Use the properly parsed amount
      paymentScreenshot: req.file.path,
      paymentScreenshotPublicId: req.file.filename,
      paymentLinkUsed: paymentLinkUsed.trim(),
      status: 'pending'
    });

    console.log('✅ Donation created successfully:', donation.id);

    res.status(201).json({
      message: 'Registration submitted successfully! Your registration will be confirmed via email.',
      donation: {
        id: donation.id,
        participantName: donation.participantName,
        email: donation.email,
        amount: donation.amount,
        status: donation.status,
      }
    });
  } catch (error) {
    console.error('❌ Error creating donation:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Delete uploaded file if donation creation failed
    if (req.file && req.file.filename) {
      try {
        await deleteImage(req.file.filename);
        console.log('🗑️ Deleted uploaded image from Cloudinary due to error');
      } catch (deleteError) {
        console.error('Error deleting image from Cloudinary:', deleteError);
      }
    }

    res.status(500).json({ 
      error: 'Failed to submit registration',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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