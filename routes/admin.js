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
    
    // INSTANT Team ID generation for confirmed status
    if (status === 'confirmed') {
      console.log('⚡ INSTANT Team ID generation');
      
      // Generate Team ID instantly (takes <1ms)
      const teamId = generateTeamId();
      updateData.teamId = teamId;
      updateData.actualAmount = parseFloat(actualAmount) || parseFloat(donation.amount) || 0;
      
      console.log('🎯 Team ID generated:', teamId);
    }

    // Quick database update
    console.log('💾 Quick database update...');
    await donation.update(updateData);
    console.log('✅ Database updated');

    // Get updated donation
    const updatedDonation = await Donation.findByPk(donationId);
    
    // Send immediate response
    res.json({
      message: 'Registration status updated successfully',
      donation: updatedDonation
    });

    // Background email (non-blocking)
    if (status === 'confirmed' && updatedDonation.teamId) {
      console.log('📧 Starting background email process...');
      
      // Don't wait for email - send it in background
      sendTeamConfirmationEmail(updatedDonation, updatedDonation.teamId)
        .then(result => {
          if (result) {
            console.log('✅ Background email sent successfully');
          } else {
            console.log('❌ Background email failed (but status was updated)');
          }
        })
        .catch(emailError => {
          console.error('💥 Background email error:', emailError.message);
        });
    }
    
  } catch (error) {
    console.error('❌ Error in status update:', error.message);
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

module.exports = router;