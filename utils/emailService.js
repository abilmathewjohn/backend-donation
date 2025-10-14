// backend/utils/emailService.js
const nodemailer = require('nodemailer');

const sendTeamConfirmationEmail = async (donation, teamId) => {
  let transporter;
  
  try {
    console.log('📧 EMAIL ATTEMPT STARTED - Railway Environment');
    console.log('To:', donation.email);
    console.log('Team ID:', teamId);

    // Enhanced environment variable check
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    console.log('Email config check:', {
      hasUser: !!emailUser,
      hasPass: !!emailPass,
      userLength: emailUser ? emailUser.length : 0,
      env: process.env.NODE_ENV
    });

    if (!emailUser || !emailPass) {
      console.error('❌ EMAIL CREDENTIALS MISSING');
      console.error('EMAIL_USER:', emailUser ? 'Set' : 'Not set');
      console.error('EMAIL_PASS:', emailPass ? 'Set' : 'Not set');
      return false;
    }

    // **RAILWAY-SPECIFIC CONFIGURATION**
    const transporterConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // Use TLS
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      // **CRITICAL FOR RAILWAY**
      tls: {
        rejectUnauthorized: false // May be needed in some environments
      },
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 30000,
      socketTimeout: 30000
    };

    console.log('📧 Transporter config:', {
      host: transporterConfig.host,
      port: transporterConfig.port,
      user: transporterConfig.auth.user.substring(0, 3) + '...'
    });

    transporter = nodemailer.createTransport(transporterConfig);

    // **VERIFY CONNECTION FIRST**
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified');

    const finalActualAmount = donation.actualAmount || donation.amount || 0;

    const mailOptions = {
      from: `"Team Registration" <${emailUser}>`,
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
    console.log('✅ EMAIL SENT SUCCESSFULLY');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response.substring(0, 100) + '...');
    
    return true;
    
  } catch (error) {
    console.error('❌ EMAIL FAILED:', error.message);
    console.error('Full error:', error);
    
    // Enhanced error diagnostics
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.command) {
      console.error('Failed command:', error.command);
    }
    
    // Common error scenarios
    if (error.code === 'EAUTH') {
      console.error('🔐 AUTHENTICATION FAILED - Check:');
      console.error('   • Email username/password');
      console.error('   • App passwords for Gmail');
      console.error('   • SMTP settings');
    } else if (error.code === 'ECONNECTION') {
      console.error('🌐 CONNECTION FAILED - Check:');
      console.error('   • SMTP host/port');
      console.error('   • Firewall settings');
      console.error('   • Network connectivity');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('⏰ TIMEOUT - Increase timeout settings');
    }
    
    return false;
  } finally {
    // Close transporter to prevent connection leaks
    if (transporter) {
      transporter.close();
    }
  }
};

module.exports = {
  sendTeamConfirmationEmail,
};