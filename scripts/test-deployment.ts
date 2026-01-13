/**
 * Test script for Vercel deployment endpoints
 * 
 * Usage:
 *   pnpm tsx scripts/test-deployment.ts [project-id]
 * 
 * Make sure you have:
 *   1. Set VERCEL_API_TOKEN in .env.local
 *   2. Created a project with files in the app builder
 *   3. Have a valid auth session
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const PROJECT_ID = process.argv[2] || 'your-project-id';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testDeployment() {
  console.log('🚀 Testing Vercel Deployment...\n');

  // Check environment variables
  if (!process.env.VERCEL_API_TOKEN) {
    console.error('❌ VERCEL_API_TOKEN is not set in .env.local');
    console.log('   Get it from: https://vercel.com/account/tokens\n');
    process.exit(1);
  }

  console.log('✅ Environment variables configured');
  console.log(`📦 Project ID: ${PROJECT_ID}`);
  console.log(`🌐 Base URL: ${BASE_URL}\n`);

  // Test deployment endpoint
  console.log('1️⃣ Testing deployment endpoint...');
  try {
    const deployResponse = await fetch(`${BASE_URL}/api/app-projects/${PROJECT_ID}/deploy-vercel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Note: In real usage, you'd need to include auth cookies
      // This is just a structure test
    });

    if (deployResponse.ok) {
      const result = await deployResponse.json();
      console.log('✅ Deployment successful!');
      console.log(`   URL: ${result.url}`);
      console.log(`   Claim URL: ${result.claimUrl}`);
      console.log(`   Status: ${result.status}\n`);

      // Test domain endpoint if deployment succeeded
      if (result.url) {
        console.log('2️⃣ Testing domain configuration endpoint...');
        console.log('   (Skipping - requires valid domain and GoDaddy credentials)');
        console.log('   To test: POST /api/app-projects/[id]/deploy-domain');
        console.log('   Body: { "domain": "your-domain.com", "useYourAccount": true }\n');
      }
    } else {
      const error = await deployResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Deployment failed:');
      console.error(`   Status: ${deployResponse.status}`);
      console.error(`   Error: ${error.error || error.message}\n`);
      
      if (deployResponse.status === 401) {
        console.log('💡 Tip: Make sure you are authenticated');
      }
      if (deployResponse.status === 500 && error.message?.includes('VERCEL_API_TOKEN')) {
        console.log('💡 Tip: Check your VERCEL_API_TOKEN in .env.local');
      }
    }
  } catch (error: any) {
    console.error('❌ Request failed:');
    console.error(`   ${error.message}\n`);
    console.log('💡 Make sure your development server is running: pnpm dev');
  }

  console.log('\n📝 Next steps:');
  console.log('   1. Create a project in the app builder');
  console.log('   2. Add some files (use AI chat to generate code)');
  console.log('   3. Test deployment from the UI');
  console.log('   4. Test domain configuration with a real domain');
}

// Run test
testDeployment().catch(console.error);





