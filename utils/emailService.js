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
 * This version uses simplified HTML/CSS for maximum deliverability and avoids elements
 * that might be flagged as promotional.
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

  // 3. Construct Email Message
  const msg = {
    to: donation.email,
    from: {
      email: fromEmail,
      name: fromName
    },
    replyTo: replyTo,
    // REMOVED EMOJI: Simplified subject line to be purely transactional
    subject: `Team ${teamId} Registration Confirmation`, 
    
    // --- HTML Content (Using Tables and Inline CSS for maximum Deliverability) ---
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Confirmed</title>
      </head>
      <!-- Body styles are inline and use widely supported fonts -->
      <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4; color: #333; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
        <!-- Center the entire email container -->
        <center>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: white; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.05); margin: 20px auto;">
          
          <!-- Header (Simplified - removing aggressive color) -->
          <tr>
            <td align="center" style="background-color: #EEEEEE; color: #1a1a1a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="font-size: 24px; margin: 0; font-weight: 600;">Team Registration Confirmed</h1>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding: 20px 30px;">
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px; color: #333;">Dear ${donation.participantName},</p>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #333;">Thank you for registering! Your team is officially confirmed and your **transaction is complete**. Below are your registration details:</p>
              
              <!-- Details Table (Card replacement) -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; margin: 20px 0;">
                <tr>
                  <td style="padding: 15px;">
                    <!-- Detail Row 1: Team ID -->
                    <p style="margin: 0 0 8px; font-size: 16px;">
                      <strong style="color: #1a1a1a; display: inline-block; min-width: 120px;">Team ID:</strong> 
                      <span style="color: #0066cc; font-weight: 700; font-size: 16px;">${teamId}</span>
                    </p>
                    <!-- Detail Row 2: Captain -->
                    <p style="margin: 0 0 8px; font-size: 16px;">
                      <strong style="color: #1a1a1a; display: inline-block; min-width: 120px;">Captain:</strong> 
                      ${donation.participantName}
                    </p>
                    <!-- Detail Row 3: Teammate -->
                    <p style="margin: 0 0 8px; font-size: 16px;">
                      <strong style="color: #1a1a1a; display: inline-block; min-width: 120px;">Teammate:</strong> 
                      ${donation.teammateName || 'N/A'}
                    </p>
                    <!-- Detail Row 4: Amount Paid -->
                    <p style="margin: 0; font-size: 16px;">
                      <strong style="color: #1a1a1a; display: inline-block; min-width: 120px;">Amount Paid:</strong> 
                      €${finalActualAmount}
                    </p>
                  </td>
                </tr>
              </table>
              <!-- End Details Table -->
              
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px; color: #333;">This **Team ID** is required for all event-related communication and participation. Please keep it safe.</p>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 0; color: #333;">For any questions, please simply reply to this email, and our support team will assist you promptly.</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="text-align: center; padding: 20px 30px; color: #6b7280; font-size: 12px; border-top: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 5px;">This is an automated transaction confirmation from ${fromName}.</p>
              <a href="mailto:${replyTo}" style="color: #6b7280; text-decoration: underline;">Contact Support</a>
            </td>
          </tr>
        </table>
        </center>
      </body>
      </html>
    `,
    
    // --- Plain Text Content (Cleaned up for maximum spam filter safety) ---
    text: `
Team Registration Confirmation

Dear ${donation.participantName},

Your team registration is complete! This is a transaction confirmation.

--- Team Details ---
- Team ID: ${teamId}
- Team Captain: ${donation.participantName}
- Teammate: ${donation.teammateName || 'N/A'}
- Amount Paid: €${finalActualAmount}
----------------------

Please keep your Team ID safe as it is required for event participation.
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
