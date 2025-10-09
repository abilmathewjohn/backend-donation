const nodemailer = require('nodemailer');

const sendTicketEmail = async (donation, ticketNumbers) => {
  try {
    console.log('=== EMAIL NOTIFICATION ===');
    console.log('To:', donation.email);
    console.log('Subject: Your Donation Tickets - Confirmed!');
    console.log('Donor:', donation.fullName);
    console.log('Actual Amount:', donation.actualAmount || donation.amount);
    console.log('Tickets Assigned:', donation.ticketsAssigned || ticketNumbers.length);
    console.log('Ticket Numbers:', ticketNumbers.join(', '));
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
    const finalTicketsAssigned = donation.ticketsAssigned || ticketNumbers.length;

    const mailOptions = {
      from: `"Donation System" <${process.env.EMAIL_USER}>`,
      to: donation.email,
      subject: 'Your Donation Tickets - Confirmed!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Thank You for Your Donation!</h2>
          <p>Dear ${donation.fullName},</p>
          <p>Your payment has been confirmed. Here are your ticket details:</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Donation Summary</h3>
            <p><strong>Requested Tickets:</strong> ${donation.tickets}</p>
            <p><strong>Requested Amount:</strong> €${donation.amount}</p>
            <p><strong>Actual Amount Paid:</strong> €${finalActualAmount}</p>
            <p><strong>Tickets Assigned:</strong> ${finalTicketsAssigned}</p>
          </div>
          
          <div style="background: #f0fff4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Your Ticket Numbers</h3>
            <p style="font-family: monospace; font-size: 16px; font-weight: bold;">${ticketNumbers.join(', ')}</p>
          </div>
          
          <p>Please keep this email safe as it contains your ticket information.</p>
          <p>If you have any questions, please contact us.</p>
        </div>
      `,
      text: `
        Thank You for Your Donation!
        
        Dear ${donation.fullName},
        
        Your payment has been confirmed. Here are your ticket details:
        
        DONATION SUMMARY:
        - Requested Tickets: ${donation.tickets}
        - Requested Amount: €${donation.amount}
        - Actual Amount Paid: €${finalActualAmount}
        - Tickets Assigned: ${finalTicketsAssigned}
        
        YOUR TICKET NUMBERS:
        ${ticketNumbers.join(', ')}
        
        Please keep this email safe as it contains your ticket information.
      `
    };

    console.log('📤 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Actual email sent successfully:', info.messageId);
    console.log('📧 Email response:', info.response);
    
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command
    });
    return false;
  }
};

module.exports = {
  sendTicketEmail,
};