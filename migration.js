// check-db.js
const { sequelize } = require('./models');

const checkDatabase = async () => {
  try {
    console.log('🔍 Checking database structure...');
    
    // Check AdminSettings table structure
    const result = await sequelize.query(`
      SELECT column_name, data_type, column_default, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'AdminSettings' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 AdminSettings columns:');
    result[0].forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type}) - Default: ${col.column_default}`);
    });

    // Check current AdminSettings data
    const settingsResult = await sequelize.query('SELECT * FROM "AdminSettings" WHERE id = \'default-settings\';');
    console.log('📄 Current AdminSettings data:', JSON.stringify(settingsResult[0][0], null, 2));

  } catch (error) {
    console.error('Error checking database:', error);
  }
};

checkDatabase();