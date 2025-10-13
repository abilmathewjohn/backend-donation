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
      validate: {
        notEmpty: true,
        len: [1, 25]
      }
    },
    teammateName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 25]
      }
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    contactNumber1: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 11]
      }
    },
    contactNumber2: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 11]
      }
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
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 11]
      }
    },
    zone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 15]
      }
    },
    howKnown: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    otherHowKnown: {
      type: DataTypes.STRING,
      allowNull: true
    },
    diocese: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    previousParticipation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    // UPDATED: Changed from tickets to team registration
    teamRegistration: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    actualAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    paymentScreenshot: {
      type: DataTypes.STRING, // Cloudinary URL
      allowNull: false,
    },
    paymentScreenshotPublicId: {
      type: DataTypes.STRING, // Cloudinary public_id for deletion
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
    // UPDATED: For team-based system
    teamTickets: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
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