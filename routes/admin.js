const express = require('express');
const router = express.Router();
const { Donation, PaymentLink, AdminSettings } = require('../models');
const { sendTicketEmail, deleteImage } = require('../utils/cloudinary');
const { Op } = require('sequelize');

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
    const { status, actualAmount, ticketsToAssign, ticketNumbers } = req.body;
    const donation = await Donation.findByPk(req.params.id);
    
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    console.log('Updating donation:', req.body);

    const updateData = { status };
    const settings = await AdminSettings.findOne();
    const ticketPrice = settings?.ticketPrice || 2.00;

    if (status === 'confirmed') {
      // Handle actual amount
      if (actualAmount !== undefined && actualAmount !== null && actualAmount !== '') {
        updateData.actualAmount = parseFloat(actualAmount);
      } else if (!donation.actualAmount) {
        updateData.actualAmount = parseFloat(donation.amount);
      }
      
      // Handle tickets assignment
      let finalTicketsAssigned;
      if (ticketsToAssign !== undefined && ticketsToAssign !== null && ticketsToAssign !== '') {
        finalTicketsAssigned = parseInt(ticketsToAssign);
      } else {
        finalTicketsAssigned = Math.floor(updateData.actualAmount / ticketPrice);
      }
      updateData.ticketsAssigned = finalTicketsAssigned;
      
      // Handle ticket numbers
      let finalTicketNumbers = [];
      if (ticketNumbers && ticketNumbers.trim()) {
        finalTicketNumbers = ticketNumbers.split(',').map(t => t.trim()).filter(t => t);
      } else {
        // Auto-generate ticket numbers
        for (let i = 1; i <= finalTicketsAssigned; i++) {
          finalTicketNumbers.push(`TICKET-${donation.id.slice(-8).toUpperCase()}-${i}`);
        }
      }
      updateData.ticketNumbers = finalTicketNumbers;
      
    } else {
      // Clear assignment data for non-confirmed status
      updateData.actualAmount = null;
      updateData.ticketsAssigned = null;
      updateData.ticketNumbers = null;
    }

    await donation.update(updateData);

    // Send email if confirmed and has tickets
    if (status === 'confirmed' && updateData.ticketNumbers && updateData.ticketNumbers.length > 0) {
      try {
        await sendTicketEmail(donation, updateData.ticketNumbers);
        console.log('Ticket email sent successfully');
      } catch (emailError) {
        console.error('Error sending ticket email:', emailError);
      }
    }

    const updatedDonation = await Donation.findByPk(req.params.id);
    res.json({
      message: 'Donation status updated successfully',
      donation: updatedDonation
    });
  } catch (error) {
    console.error('Error updating donation status:', error);
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