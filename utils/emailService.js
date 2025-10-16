// backend/utils/emailService.js
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const sendTeamConfirmationEmail = async (donation, teamId) => {
  try {
    console.log('📧 Sending team confirmation email...');

    // Validate configuration
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      console.log('❌ Email skipped: Missing SendGrid configuration');
      return false;
    }

    // Validate required fields
    if (!donation.email || !donation.participantName || !donation.teammateName) {
      console.log('❌ Email skipped: Missing required donation fields');
      return false;
    }

    const finalAmount = donation.actualAmount || donation.amount || 0;

    const msg = {
      to: donation.email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: process.env.SENDGRID_FROM_NAME || 'Event Registration'
      },
      subject: `Team ${teamId} - Registration Confirmed`,
      html: generateModernEmailHTML(donation, teamId, finalAmount),
      text: generatePlainTextEmail(donation, teamId, finalAmount),
      // Anti-spam settings
      mailSettings: {
        bypassListManagement: {
          enable: false
        },
        footer: {
          enable: false
        },
        sandboxMode: {
          enable: false
        }
      },
      trackingSettings: {
        clickTracking: {
          enable: false
        },
        openTracking: {
          enable: false
        },
        subscriptionTracking: {
          enable: false
        }
      }
    };

    console.log('📤 Sending via SendGrid...');
    await sgMail.send(msg);
    console.log('✅ Email sent successfully');
    
    return true;

  } catch (error) {
    console.error('❌ Email failed:', error.message);
    
    if (error.response) {
      console.error('SendGrid error details:', error.response.body);
    }
    
    return false;
  }
};

const generateModernEmailHTML = (donation, teamId, amount) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Registration Confirmed</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; color: white; }
    .content { padding: 40px 30px; }
    .team-id { background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; border: 1px solid #e2e8f0; }
    .team-number { font-size: 32px; font-weight: 700; color: #1e293b; letter-spacing: 2px; }
    .details-grid { display: grid; gap: 16px; margin: 30px 0; }
    .detail-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .detail-label { color: #64748b; font-weight: 500; }
    .detail-value { color: #1e293b; font-weight: 600; }
    .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 25px 0; }
    .footer { text-align: center; padding: 30px; color: #64748b; font-size: 14px; border-top: 1px solid #f1f5f9; }
    .icon { font-size: 48px; margin-bottom: 20px; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    h2 { font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #1e293b; }
    p { margin-bottom: 16px; color: #475569; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">✅</div>
      <h1>Registration Confirmed</h1>
      <p>Your team is officially registered!</p>
    </div>
    
    <div class="content">
      <p>Hello <strong>${donation.participantName}</strong>,</p>
      <p>Your team registration has been successfully processed and confirmed.</p>
      
      <div class="team-id">
        <p style="color: #64748b; margin-bottom: 8px;">Your Team ID</p>
        <div class="team-number">${teamId}</div>
      </div>

      <h2>Team Details</h2>
      <div class="details-grid">
        <div class="detail-item">
          <span class="detail-label">Team Captain</span>
          <span class="detail-value">${donation.participantName}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Teammate</span>
          <span class="detail-value">${donation.teammateName}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Amount Paid</span>
          <span class="detail-value">€${amount}</span>
        </div>
      </div>

      <div class="info-box">
        <h2>Important Information</h2>
        <p>• <strong>Save your Team ID:</strong> You'll need this for event participation</p>
        <p>• Keep this confirmation for your records</p>
        <p>• Contact us if you have any questions</p>
      </div>
    </div>
    
    <div class="footer">
      <p>This is an automated confirmation email.</p>
      <p>If you have any questions, please contact the event organizers.</p>
    </div>
  </div>
</body>
</html>
  `;
};

const generatePlainTextEmail = (donation, teamId, amount) => {
  return `
REGISTRATION CONFIRMED

Hello ${donation.participantName},

Your team registration has been successfully confirmed.

TEAM ID: ${teamId}

TEAM DETAILS:
Team Captain: ${donation.participantName}
Teammate: ${donation.teammateName}
Amount Paid: €${amount}

IMPORTANT:
• Save your Team ID for event participation
• Keep this confirmation for your records
• Contact organizers if you have questions

This is an automated confirmation email.
  `.trim();
};

// Test function
const testSendGridConfiguration = async () => {
  try {
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      return {
        success: false,
        message: 'Missing SendGrid configuration'
      };
    }

    return {
      success: true,
      message: 'SendGrid configuration is valid'
    };
  } catch (error) {
    return {
      success: false,
      message: `Configuration test failed: ${error.message}`
    };
  }
};

module.exports = {
  sendTeamConfirmationEmail,
  testSendGridConfiguration
};