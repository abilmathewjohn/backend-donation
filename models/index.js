const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

require('dotenv').config();

// Initialize Sequelize
let sequelize;

try {
  sequelize = new Sequelize(process.env.DB_URL || 'postgresql://localhost:5432/donations', {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    retry: {
      max: 5,
      timeout: 60000
    }
  });
} catch (error) {
  console.error('Error creating Sequelize instance:', error);
  process.exit(1);
}

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to database:', error.message);
    console.log('Please check your DB_URL in .env file');
    console.log('Current DB_URL:', process.env.DB_URL ? 'Set (hidden for security)' : 'Not set');
  }
};

testConnection();

// Import models
const Donation = require('./Donation')(sequelize);
const PaymentLink = require('./PaymentLink')(sequelize);
const AdminSettings = require('./AdminSettings')(sequelize);
const EmailLog = require('./EmailLog')(sequelize); // Add EmailLog import

// Sync database
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced successfully');
    
    // Create default admin settings
    try {
      const [settings, created] = await AdminSettings.findOrCreate({
        where: { id: 'default-settings' },
        defaults: {
          contactPhone: '+3XXXXXXXXX',
          pricingMode: 'per_team',
          pricePerPerson: 10.00,
          pricePerTeam: 20.00,
          registrationFee: 20.00,
          pricingDescription: '1 team = 2 persons = €20.00 (€10 per person)',
          adminEmail: 'admin@example.com',
          orgName: 'Your Organization',
          logoUrl: null,
          logoPublicId: null,
          banners: [],
          bannerPublicIds: []
        }
      });
      
      if (created) {
        console.log('✅ Default admin settings created');
      } else {
        console.log('✅ Admin settings already exist');
      }
    } catch (settingsError) {
      console.error('Error creating admin settings:', settingsError);
    }
  } catch (error) {
    console.error('❌ Error syncing database:', error);
  }
};

syncDatabase();

// Add associations
Donation.hasMany(EmailLog, { 
  foreignKey: 'donationId', 
  as: 'emailLogs',
  onDelete: 'CASCADE'
});

EmailLog.belongsTo(Donation, { 
  foreignKey: 'donationId', 
  as: 'donation'
});

module.exports = {
  sequelize,
  Donation,
  PaymentLink,
  AdminSettings,
  EmailLog, 
};