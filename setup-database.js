// In your database setup file
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
          registrationFee: 0.00,
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