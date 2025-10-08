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
    ticketPrice: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 2.00,
      validate: {
        min: 0.01
      }
    },
    adminEmail: {
      type: DataTypes.STRING,
      defaultValue: 'admin@example.com',
      validate: {
        isEmail: true
      }
    },
  }, {
    timestamps: true,
  });

  return AdminSettings;
};