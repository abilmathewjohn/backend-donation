// backend/models/Donation.js
const { Sequelize, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Donation = sequelize.define('Donation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
      participantName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  teammateName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  contactNumber1: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  contactNumber2: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  whatsappNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  zone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  howKnown: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  otherHowKnown: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  diocese: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  previousParticipation: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
amount: {
  type: DataTypes.DECIMAL(10, 2), 
  allowNull: false,
},
  paymentScreenshot: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  paymentScreenshotPublicId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  paymentLinkUsed: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'rejected'),
    defaultValue: 'pending',
  },
  teamRegistration: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  teamId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'Donations',
  timestamps: true,

});
  return Donation;
};