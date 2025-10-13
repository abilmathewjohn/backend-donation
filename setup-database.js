const syncDatabase = async () => {
  try {
    // Use alter: true to safely add missing columns without dropping data
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced successfully');
    
    // Create or update default admin settings
    try {
      const [settings, created] = await AdminSettings.findOrCreate({
        where: { id: 'default-settings' },
        defaults: {
          contactPhone: '+3XXXXXXXXX',
          ticketPrice: 2.00,
          pricingMode: 'per_team',
          pricePerPerson: 10.00,
          pricePerTeam: 20.00,
          registrationFee: 20.00,
          pricingDescription: '1 team = €20.00 (€10 per person), Registration fee: €20.00',
          adminEmail: 'admin@example.com',
          orgName: 'Your Organization',
          logoUrl: null,
          logoPublicId: null,
          banners: [],
          bannerPublicIds: []
        }
      });
      
      if (!created) {
        // Update existing settings with new fields if they're null
        await settings.update({
          pricingMode: settings.pricingMode || 'per_team',
          pricePerPerson: settings.pricePerPerson || 10.00,
          pricePerTeam: settings.pricePerTeam || 20.00,
          registrationFee: settings.registrationFee || 20.00,
          pricingDescription: settings.pricingDescription || '1 team = €20.00 (€10 per person), Registration fee: €20.00'
        });
      }
      
      console.log(created ? '✅ Default admin settings created' : '✅ Admin settings updated');
    } catch (settingsError) {
      console.error('Error creating admin settings:', settingsError);
    }
  } catch (error) {
    console.error('❌ Error syncing database:', error);
  }
};