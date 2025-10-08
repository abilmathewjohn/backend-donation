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

// Sync database
const syncDatabase = async () => {
  try {
    await sequelize.sync({ force: false });
    console.log('✅ Database synced successfully');
    
    // Create default admin settings
    try {
      const [settings, created] = await AdminSettings.findOrCreate({
        where: { id: 'default-settings' },
        defaults: {
          contactPhone: '+3XXXXXXXXX',
          ticketPrice: 2.00,
          adminEmail: 'admin@example.com'
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

module.exports = {
  sequelize,
  Donation,
  PaymentLink,
  AdminSettings,
};