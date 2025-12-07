// Test database connection script
// Run with: node scripts/test-db-connection.js

// Try to load .env.local first, fallback to .env
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  try {
    require('dotenv').config({ path: '.env' });
  } catch (e2) {
    // If dotenv not available, rely on environment variables
  }
}

const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  console.log('🔍 Testing Database Connection...\n');
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in .env.local');
    console.log('\nPlease add DATABASE_URL to your .env.local file:');
    console.log('DATABASE_URL="postgresql://user:password@host:port/database"');
    process.exit(1);
  }

  // Mask password in URL for display
  const maskedUrl = process.env.DATABASE_URL.replace(
    /:\/\/[^:]+:[^@]+@/,
    '://***:***@'
  );
  console.log(`📡 Connection URL: ${maskedUrl}\n`);

  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    console.log('⏳ Attempting to connect...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Successfully connected to database!\n');

    // Test a simple query
    console.log('⏳ Testing query...');
    const userCount = await prisma.user.count();
    console.log(`✅ Query successful! Found ${userCount} users in database.\n`);

    // Check if AppProject table exists
    try {
      const projectCount = await prisma.appProject.count();
      console.log(`✅ AppProject table exists! Found ${projectCount} projects.\n`);
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('⚠️  AppProject table does not exist. You may need to run migrations.\n');
        console.log('Run: pnpm prisma migrate dev --name add_app_builder_models\n');
      } else {
        throw error;
      }
    }

    console.log('🎉 Database connection test passed!');
  } catch (error) {
    console.error('\n❌ Database connection failed!\n');
    console.error('Error:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Possible solutions:');
      console.error('1. Check your DATABASE_URL in .env.local');
      console.error('2. Verify your database password is correct');
      console.error('3. If using Supabase, get a fresh connection string from:');
      console.error('   Settings → Database → Connection string');
      console.error('4. Make sure you\'re using the pooled connection URL for app queries');
    } else if (error.message.includes('does not exist')) {
      console.error('\n💡 The database or schema does not exist.');
      console.error('Run: pnpm prisma migrate dev');
    } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Cannot reach the database server.');
      console.error('1. Check if the database server is running');
      console.error('2. Verify the host and port in DATABASE_URL');
      console.error('3. Check your network/firewall settings');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

