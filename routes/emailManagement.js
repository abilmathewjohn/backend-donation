const express = require('express');
const router = express.Router();
const { Donation, EmailLog } = require('../models');
const { sendTeamConfirmationEmail, sendCustomEmail, sendBulkConfirmations, testEmailConfig } = require('../utils/emailService');
const { Op } = require('sequelize');

// Get all email logs with pagination and filtering
router.get('/emails', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search, startDate, endDate } = req.query;
    
    const where = {};
    
    // Status filter
    if (status && status !== 'all') {
      where.status = status;
    }
    
    // Search filter
    if (search) {
      where[Op.or] = [
        { recipientName: { [Op.iLike]: `%${search}%` } },
        { recipientEmail: { [Op.iLike]: `%${search}%` } },
        { teamId: { [Op.iLike]: `%${search}%` } },
        { subject: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Date range filter
    if (startDate || endDate) {
      where.sentAt = {};
      if (startDate) {
        where.sentAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.sentAt[Op.lte] = new Date(endDate);
      }
    }

    const emailLogs = await EmailLog.findAndCountAll({
      where,
      include: [{
        model: Donation,
        as: 'donation',
        attributes: ['participantName', 'teammateName', 'amount', 'actualAmount', 'status']
      }],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['sentAt', 'DESC']],
    });

    res.json({
      success: true,
      data: emailLogs.rows,
      total: emailLogs.count,
      page: parseInt(page),
      totalPages: Math.ceil(emailLogs.count / limit)
    });
  } catch (error) {
    console.error('Error fetching email logs:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch email logs',
      details: error.message 
    });
  }
});

// Get specific email log by ID
router.get('/emails/:id', async (req, res) => {
  try {
    const emailLog = await EmailLog.findByPk(req.params.id, {
      include: [{
        model: Donation,
        as: 'donation',
        attributes: ['participantName', 'teammateName', 'amount', 'actualAmount', 'contactNumber1', 'zone', 'diocese']
      }]
    });

    if (!emailLog) {
      return res.status(404).json({
        success: false,
        error: 'Email log not found'
      });
    }

    res.json({
      success: true,
      data: emailLog
    });
  } catch (error) {
    console.error('Error fetching email log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email log'
    });
  }
});

// Resend email
router.post('/emails/:id/resend', async (req, res) => {
  try {
    const emailLog = await EmailLog.findByPk(req.params.id, {
      include: [{ model: Donation, as: 'donation' }]
    });

    if (!emailLog) {
      return res.status(404).json({
        success: false,
        error: 'Email log not found'
      });
    }

    if (!emailLog.donation) {
      return res.status(404).json({
        success: false,
        error: 'Associated donation not found'
      });
    }

    const result = await sendTeamConfirmationEmail(
      emailLog.donation, 
      emailLog.teamId
    );

    res.json({
      success: result.success,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Error resending email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend email',
      details: error.message
    });
  }
});

// Send custom email
router.post('/emails/send-custom', async (req, res) => {
  try {
    const { to, subject, htmlContent, textContent } = req.body;

    if (!to || !subject || !htmlContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, htmlContent'
      });
    }

    const result = await sendCustomEmail(to, subject, htmlContent, textContent);

    res.json(result);
  } catch (error) {
    console.error('Error sending custom email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send custom email',
      details: error.message
    });
  }
});

// Bulk resend emails for confirmed teams without emails
router.post('/emails/bulk-resend', async (req, res) => {
  try {
    const { teamIds } = req.body;

    let whereCondition = {
      status: 'confirmed',
      teamId: { [Op.ne]: null }
    };

    if (teamIds && teamIds.length > 0) {
      whereCondition.teamId = { [Op.in]: teamIds };
    }

    const donations = await Donation.findAll({
      where: whereCondition,
      include: [{
        model: EmailLog,
        as: 'emailLogs',
        required: false,
        where: {
          status: 'sent'
        }
      }]
    });

    // Filter donations that don't have successful email logs
    const donationsToResend = donations.filter(donation => 
      !donation.emailLogs || donation.emailLogs.length === 0
    );

    const results = await sendBulkConfirmations(donationsToResend);

    res.json({
      success: true,
      message: `Processed ${results.length} emails`,
      results: results,
      stats: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (error) {
    console.error('Error in bulk resend:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bulk resend',
      details: error.message
    });
  }
});

// Export emails to CSV
router.get('/emails/export', async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    const where = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (startDate || endDate) {
      where.sentAt = {};
      if (startDate) {
        where.sentAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.sentAt[Op.lte] = new Date(endDate);
      }
    }

    const emailLogs = await EmailLog.findAll({
      where,
      include: [{
        model: Donation,
        as: 'donation',
        attributes: ['participantName', 'teammateName', 'amount', 'actualAmount']
      }],
      order: [['sentAt', 'DESC']],
    });

    const csvHeaders = 'Team ID,Recipient Name,Recipient Email,Teammate Name,Amount,Status,Sent At,Error Message\n';
    
    const csvData = emailLogs.map(log => {
      const safe = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
      
      return [
        safe(log.teamId),
        safe(log.recipientName),
        safe(log.recipientEmail),
        safe(log.donation?.teammateName),
        safe(log.donation?.actualAmount || log.donation?.amount),
        safe(log.status),
        safe(log.sentAt),
        safe(log.errorMessage)
      ].join(',');
    }).join('\n');

    const csv = csvHeaders + csvData;
    
    const filename = `email-logs-${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting emails:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export emails',
      details: error.message
    });
  }
});

// Generate shareable content for a team
router.get('/emails/:id/share-content', async (req, res) => {
  try {
    const emailLog = await EmailLog.findByPk(req.params.id, {
      include: [{ model: Donation, as: 'donation' }]
    });

    if (!emailLog || !emailLog.donation) {
      return res.status(404).json({
        success: false,
        error: 'Email log or donation not found'
      });
    }

    const donation = emailLog.donation;
    const amount = donation.actualAmount || donation.amount || 0;
    
    const shareContent = {
      teamId: emailLog.teamId,
      whatsapp: {
        text: `🏆 *Team Registration Confirmed!*\n\n` +
              `*Team ID:* ${emailLog.teamId}\n` +
              `*Captain:* ${donation.participantName}\n` +
              `*Teammate:* ${donation.teammateName}\n` +
              `*Amount Paid:* €${parseFloat(amount).toFixed(2)}\n` +
              `*Contact:* ${donation.contactNumber1}\n\n` +
              `Your team is successfully registered! Keep your Team ID safe for event access.`
      },
      generic: {
        text: `Team Registration Confirmed!\n\n` +
              `Team ID: ${emailLog.teamId}\n` +
              `Captain: ${donation.participantName}\n` +
              `Teammate: ${donation.teammateName}\n` +
              `Amount Paid: €${parseFloat(amount).toFixed(2)}\n` +
              `Contact: ${donation.contactNumber1}\n\n` +
              `Your team is successfully registered for the event!`
      },
      email: {
        subject: `Team Registration Details - ${emailLog.teamId}`,
        html: buildShareableEmailHTML(donation, emailLog.teamId, amount)
      }
    };

    res.json({
      success: true,
      data: shareContent
    });
  } catch (error) {
    console.error('Error generating share content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate share content',
      details: error.message
    });
  }
});

// Test email configuration
router.post('/emails/test-config', async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    const result = await testEmailConfig(testEmail);
    
    res.json(result);
  } catch (error) {
    console.error('Error testing email config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test email configuration',
      details: error.message
    });
  }
});

// Get email statistics
router.get('/emails/stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const stats = await EmailLog.findAll({
      where: {
        sentAt: {
          [Op.gte]: startDate
        }
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('DATE', sequelize.col('sentAt')), 'date']
      ],
      group: ['status', 'date'],
      order: [['date', 'DESC']]
    });
    
    const totalStats = await EmailLog.findAll({
      where: {
        sentAt: {
          [Op.gte]: startDate
        }
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });
    
    res.json({
      success: true,
      data: {
        daily: stats,
        totals: totalStats,
        period: {
          startDate: startDate,
          endDate: new Date(),
          days: parseInt(days)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching email stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email statistics',
      details: error.message
    });
  }
});

// Helper function for shareable email HTML
const buildShareableEmailHTML = (donation, teamId, amount) => {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #4CAF50;">Team Registration Details</h2>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
        <p><strong>Team ID:</strong> ${teamId}</p>
        <p><strong>Captain:</strong> ${donation.participantName}</p>
        <p><strong>Teammate:</strong> ${donation.teammateName}</p>
        <p><strong>Amount Paid:</strong> €${parseFloat(amount).toFixed(2)}</p>
        <p><strong>Contact:</strong> ${donation.contactNumber1}</p>
      </div>
      <p>This team has been successfully registered for the event.</p>
    </div>
  `;
};

module.exports = router;