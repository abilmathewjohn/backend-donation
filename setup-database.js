const { sequelize, Donation, PaymentLink, AdminSettings } = require('./models');

async function setupDatabase() {
  try {
    console.log('🔄 Setting up database...');
    
    // Sync database with force: true to recreate tables
    await sequelize.sync({ force: true });
    console.log('✅ Database tables created');
    
    // Create default admin settings
    await AdminSettings.create({
      id: 'default-settings',
      contactPhone: '+3XXXXXXXXX',
      ticketPrice: 2.00,
      adminEmail: 'admin@example.com'
    });
    console.log('✅ Default admin settings created');
    
    // Create sample payment link
    await PaymentLink.create({
      name: 'Revolut Payment',
      url: 'https://revolut.com/pay/sample',
      isActive: true
    });
    console.log('✅ Sample payment link created');
    
    console.log('🎉 Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();