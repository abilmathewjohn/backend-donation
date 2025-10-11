const { Sequelize, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Donation = sequelize.define('Donation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // Organization details
    organizationName: {
      type: DataTypes.STRING,
      defaultValue: 'Our Organization',
    },
    organizationLogo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bannerImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    
    // Personal Information
    fullName: {
      type: DataTypes.STRING(25),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 25]
      }
    },
    teammateName: {
      type: DataTypes.STRING(25),
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    contactNumber1: {
      type: DataTypes.STRING(11),
      allowNull: false,
    },
    contactNumber2: {
      type: DataTypes.STRING(11),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    whatsappNumber: {
      type: DataTypes.STRING(11),
      allowNull: false,
    },
    zone: {
      type: DataTypes.STRING(15),
      allowNull: false,
    },
    
    // Program Information
    howDidYouKnow: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    howDidYouKnowOther: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dioceseInKerala: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    previouslyParticipated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    
    // Donation Information
    tickets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 50
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    actualAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    ticketsAssigned: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    ticketNumbers: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
  }, {
    timestamps: true,
  });

  return Donation;
};