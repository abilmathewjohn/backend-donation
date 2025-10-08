const nodemailer = require('nodemailer');

// Create a simple console-based email service for development
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

    // If you want to send actual emails, configure this:
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

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
              <p>${ticketNumbers.join(', ')}</p>
            </div>
            
            <p>Please keep this email safe as it contains your ticket information.</p>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Actual email sent:', info.messageId);
    }

    return true;
  } catch (error) {
    console.error('Error in email service:', error);
    return false;
  }
};

module.exports = {
  sendTicketEmail,
};