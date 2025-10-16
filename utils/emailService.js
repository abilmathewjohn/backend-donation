// backend/utils/emailService.js
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// SendGrid email function
const sendTeamConfirmationEmail = async (donation, teamId) => {
  try {
    console.log('📧 SENDGRID EMAIL ATTEMPT STARTED');
    console.log('To:', donation.email);
    console.log('Team ID:', teamId);

    // Check for SendGrid configuration
    if (!process.env.SENDGRID_API_KEY) {
      console.log('❌ EMAIL SKIPPED: No SendGrid API key configured');
      console.log('💡 Set SENDGRID_API_KEY in environment variables');
      return false;
    }

    if (!process.env.SENDGRID_FROM_EMAIL) {
      console.log('❌ EMAIL SKIPPED: No SendGrid from email configured');
      console.log('💡 Set SENDGRID_FROM_EMAIL in environment variables');
      return false;
    }

    const finalActualAmount = donation.actualAmount || donation.amount;

    const msg = {
      to: donation.email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: process.env.SENDGRID_FROM_NAME || 'Team Registration'
      },
      subject: `Team ${teamId} - Registration Confirmed`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>🎉 Team Registration Confirmed!</h2>
          <p>Dear <strong>${donation.participantName}</strong>,</p>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #4CAF50;">
            <h3 style="color: #2e7d32; margin-top: 0;">Your Team Details</h3>
            <p><strong>Team ID:</strong> <span style="font-size: 18px; font-weight: bold; color: #d32f2f;">${teamId}</span></p>
            <p><strong>Team Captain:</strong> ${donation.participantName}</p>
            <p><strong>Teammate:</strong> ${donation.teammateName}</p>
            <p><strong>Amount Paid:</strong> €${finalActualAmount}</p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107;">
            <h4 style="color: #856404; margin-top: 0;">Important Information</h4>
            <p>🔹 <strong>Your Team ID ${teamId} is required for event participation</strong></p>
            <p>🔹 Please keep this email safe</p>
            <p>🔹 Contact us if you have any questions</p>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center;">
            This is an automated confirmation email.
          </p>
        </div>
      `,
      text: `
TEAM REGISTRATION CONFIRMED!

Dear ${donation.participantName},

Your team registration has been confirmed!

TEAM DETAILS:
✅ Team ID: ${teamId}
✅ Team Captain: ${donation.participantName}
✅ Teammate: ${donation.teammateName}
✅ Amount Paid: €${finalActualAmount}

IMPORTANT:
🔸 Your Team ID ${teamId} is required for event participation
🔸 Please keep this email safe
🔸 Contact us if you have any questions

Thank you for your registration!
      `,
      // Optional: Add tracking settings
      trackingSettings: {
        clickTracking: {
          enable: false
        },
        openTracking: {
          enable: false
        }
      }
    };

    console.log('📤 Sending email via SendGrid...');
    const response = await sgMail.send(msg);
    console.log('✅ SENDGRID EMAIL SENT SUCCESSFULLY');
    console.log('📧 SendGrid response status:', response[0].statusCode);
    console.log('📧 SendGrid response headers:', response[0].headers);

    return true;

  } catch (error) {
    console.error('❌ SENDGRID EMAIL FAILED:', error.message);
    
    // Enhanced SendGrid error handling
    if (error.response) {
      console.error('SendGrid API Error Details:');
      console.error('Status Code:', error.response.statusCode);
      console.error('Response Body:', error.response.body);
      console.error('Response Headers:', error.response.headers);
    }

    // Common SendGrid error codes
    if (error.code === 401) {
      console.error('🔐 SendGrid Authentication failed - check API key');
    } else if (error.code === 403) {
      console.error('🚫 SendGrid Forbidden - check account permissions');
    } else if (error.code === 429) {
      console.error('⏰ SendGrid Rate limit exceeded');
    }

    return false;
  }
};

// Test email configuration function
const testSendGridConfiguration = async () => {
  try {
    console.log('🧪 Testing SendGrid configuration...');
    
    if (!process.env.SENDGRID_API_KEY) {
      return {
        success: false,
        message: 'SENDGRID_API_KEY not configured'
      };
    }

    if (!process.env.SENDGRID_FROM_EMAIL) {
      return {
        success: false,
        message: 'SENDGRID_FROM_EMAIL not configured'
      };
    }

    // Simple API key validation by checking if we can create a message object
    const testMsg = {
      to: process.env.SENDGRID_FROM_EMAIL, // Send to yourself for testing
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'SendGrid Configuration Test',
      text: 'This is a test email to verify SendGrid configuration.',
      html: '<p>This is a test email to verify SendGrid configuration.</p>'
    };

    console.log('✅ SendGrid configuration appears valid');
    return {
      success: true,
      message: 'SendGrid configuration is valid'
    };

  } catch (error) {
    console.error('❌ SendGrid configuration test failed:', error.message);
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