const { sequelize } = require('./models');

async function updateDatabase() {
  try {
    console.log('🔄 Updating database for Cloudinary...');
    
    // Add paymentScreenshotPublicId column
    await sequelize.query(`
      ALTER TABLE "Donations" 
      ADD COLUMN IF NOT EXISTS "paymentScreenshotPublicId" VARCHAR(255);
    `);
    console.log('✅ Added paymentScreenshotPublicId column');
    
    console.log('🎉 Database updated for Cloudinary!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to update database:', error);
    process.exit(1);
  }
}

updateDatabase();