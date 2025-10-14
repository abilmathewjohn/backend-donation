// backend/utils/emailService.js
const nodemailer = require('nodemailer');

const sendTeamConfirmationEmail = async (donation, teamId) => {
  let transporter;
  
  try {
    console.log('📧 EMAIL ATTEMPT STARTED - Railway SMTP');
    console.log('To:', donation.email);
    console.log('Team ID:', teamId);

    // **RAILWAY SMTP CONFIGURATION**
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || "nordicpuffintechnologies@gmail.com",
        pass: process.env.EMAIL_PASS || "hqwikqbcivwdvjhp",
      },
      // **CRITICAL FOR RAILWAY**
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 60000,
      socketTimeout: 60000
    };

    console.log('📧 Using SMTP config:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      user: smtpConfig.auth.user ? smtpConfig.auth.user.substring(0, 3) + '...' : 'not set'
    });

    transporter = nodemailer.createTransport(smtpConfig);

    // **VERIFY CONNECTION WITH TIMEOUT**
    console.log('🔍 Verifying SMTP connection...');
    await Promise.race([
      transporter.verify(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP verification timeout')), 30000)
      )
    ]);
    console.log('✅ SMTP connection verified');

    const finalActualAmount = donation.actualAmount || donation.amount || 0;

    const mailOptions = {
      from: `"Team Registration" <${process.env.FROM_EMAIL || process.env.EMAIL_USER}>`,
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
      `
    };

    console.log('📤 Sending email now...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ EMAIL SENT SUCCESSFULLY');
    console.log('Message ID:', info.messageId);
    
    return true;
    
  } catch (error) {
    console.error('❌ EMAIL FAILED:', error.message);
    console.error('Error details:', {
      code: error.code,
      command: error.command
    });
    
    return false;
  } finally {
    if (transporter) {
      transporter.close();
    }
  }
};

module.exports = {
  sendTeamConfirmationEmail,
};