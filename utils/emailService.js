const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Send team confirmation email with spam prevention
const sendTeamConfirmationEmail = async (donation, teamId) => {
  // Input validation
  if (!donation?.email || !donation?.participantName || !teamId) {
    return {
      success: false,
      message: 'Missing required fields: email, participantName, or teamId'
    };
  }

  // Check SendGrid configuration
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    return {
      success: false,
      message: 'SendGrid configuration missing: API key or from email'
    };
  }

  const finalActualAmount = donation.actualAmount || donation.amount;

  // Ensure SPF and DKIM are properly configured in DNS:
  // SPF: v=spf1 include:sendgrid.net ~all
  // DKIM: Set up via SendGrid dashboard
  const msg = {
    to: donation.email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL,
      name: process.env.SENDGRID_FROM_NAME || 'Team Registration'
    },
    replyTo: process.env.SENDGRID_REPLY_TO || process.env.SENDGRID_FROM_EMAIL,
    subject: `Team ${teamId} Registration Confirmed`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif; margin: 0; padding: 0; background: #f7f7f7; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { padding: 20px; text-align: center; border-bottom: 1px solid #eee; }
          .content { padding: 20px; }
          h1 { color: #1a1a1a; font-size: 24px; margin: 0 0 20px; }
          p { color: #4a4a4a; line-height: 1.6; margin: 0 0 12px; }
          .card { background: #f8fafc; padding: 16px; border-radius: 6px; margin-bottom: 16px; }
          .highlight { color: #0066cc; font-weight: 600; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Team Registration Confirmed</h1>
          </div>
          <div class="content">
            <p>Dear ${donation.participantName},</p>
            <p>Your team registration is complete! Below are your details:</p>
            <div class="card">
              <p><strong>Team ID:</strong> <span class="highlight">${teamId}</span></p>
              <p><strong>Team Captain:</strong> ${donation.participantName}</p>
              <p><strong>Teammate:</strong> ${donation.teammateName || 'N/A'}</p>
              <p><strong>Amount Paid:</strong> €${finalActualAmount}</p>
            </div>
            <p>Please keep your Team ID safe as it's required for event participation.</p>
            <p>If you have any questions, reply to this email or contact our support team.</p>
          </div>
          <div class="footer">
            <p>This is an automated email from Team Registration</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Team Registration Confirmed

Dear ${donation.participantName},

Your team registration is complete!

Team Details:
- Team ID: ${teamId}
- Team Captain: ${donation.participantName}
- Teammate: ${donation.teammateName || 'N/A'}
- Amount Paid: €${finalActualAmount}

Please keep your Team ID safe as it's required for event participation.
For any questions, reply to this email or contact our support team.

Thank you for registering!
    `
  };

  try {
    await sgMail.send(msg);
    return {
      success: true,
      message: 'Email sent successfully'
    };
  } catch (error) {
    const errorDetails = {
      success: false,
      message: `Email sending failed: ${error.message}`
    };

    // Handle specific SendGrid errors
    if (error.code === 401) {
      errorDetails.message = 'SendGrid authentication failed - invalid API key';
    } else if (error.code === 403) {
      errorDetails.message = 'SendGrid forbidden - check account permissions';
    } else if (error.code === 429) {
      errorDetails.message = 'SendGrid rate limit exceeded';
    }

    return errorDetails;
  }
};

module.exports = { sendTeamConfirmationEmail };