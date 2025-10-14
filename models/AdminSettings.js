// backend/models/AdminSettings.js
const { Sequelize, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AdminSettings = sequelize.define('AdminSettings', {
    id: {
      type: DataTypes.STRING,
      defaultValue: 'default-settings',
      primaryKey: true,
    },
    contactPhone: {
      type: DataTypes.STRING,
      defaultValue: '+3XXXXXXXXX',
    },
    // Remove ticketPrice field
    // NEW: Team-based pricing fields
    pricingMode: {
      type: DataTypes.ENUM('per_person', 'per_team'),
      defaultValue: 'per_team',
    },
    pricePerPerson: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 10.00,
      validate: {
        min: 0
      }
    },
    pricePerTeam: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 20.00,
      validate: {
        min: 0
      }
    },
    registrationFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 20.00,
      validate: {
        min: 0 // Allow 0 registration fee
      }
    },
    pricingDescription: {
      type: DataTypes.TEXT,
      defaultValue: '1 team = 2 persons = €20.00 (€10 per person)',
    },
    adminEmail: {
      type: DataTypes.STRING,
      defaultValue: 'admin@example.com',
      validate: {
        isEmail: true
      }
    },
    orgName: {
      type: DataTypes.STRING,
      defaultValue: 'Your Organization',
    },
    logoUrl: {
      type: DataTypes.STRING,
    },
    logoPublicId: {
      type: DataTypes.STRING,
    },
    banners: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    bannerPublicIds: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
  }, {
    timestamps: true,
  });

  return AdminSettings;
};