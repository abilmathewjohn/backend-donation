const { Sequelize, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AdminSettings = sequelize.define('AdminSettings', {
    id: {
      type: DataTypes.STRING,
      defaultValue: 'default-settings',
      primaryKey: true,
    },
    // Organization Settings
    organizationName: {
      type: DataTypes.STRING,
      defaultValue: 'Quiz Program Organization',
    },
    organizationLogo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bannerImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    
    // Contact Settings
    contactPhone: {
      type: DataTypes.STRING,
      defaultValue: '+3XXXXXXXXX',
    },
    adminEmail: {
      type: DataTypes.STRING,
      defaultValue: 'admin@example.com',
      validate: {
        isEmail: true
      }
    },
    
    // Ticket Settings
    ticketPrice: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 2.00,
      validate: {
        min: 0.01
      }
    },
    
    // Program Options
    dioceseOptions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [
        'Trivandrum',
        'Kollam',
        'Thiruvalla',
        'Kottayam',
        'Kanjirappally',
        'Palai',
        'Ernakulam',
        'Kothamangalam',
        'Idukki',
        'Thrissur',
        'Palghat',
        'Calicut',
        'Sultan Bathery',
        'Tellicherry',
        'Mananthavady',
        'Kannur'
      ]
    },
    
    // How did you know options
    howDidYouKnowOptions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [
        'Social Media',
        'Friends',
        'Website',
        'Church',
        'Poster',
        'Newspaper',
        'Other'
      ]
    }
  }, {
    timestamps: true,
  });

  return AdminSettings;
};