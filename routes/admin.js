const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Donation, PaymentLink, AdminSettings } = require('../models');
const { deleteImage } = require('../utils/cloudinary');
const { Op } = require('sequelize');
const { sendTeamConfirmationEmail } = require('../utils/emailService');
const { storage } = require('../utils/cloudinary');
const upload = multer({ storage });
const { generateTeamId } = require('../utils/teamIdGenerator');

// Update the donations list endpoint to remove ticket-related fields
router.get('/donations', async (req, res) => {
  try {
    console.log('🔍 Fetching donations...');
    const { page = 1, limit = 1000, status, search } = req.query;
    const where = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (search) {
      where[Op.or] = [
        { participantName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { contactNumber1: { [Op.iLike]: `%${search}%` } },
        { teammateName: { [Op.iLike]: `%${search}%` } },
        { teamId: { [Op.iLike]: `%${search}%` } } // Add team ID to search
      ];
    }
    
    console.log('📊 Query conditions:', where);
    
    const donations = await Donation.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']],
    });

    console.log(`✅ Found ${donations.count} donations`);
    
    res.json(donations);
  } catch (error) {
    console.error('❌ Error in /admin/donations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch donations',
      details: error.message
    });
  }
});

router.patch('/donations/:id/status', async (req, res) => {
  try {
    console.log('🚀 FAST STATUS UPDATE STARTED');
    
    const { status, actualAmount } = req.body;
    const donationId = req.params.id;
    
    const donation = await Donation.findByPk(donationId);
    
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    const updateData = { status };
    
    if (status === 'confirmed') {
      console.log('⚡ INSTANT Team ID generation');
      const teamId = generateTeamId();
      updateData.teamId = teamId;
      updateData.actualAmount = parseFloat(actualAmount) || parseFloat(donation.amount) || 0;
      console.log('🎯 Team ID generated:', teamId);
    }

    console.log('💾 Quick database update...');
    await donation.update(updateData);
    console.log('✅ Database updated');

    const updatedDonation = await Donation.findByPk(donationId);
    console.log('Updated donation data:', {
      id: updatedDonation.id,
      email: updatedDonation.email,
      participantName: updatedDonation.participantName,
      teammateName: updatedDonation.teammateName,
      teamId: updatedDonation.teamId,
      status: updatedDonation.status
    });

    let emailResult = { success: true, message: 'No email sent' };
    
    // Only send email for confirmed status with team ID
    if (status === 'confirmed' && updatedDonation.teamId) {
      console.log('📧 Starting email process...');
      
      // Validate required fields
      const missingFields = [];
      if (!updatedDonation.email) missingFields.push('email');
      if (!updatedDonation.participantName) missingFields.push('participantName');
      if (!updatedDonation.teammateName) missingFields.push('teammateName');
      
      if (missingFields.length > 0) {
        console.error('❌ Missing required fields:', missingFields);
        emailResult = { 
          success: false, 
          message: `Missing required fields: ${missingFields.join(', ')}` 
        };
      } else {
        try {
          console.log('✅ All email fields present, sending confirmation...');
          const success = await sendTeamConfirmationEmail(updatedDonation, updatedDonation.teamId);
          emailResult = success
            ? { success: true, message: 'Confirmation email sent successfully' }
            : { success: false, message: 'Failed to send confirmation email' };
        } catch (emailError) {
          console.error('💥 Email error in route:', emailError.message);
          emailResult = { 
            success: false, 
            message: `Email error: ${emailError.message}` 
          };
        }
      }
    }

    res.json({
      message: 'Registration status updated successfully',
      donation: updatedDonation,
      email: emailResult,
    });
  } catch (error) {
    console.error('❌ Error in status update:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Failed to update donation status',
      details: error.message 
    });
  }
});


// Delete donation and its image from Cloudinary
router.delete('/donations/:id', async (req, res) => {
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

// Get donation screenshot
router.get('/donations/:id/screenshot', async (req, res) => {
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

// Export donations to Excel
router.get('/donations/export', async (req, res) => {
  try {
    const donations = await Donation.findAll({
      order: [['createdAt', 'DESC']],
    });

    // Simple CSV export
    const csvHeaders = 'Participant Name,Teammate Name,Address,Contact 1,Contact 2,Email,WhatsApp,Zone,Diocese,How Known,Other How Known,Previous Participation,Requested Tickets,Requested Amount,Actual Amount,Tickets Assigned,Status,Payment Link,Screenshot URL,Date\n';
    
    const csvData = donations.map(donation => {
      const ticketNumbers = donation.ticketNumbers ? donation.ticketNumbers.join('; ') : '';
      return `"${donation.participantName}","${donation.teammateName}","${donation.address}","${donation.contactNumber1}","${donation.contactNumber2 || ''}","${donation.email}","${donation.whatsappNumber}","${donation.zone}","${donation.diocese}","${donation.howKnown}","${donation.otherHowKnown || ''}","${donation.previousParticipation ? 'Yes' : 'No'}",${donation.tickets},${donation.amount},${donation.actualAmount || ''},${donation.ticketsAssigned || ''},${donation.status},"${donation.paymentLinkUsed}","${donation.paymentScreenshot}","${donation.createdAt}"`;
    }).join('\n');

    const csv = csvHeaders + csvData;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=donations.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting donations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get admin settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await AdminSettings.findOne();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update admin settings
router.put('/settings', async (req, res) => {
  try {
    const { 
      contactPhone, 
      ticketPrice, 
      adminEmail, 
      orgName,
      pricingMode,
      pricePerPerson,
      pricePerTeam,
      registrationFee,
      pricingDescription
    } = req.body;
    
    let settings = await AdminSettings.findOne();
    
    if (!settings) {
      settings = await AdminSettings.create({ 
        contactPhone, 
        ticketPrice, 
        adminEmail, 
        orgName,
        pricingMode,
        pricePerPerson,
        pricePerTeam,
        registrationFee,
        pricingDescription
      });
    } else {
      await settings.update({ 
        contactPhone, 
        ticketPrice, 
        adminEmail, 
        orgName,
        pricingMode,
        pricePerPerson,
        pricePerTeam,
        registrationFee,
        pricingDescription
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload logo
router.post('/upload-logo', upload.single('logo'), async (req, res) => {
  try {
    const settings = await AdminSettings.findOne();
    if (settings.logoPublicId) {
      await deleteImage(settings.logoPublicId);
    }
    await settings.update({
      logoUrl: req.file.path,
      logoPublicId: req.file.filename
    });
    res.json({ logoUrl: req.file.path });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload banner
router.post('/upload-banner', upload.single('banner'), async (req, res) => {
  try {
    const settings = await AdminSettings.findOne();
    const newBanners = [...(settings.banners || []), req.file.path];
    const newPublicIds = [...(settings.bannerPublicIds || []), req.file.filename];
    await settings.update({
      banners: newBanners,
      bannerPublicIds: newPublicIds
    });
    res.json({ banners: newBanners });
  } catch (error) {
    console.error('Error uploading banner:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove banner
router.post('/remove-banner', async (req, res) => {
  try {
    const { publicId } = req.body;
    await deleteImage(publicId);
    const settings = await AdminSettings.findOne();
    const index = settings.bannerPublicIds.indexOf(publicId);
    if (index > -1) {
      settings.banners.splice(index, 1);
      settings.bannerPublicIds.splice(index, 1);
      await settings.update({
        banners: settings.banners,
        bannerPublicIds: settings.bannerPublicIds
      });
    }
    res.json({ banners: settings.banners });
  } catch (error) {
    console.error('Error removing banner:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this to your admin routes for testing email
router.post('/test-email-config', async (req, res) => {
  try {
    console.log('🧪 Testing email configuration...');
    
    // Check environment variables
    const hasEmailConfig = process.env.EMAIL_USER && process.env.EMAIL_PASS;
    console.log('Email config present:', hasEmailConfig);
    console.log('Email user:', process.env.EMAIL_USER ? 'Set' : 'Not set');
    
    if (!hasEmailConfig) {
      return res.json({ 
        success: false, 
        message: 'Email credentials not configured in environment variables' 
      });
    }

    // Test with a simple email
    const testDonation = {
      email: process.env.EMAIL_USER, // Send to yourself for testing
      participantName: 'Test User',
      teammateName: 'Test Teammate', 
      actualAmount: 20.00,
      amount: 20.00
    };

    const testTeamId = '123456';
    
    console.log('Sending test email...');
    const result = await sendTeamConfirmationEmail(testDonation, testTeamId);
    
    if (result) {
      res.json({ success: true, message: 'Test email sent successfully!' });
    } else {
      res.json({ success: false, message: 'Test email failed to send' });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.json({ success: false, message: error.message });
  }
});

module.exports = router;