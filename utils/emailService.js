// backend/utils/emailService.js
const nodemailer = require('nodemailer');

const sendTeamConfirmationEmail = async (donation, teamId) => {
  try {
    console.log('=== TEAM REGISTRATION EMAIL ===');
    console.log('To:', donation.email);
    console.log('Subject: Your Team Registration - Confirmed!');
    console.log('Team Captain:', donation.participantName);
    console.log('Teammate:', donation.teammateName);
    console.log('Team ID:', teamId);
    console.log('Amount Paid:', donation.actualAmount || donation.amount);
    console.log('=== END EMAIL ===');

    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('❌ Email credentials not configured. Email not sent.');
      console.log('💡 Set EMAIL_USER and EMAIL_PASS environment variables to send actual emails.');
      return false;
    }

    console.log('🔧 Creating email transporter...');
    
    // Create transporter with better configuration
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify transporter configuration
    try {
      console.log('🔍 Verifying SMTP connection...');
      await transporter.verify();
      console.log('✅ SMTP connection verified');
    } catch (verifyError) {
      console.error('❌ SMTP connection failed:', verifyError);
      return false;
    }

    const finalActualAmount = donation.actualAmount || donation.amount;

    const mailOptions = {
      from: `"Team Registration System" <${process.env.EMAIL_USER}>`,
      to: donation.email,
      subject: 'Your Team Registration - Confirmed!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Team Registration Confirmed!</h2>
          <p>Dear ${donation.participantName},</p>
          <p>Your team registration has been confirmed. Here are your team details:</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Team Information</h3>
            <p><strong>Team ID:</strong> ${teamId}</p>
            <p><strong>Team Captain:</strong> ${donation.participantName}</p>
            <p><strong>Teammate:</strong> ${donation.teammateName}</p>
            <p><strong>Team Size:</strong> 2 persons</p>
          </div>
          
          <div style="background: #f0fff4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Payment Summary</h3>
            <p><strong>Amount Paid:</strong> €${finalActualAmount}</p>
            <p><strong>Registration Status:</strong> Confirmed</p>
          </div>
          
          <div style="background: #e6f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Important Information</h3>
            <p>Please keep this email safe as it contains your team registration information.</p>
            <p><strong>Your Team ID (${teamId})</strong> will be required for event participation.</p>
          </div>
          
          <p>If you have any questions, please contact us.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      `,
      text: `
        Team Registration Confirmed!
        
        Dear ${donation.participantName},
        
        Your team registration has been confirmed. Here are your team details:
        
        TEAM INFORMATION:
        - Team ID: ${teamId}
        - Team Captain: ${donation.participantName}
        - Teammate: ${donation.teammateName}
        - Team Size: 2 persons
        
        PAYMENT SUMMARY:
        - Amount Paid: €${finalActualAmount}
        - Registration Status: Confirmed
        
        IMPORTANT INFORMATION:
        Please keep this email safe as it contains your team registration information.
        Your Team ID (${teamId}) will be required for event participation.
        
        If you have any questions, please contact us.
        
        ---
        This is an automated message. Please do not reply to this email.
      `
    };

    console.log('📤 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Team confirmation email sent successfully:', info.messageId);
    console.log('📧 Email response:', info.response);
    
    return true;
  } catch (error) {
    console.error('❌ Error sending team confirmation email:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command
    });
    return false;
  }
};

module.exports = {
  sendTeamConfirmationEmail,
};