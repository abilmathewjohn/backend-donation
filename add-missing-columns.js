const { sequelize } = require('./models');

async function addMissingColumns() {
  try {
    console.log('🔄 Adding missing columns...');
    
    // Add actualAmount column
    await sequelize.query(`
      ALTER TABLE "Donations" 
      ADD COLUMN IF NOT EXISTS "actualAmount" DECIMAL(10,2);
    `);
    console.log('✅ Added actualAmount column');
    
    // Add ticketsAssigned column
    await sequelize.query(`
      ALTER TABLE "Donations" 
      ADD COLUMN IF NOT EXISTS "ticketsAssigned" INTEGER;
    `);
    console.log('✅ Added ticketsAssigned column');
    
    // Add ticketNumbers column (as JSONB for PostgreSQL)
    await sequelize.query(`
      ALTER TABLE "Donations" 
      ADD COLUMN IF NOT EXISTS "ticketNumbers" JSONB DEFAULT '[]';
    `);
    console.log('✅ Added ticketNumbers column');
    
    console.log('🎉 All missing columns added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add columns:', error);
    process.exit(1);
  }
}

addMissingColumns();