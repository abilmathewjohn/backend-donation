const sgMail = require('@sendgrid/mail');

// --- Configuration Setup ---
// Initialize SendGrid with API key immediately upon module load.
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  // Log a warning if the API key is missing during initialization
  console.warn("SENDGRID_API_KEY is not set. Email functionality will be disabled or fail.");
}

/**
 * Sends a team registration confirmation email.
 * This function incorporates best practices for deliverability, including
 * robust input validation, comprehensive HTML/text content, and detailed error handling.
 *
 * NOTE: For production use and better deliverability, consider using SendGrid Dynamic Templates
 * instead of inline HTML strings. This also centralizes template management.
 *
 * @param {object} donation - Donation details (must contain email, participantName, amount).
 * @param {string} teamId - The unique ID for the registered team.
 * @returns {Promise<{success: boolean, message: string, errorDetails?: object}>}
 */
const sendTeamConfirmationEmail = async (donation, teamId) => {
  // 1. Input Validation
  if (!donation?.email || !donation?.participantName || !teamId) {
    return {
      success: false,
      message: 'Missing required fields: email, participantName, or teamId'
    };
  }

  // 2. Configuration Check
  if (!process.env.SENDGRID_API_KEY) {
    return {
      success: false,
      message: 'SendGrid configuration missing: API key not set'
    };
  }
  if (!process.env.SENDGRID_FROM_EMAIL) {
    return {
      success: false,
      message: 'SendGrid configuration missing: FROM email not set'
    };
  }

  const finalActualAmount = donation.actualAmount || donation.amount || 0;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.SENDGRID_FROM_NAME || 'Team Registration';
  const replyTo = process.env.SENDGRID_REPLY_TO || fromEmail;

  // 3. Construct Email Message (using both HTML and plain text is crucial for deliverability)
  const msg = {
    to: donation.email,
    from: {
      email: fromEmail,
      name: fromName
    },
    replyTo: replyTo,
    subject: `✅ Registration Confirmed for Team ${teamId}`, // Added an emoji for visibility
    
    // --- HTML Content ---
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Confirmed</title>
        <style>
          /* Reset Styles */
          body, html { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; background: #f4f4f4; color: #333; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.05); overflow: hidden; }
          .header { background-color: #0066cc; color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 20px 30px; }
          h1 { font-size: 28px; margin: 0; font-weight: 600; }
          p { font-size: 16px; line-height: 1.6; margin: 0 0 16px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 6px; margin: 20px 0; }
          .highlight { color: #0066cc; font-weight: 700; font-size: 18px; }
          .detail-row { display: block; margin-bottom: 8px; }
          .detail-row strong { display: inline-block; width: 120px; color: #1a1a1a; }
          .footer { text-align: center; padding: 20px 30px; color: #6b7280; font-size: 12px; border-top: 1px solid #e2e8f0; }
          
          /* Responsive adjustments (basic) */
          @media screen and (max-width: 600px) {
            .container { margin: 0; border-radius: 0; box-shadow: none; }
            .content { padding: 15px; }
            h1 { font-size: 24px; }
            .detail-row strong { width: 100%; display: block; margin-bottom: 4px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Team Registration Confirmed</h1>
          </div>
          <div class="content">
            <p>Dear ${donation.participantName},</p>
            <p>Thank you for registering! Your team is officially confirmed for the event. Below are your registration details:</p>
            
            <div class="card">
              <span class="detail-row">
                <strong>Team ID:</strong>
                <span class="highlight">${teamId}</span>
              </span>
              <span class="detail-row">
                <strong>Captain:</strong>
                ${donation.participantName}
              </span>
              <span class="detail-row">
                <strong>Teammate:</strong>
                ${donation.teammateName || 'N/A'}
              </span>
              <span class="detail-row">
                <strong>Amount Paid:</strong>
                €${finalActualAmount}
              </span>
            </div>
            
            <p>This Team ID is your official reference for all event-related communication and participation.</p>
            <p>We look forward to seeing you there! If you have any questions, please simply reply to this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated transaction confirmation email from ${fromName}.</p>
            <p>If you did not initiate this registration, please contact us immediately.</p>
            <p><a href="mailto:${replyTo}" style="color: #6b7280; text-decoration: underline;">Contact Support</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    
    // --- Plain Text Content (MANDATORY for spam prevention) ---
    text: `
Team Registration Confirmed

Dear ${donation.participantName},

Your team registration is complete!

--- Team Details ---
- Team ID: ${teamId}
- Team Captain: ${donation.participantName}
- Teammate: ${donation.teammateName || 'N/A'}
- Amount Paid: €${finalActualAmount}
----------------------

Please keep your Team ID safe as it's required for event participation.
For any questions, reply to this email (${replyTo}) or contact our support team.

Thank you for registering!
- The ${fromName} Team
    `
  };

  // 4. Send Email and Handle Errors
  try {
    const response = await sgMail.send(msg);
    // Response[0].statusCode is typically 202 on success
    return {
      success: true,
      message: `Email sent successfully. SendGrid Status: ${response[0]?.statusCode}`
    };
  } catch (error) {
    // Log detailed error from SendGrid for server-side debugging
    console.error('SendGrid Email Error:', {
      message: error.message,
      code: error.code,
      responseBody: error.response?.body,
    });

    // Return a user-friendly error message
    const errorDetails = {
      success: false,
      message: `Email sending failed (Code: ${error.code || 'N/A'}). Please check logs for details.`,
    };

    // Specific error handling for common issues
    if (error.code === 401) {
      errorDetails.message = 'SendGrid authentication failed (Invalid API Key or permissions).';
    } else if (error.code === 403) {
      errorDetails.message = 'SendGrid forbidden (Check account status or domain authentication).';
    }

    return errorDetails;
  }
};

module.exports = { sendTeamConfirmationEmail };
