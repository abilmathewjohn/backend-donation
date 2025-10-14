// backend/utils/emailService.js
const nodemailer = require('nodemailer');

// Simple email function without complex setup
const sendTeamConfirmationEmail = async (donation, teamId) => {
  try {
    console.log('📧 EMAIL ATTEMPT STARTED');
    console.log('To:', donation.email);
    console.log('Team ID:', teamId);

    // Quick check for email configuration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('❌ EMAIL SKIPPED: No email credentials configured');
      console.log('💡 Set EMAIL_USER and EMAIL_PASS in environment variables');
      return false;
    }

    // Simple transporter setup
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER ||"nordicpuffintechnologies@gmail.com",
        pass: process.env.EMAIL_PASS || "hqwikqbcivwdvjhp",
      }
    });

    const finalActualAmount = donation.actualAmount || donation.amount;

    const mailOptions = {
      from: `"Team Registration" <${process.env.EMAIL_USER}>`,
      to: donation.email,
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
      `
    };

    console.log('📤 Sending email now...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ EMAIL SENT SUCCESSFULLY:', info.messageId);
    console.log('📧 Email response:', info.response);
    
    return true;
    
  } catch (error) {
    console.error('❌ EMAIL FAILED:', error.message);
    console.error('Email error details:', {
      code: error.code,
      command: error.command
    });
    
    // Check for common email errors
    if (error.code === 'EAUTH') {
      console.error('🔐 Authentication failed - check email credentials');
    } else if (error.code === 'ECONNECTION') {
      console.error('🌐 Connection failed - check network/port settings');
    }
    
    return false;
  }
};

module.exports = {
  sendTeamConfirmationEmail,
};