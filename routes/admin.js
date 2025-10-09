const express = require('express');
const router = express.Router();
const { Donation, PaymentLink, AdminSettings } = require('../models');
const { deleteImage } = require('../utils/cloudinary');
const { Op } = require('sequelize');
const { sendTicketEmail } = require('../utils/emailService'); // Adjust path as needed

// Get all donations with pagination and filters
router.get('/donations', async (req, res) => {
  try {
    console.log('Fetching donations...');
    const { page = 1, limit = 1000, status, search } = req.query;
    const where = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (search) {
      where[Op.or] = [
        { fullName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const donations = await Donation.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']],
    });

    console.log(`Found ${donations.count} donations`);
    res.json(donations);
  } catch (error) {
    console.error('Error in /admin/donations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch donations',
      details: error.message
    });
  }
});

// Update donation status
router.patch('/donations/:id/status', async (req, res) => {
  try {
    console.log('🔔 PATCH /admin/donations/:id/status called');
    console.log('📦 Request params:', req.params);
    console.log('📦 Request body:', req.body);
    
    const { status, actualAmount, ticketsToAssign, ticketNumbers } = req.body;
    const donationId = req.params.id;
    
    console.log('🔍 Looking for donation with ID:', donationId);
    const donation = await Donation.findByPk(donationId);
    
    if (!donation) {
      console.log('❌ Donation not found for ID:', donationId);
      return res.status(404).json({ error: 'Donation not found' });
    }

    console.log('✅ Donation found:', donation.id);
    console.log('🔄 Updating donation with data:', { status, actualAmount, ticketsToAssign, ticketNumbers });

    const updateData = { status };
    const settings = await AdminSettings.findOne();
    const ticketPrice = settings?.ticketPrice || 2.00;
    
    console.log('🎫 Ticket price from settings:', ticketPrice);

    if (status === 'confirmed') {
      console.log('✅ Status is confirmed, processing ticket assignment...');
      
      // Handle actual amount
      if (actualAmount !== undefined && actualAmount !== null && actualAmount !== '') {
        updateData.actualAmount = parseFloat(actualAmount);
        console.log('💰 Using provided actual amount:', updateData.actualAmount);
      } else if (!donation.actualAmount) {
        updateData.actualAmount = parseFloat(donation.amount);
        console.log('💰 Using donation amount as actual amount:', updateData.actualAmount);
      } else {
        console.log('💰 Keeping existing actual amount:', donation.actualAmount);
      }
      
      // Handle tickets assignment
      let finalTicketsAssigned;
      if (ticketsToAssign !== undefined && ticketsToAssign !== null && ticketsToAssign !== '') {
        finalTicketsAssigned = parseInt(ticketsToAssign);
        console.log('🎫 Using provided tickets to assign:', finalTicketsAssigned);
      } else {
        finalTicketsAssigned = Math.floor(updateData.actualAmount / ticketPrice);
        console.log('🎫 Auto-calculated tickets:', finalTicketsAssigned, 'from amount', updateData.actualAmount);
      }
      updateData.ticketsAssigned = finalTicketsAssigned;
      
      // Handle ticket numbers
      let finalTicketNumbers = [];
      if (ticketNumbers && ticketNumbers.trim()) {
        finalTicketNumbers = ticketNumbers.split(',').map(t => t.trim()).filter(t => t);
        console.log('🔢 Using provided ticket numbers:', finalTicketNumbers);
      } else {
        // Auto-generate ticket numbers
        for (let i = 1; i <= finalTicketsAssigned; i++) {
          finalTicketNumbers.push(`TICKET-${donation.id.slice(-8).toUpperCase()}-${i}`);
        }
        console.log('🔢 Auto-generated ticket numbers:', finalTicketNumbers);
      }
      updateData.ticketNumbers = finalTicketNumbers;
      
    } else {
      console.log('❌ Status is not confirmed, clearing assignment data');
      // Clear assignment data for non-confirmed status
      updateData.actualAmount = null;
      updateData.ticketsAssigned = null;
      updateData.ticketNumbers = null;
    }

    console.log('💾 Saving update to database...');
    await donation.update(updateData);
    console.log('✅ Database update successful');

    // Send email if confirmed and has tickets
    if (status === 'confirmed' && updateData.ticketNumbers && updateData.ticketNumbers.length > 0) {
      console.log('📧 Attempting to send ticket email...');
      console.log('📨 Recipient email:', donation.email);
      console.log('🎫 Tickets to include:', updateData.ticketNumbers);
      
      try {
        const emailResult = await sendTicketEmail(donation, updateData.ticketNumbers);
        console.log('✅ Email function result:', emailResult);
        
        if (emailResult) {
          console.log('🎉 Ticket email sent successfully!');
        } else {
          console.log('❌ Email function returned false');
        }
      } catch (emailError) {
        console.error('💥 Error sending ticket email:', emailError);
        console.error('Email error stack:', emailError.stack);
      }
    } else {
      console.log('📧 Email not sent because:', {
        status,
        hasTicketNumbers: !!(updateData.ticketNumbers && updateData.ticketNumbers.length > 0),
        ticketNumbersLength: updateData.ticketNumbers ? updateData.ticketNumbers.length : 0
      });
    }

    const updatedDonation = await Donation.findByPk(req.params.id);
    console.log('✅ Final updated donation:', updatedDonation.toJSON());
    
    res.json({
      message: 'Donation status updated successfully',
      donation: updatedDonation
    });
    
  } catch (error) {
    console.error('💥 Error updating donation status:', error);
    console.error('Error stack:', error.stack);
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
    const csvHeaders = 'Full Name,Email,Phone,Location,Requested Tickets,Requested Amount,Actual Amount,Tickets Assigned,Status,Payment Link,Screenshot URL,Date\n';
    
    const csvData = donations.map(donation => {
      const ticketNumbers = donation.ticketNumbers ? donation.ticketNumbers.join('; ') : '';
      return `"${donation.fullName}","${donation.email}","${donation.phone}","${donation.location}",${donation.tickets},${donation.amount},${donation.actualAmount || ''},${donation.ticketsAssigned || ''},${donation.status},"${donation.paymentLinkUsed}","${donation.paymentScreenshot}","${donation.createdAt}"`;
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
    const { contactPhone, ticketPrice, adminEmail } = req.body;
    let settings = await AdminSettings.findOne();
    
    if (!settings) {
      settings = await AdminSettings.create({ contactPhone, ticketPrice, adminEmail });
    } else {
      await settings.update({ contactPhone, ticketPrice, adminEmail });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;