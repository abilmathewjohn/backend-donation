const sgMail = require('@sendgrid/mail');
const { EmailLog } = require('../models');

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn("SENDGRID_API_KEY is not set. Email functionality will be disabled.");
}

/**
 * Sends team registration confirmation email with comprehensive features
 */
const sendTeamConfirmationEmail = async (donation, teamId) => {
  // 1. Input Validation
  if (!donation?.email || !donation?.participantName || !teamId) {
    const errorMsg = 'Missing required fields: email, participantName, or teamId';
    console.error('❌ Email validation failed:', errorMsg);
    
    // Log the failed attempt
    await logEmailAttempt(donation, teamId, 'failed', errorMsg);
    
    return {
      success: false,
      message: errorMsg
    };
  }

  // 2. Configuration Check
  if (!process.env.SENDGRID_API_KEY) {
    const errorMsg = 'SendGrid configuration missing: API key not set';
    console.error('❌ SendGrid config missing');
    
    await logEmailAttempt(donation, teamId, 'failed', errorMsg);
    
    return {
      success: false,
      message: errorMsg
    };
  }

  const finalActualAmount = donation.actualAmount || donation.amount || 0;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.SENDGRID_FROM_NAME || 'Team Registration System';
  const replyTo = process.env.SENDGRID_REPLY_TO || fromEmail;

  try {
    // 3. Construct Email Message
    const msg = {
      to: donation.email,
      from: {
        email: fromEmail,
        name: fromName
      },
      replyTo: replyTo,
      subject: `✅ Team Registration Confirmed - Team ID: ${teamId}`,
      
      // HTML Content with modern styling
      html: buildEmailHTML(donation, teamId, finalActualAmount, fromName),
      
      // Plain Text Content (important for deliverability)
      text: buildEmailText(donation, teamId, finalActualAmount, fromName),
      
      // Email tracking settings
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      },
      
      // Categorize for better management
      categories: ['team-registration', 'confirmation']
    };

    console.log('📧 Attempting to send email to:', donation.email);

    // 4. Send Email
    const response = await sgMail.send(msg);
    
    console.log('✅ Email sent successfully. Status:', response[0]?.statusCode);

    // 5. Log Successful Email
    await logEmailAttempt(donation, teamId, 'sent', null, msg.subject);

    return {
      success: true,
      message: `Confirmation email sent successfully to ${donation.email}`,
      teamId: teamId,
      sendGridStatus: response[0]?.statusCode
    };

  } catch (error) {
    console.error('❌ SendGrid Email Error:', {
      message: error.message,
      code: error.code,
      response: error.response?.body,
    });

    // 6. Log Failed Email
    await logEmailAttempt(
      donation, 
      teamId, 
      'failed', 
      `SendGrid Error: ${error.message} (Code: ${error.code})`,
      `Registration Confirmed - Team ${teamId}`
    );

    // User-friendly error messages
    let userMessage = `Failed to send confirmation email: ${error.message}`;
    
    if (error.code === 401) {
      userMessage = 'Email service authentication failed. Please contact support.';
    } else if (error.code === 403) {
      userMessage = 'Email service access forbidden. Please contact support.';
    } else if (error.code === 429) {
      userMessage = 'Too many email requests. Please try again later.';
    }

    return {
      success: false,
      message: userMessage,
      errorCode: error.code
    };
  }
};

/**
 * Builds HTML email content
 */
const buildEmailHTML = (donation, teamId, amount, fromName) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Team Registration Confirmed</title>
    <style>
        /* Modern CSS Reset */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; background: #f8fafc; }
        
        /* Container */
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        
        /* Header */
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 10px; }
        .header p { font-size: 16px; opacity: 0.9; }
        
        /* Content */
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; color: #2d3748; margin-bottom: 30px; }
        
        /* Team Card */
        .team-card { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0; }
        .team-id { font-size: 32px; font-weight: 800; letter-spacing: 2px; margin-bottom: 10px; font-family: 'Courier New', monospace; }
        .team-label { font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
        
        /* Details Card */
        .details-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin: 25px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-weight: 600; color: #4a5568; }
        .detail-value { color: #2d3748; font-weight: 500; }
        
        /* Instructions */
        .instructions { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0; }
        .instructions h3 { color: #856404; margin-bottom: 10px; }
        .instructions ul { color: #856404; padding-left: 20px; }
        .instructions li { margin-bottom: 8px; }
        
        /* Footer */
        .footer { background: #2d3748; color: #cbd5e0; text-align: center; padding: 30px; font-size: 14px; }
        .footer a { color: #63b3ed; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }
        
        /* Responsive */
        @media (max-width: 600px) {
            .container { margin: 10px; border-radius: 8px; }
            .header, .content { padding: 25px 20px; }
            .team-id { font-size: 24px; }
            .detail-row { flex-direction: column; gap: 5px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🎉 Registration Confirmed!</h1>
            <p>Your team is officially registered for the event</p>
        </div>
        
        <!-- Content -->
        <div class="content">
            <p class="greeting">Dear <strong>${donation.participantName}</strong>,</p>
            <p>Thank you for completing your team registration! We're excited to have you join us.</p>
            
            <!-- Team ID Highlight -->
            <div class="team-card">
                <div class="team-label">Your Team ID</div>
                <div class="team-id">${teamId}</div>
                <div class="team-label">Keep this safe for event access</div>
            </div>
            
            <!-- Team Details -->
            <div class="details-card">
                <div class="detail-row">
                    <span class="detail-label">Team Captain:</span>
                    <span class="detail-value">${donation.participantName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Teammate:</span>
                    <span class="detail-value">${donation.teammateName || 'Not specified'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">${donation.email}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Contact Number:</span>
                    <span class="detail-value">${donation.contactNumber1}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Amount Paid:</span>
                    <span class="detail-value">€${parseFloat(amount).toFixed(2)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Registration Date:</span>
                    <span class="detail-value">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>
            
            <!-- Important Instructions -->
            <div class="instructions">
                <h3>📋 Important Next Steps:</h3>
                <ul>
                    <li><strong>Save your Team ID (${teamId})</strong> - You'll need this for event check-in</li>
                    <li>Share this confirmation with your teammate</li>
                    <li>Keep this email for your records</li>
                    <li>Arrive 30 minutes early on event day for smooth check-in</li>
                </ul>
            </div>
            
            <p>We look forward to seeing you at the event! If you have any questions, please don't hesitate to reply to this email.</p>
            
            <p>Best regards,<br><strong>The ${fromName} Team</strong></p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>This is an automated confirmation email. Please do not reply to this address.</p>
            <p>If you have any questions, contact us at: <a href="mailto:${replyTo}">${replyTo}</a></p>
            <p style="margin-top: 15px; font-size: 12px; opacity: 0.7;">
                &copy; ${new Date().getFullYear()} ${fromName}. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
  `;
};

/**
 * Builds plain text email content
 */
const buildEmailText = (donation, teamId, amount, fromName) => {
  return `
TEAM REGISTRATION CONFIRMED

Dear ${donation.participantName},

Your team registration has been successfully confirmed! We're excited to have you join us for the event.

=== YOUR TEAM DETAILS ===
Team ID: ${teamId}
Team Captain: ${donation.participantName}
Teammate: ${donation.teammateName || 'Not specified'}
Email: ${donation.email}
Contact: ${donation.contactNumber1}
Amount Paid: €${parseFloat(amount).toFixed(2)}
Registration Date: ${new Date().toLocaleDateString()}

=== IMPORTANT INSTRUCTIONS ===
1. SAVE YOUR TEAM ID: ${teamId} - Required for event check-in
2. Share this confirmation with your teammate
3. Keep this email for your records
4. Arrive 30 minutes early on event day

=== CONTACT INFORMATION ===
If you have any questions, please reply to this email or contact our support team.

We look forward to seeing you at the event!

Best regards,
The ${fromName} Team

---
This is an automated confirmation email. Please do not reply to this address.
© ${new Date().getFullYear()} ${fromName}. All rights reserved.
  `;
};

/**
 * Logs email attempts to the database
 */
const logEmailAttempt = async (donation, teamId, status, errorMessage = null, subject = null) => {
  try {
    await EmailLog.create({
      donationId: donation.id,
      teamId: teamId,
      recipientEmail: donation.email,
      recipientName: donation.participantName,
      subject: subject || `Team Registration Confirmed - ${teamId}`,
      status: status,
      errorMessage: errorMessage,
      sentAt: new Date()
    });
    console.log(`📝 Email log created: ${status} for team ${teamId}`);
  } catch (logError) {
    console.error('❌ Failed to create email log:', logError);
  }
};

/**
 * Sends custom email to specific recipient
 */
const sendCustomEmail = async (to, subject, htmlContent, textContent = null) => {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      return { success: false, message: 'SendGrid API key not configured' };
    }

    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    const fromName = process.env.SENDGRID_FROM_NAME || 'Team Registration System';

    const msg = {
      to: to,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: subject,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, ''),
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };

    const response = await sgMail.send(msg);
    
    // Log custom email (you might want to create a separate log for custom emails)
    await EmailLog.create({
      donationId: null, // Custom emails might not be associated with a donation
      teamId: 'CUSTOM',
      recipientEmail: to,
      recipientName: to, // You might want to capture name separately
      subject: subject,
      status: 'sent',
      sentAt: new Date()
    });

    return {
      success: true,
      message: `Custom email sent successfully to ${to}`,
      sendGridStatus: response[0]?.statusCode
    };

  } catch (error) {
    console.error('❌ Custom email error:', error);
    
    await EmailLog.create({
      donationId: null,
      teamId: 'CUSTOM',
      recipientEmail: to,
      recipientName: to,
      subject: subject,
      status: 'failed',
      errorMessage: error.message,
      sentAt: new Date()
    });

    return {
      success: false,
      message: `Failed to send custom email: ${error.message}`
    };
  }
};

/**
 * Bulk email sending for multiple teams
 */
const sendBulkConfirmations = async (donations) => {
  const results = [];
  
  for (const donation of donations) {
    if (donation.status === 'confirmed' && donation.teamId) {
      try {
        const result = await sendTeamConfirmationEmail(donation, donation.teamId);
        results.push({
          teamId: donation.teamId,
          email: donation.email,
          success: result.success,
          message: result.message
        });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          teamId: donation.teamId,
          email: donation.email,
          success: false,
          message: error.message
        });
      }
    }
  }
  
  return results;
};

/**
 * Test email configuration
 */
const testEmailConfig = async (testEmail = null) => {
  try {
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    const fromName = process.env.SENDGRID_FROM_NAME || 'Team Registration System';
    const testTo = testEmail || fromEmail;

    const testMsg = {
      to: testTo,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: '📧 Email Service Test - Team Registration System',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #4CAF50;">✅ Email Service Test Successful</h2>
          <p>This is a test email from your Team Registration System.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>From:</strong> ${fromName} (${fromEmail})</p>
          <p>If you received this email, your email service is configured correctly!</p>
        </div>
      `,
      text: `Email Service Test Successful\n\nThis is a test email from your Team Registration System.\nTimestamp: ${new Date().toISOString()}\nFrom: ${fromName} (${fromEmail})`
    };

    const response = await sgMail.send(testMsg);
    
    return {
      success: true,
      message: `Test email sent successfully to ${testTo}`,
      statusCode: response[0]?.statusCode,
      config: {
        fromEmail: fromEmail,
        fromName: fromName,
        apiKey: process.env.SENDGRID_API_KEY ? 'Configured' : 'Missing'
      }
    };

  } catch (error) {
    return {
      success: false,
      message: `Test email failed: ${error.message}`,
      errorCode: error.code,
      config: {
        fromEmail: process.env.SENDGRID_FROM_EMAIL,
        fromName: process.env.SENDGRID_FROM_NAME,
        apiKey: process.env.SENDGRID_API_KEY ? 'Configured' : 'Missing'
      }
    };
  }
};

module.exports = {
  sendTeamConfirmationEmail,
  sendCustomEmail,
  sendBulkConfirmations,
  testEmailConfig
};