/**
 * Test script to verify file creation flow
 * This script:
 * 1. Gets an existing project
 * 2. Sends a chat message to generate files
 * 3. Checks if files are created
 * 4. Verifies files appear in the database
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

async function testFileCreation() {
  console.log('🧪 Testing File Creation Flow\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Get authentication token (you'll need to provide this)
    // For testing, you can get it from browser cookies or use the auth API
    const authToken = process.env.AUTH_TOKEN || '';
    
    if (!authToken) {
      console.log('⚠️  No auth token provided. Using test mode (may fail if auth required)');
    }
    
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Cookie': `sb-access-token=${authToken}` } : {}),
    };
    
    // Step 2: Get list of projects
    console.log('\n📋 Step 1: Fetching projects...');
    const projectsRes = await fetch(`${BASE_URL}/api/app-projects`, {
      headers,
      credentials: 'include',
    });
    
    if (!projectsRes.ok) {
      throw new Error(`Failed to fetch projects: ${projectsRes.status} ${projectsRes.statusText}`);
    }
    
    const projects = await projectsRes.json();
    console.log(`✅ Found ${projects.length} project(s)`);
    
    if (projects.length === 0) {
      console.log('❌ No projects found. Please create a project first.');
      return;
    }
    
    // Use first project
    const project = projects[0];
    console.log(`📁 Using project: ${project.title} (ID: ${project.id})`);
    
    // Step 3: Get current files count
    console.log('\n📋 Step 2: Checking current files...');
    const filesRes = await fetch(`${BASE_URL}/api/app-projects/${project.id}/files`, {
      headers,
      credentials: 'include',
    });
    
    if (!filesRes.ok) {
      throw new Error(`Failed to fetch files: ${filesRes.status} ${filesRes.statusText}`);
    }
    
    const currentFiles = await filesRes.json();
    const initialFileCount = currentFiles.length;
    console.log(`✅ Current files: ${initialFileCount}`);
    console.log(`   Files: ${currentFiles.map(f => f.path).join(', ') || 'None'}`);
    
    // Step 4: Send chat message to generate files
    console.log('\n📋 Step 3: Sending chat message to generate files...');
    const testPrompt = `Create a simple portfolio app with:
- Header component with navigation
- Hero section with title and description
- About section
- Footer component

Use Tailwind CSS. Make it beautiful and responsive.`;
    
    console.log(`📝 Prompt: "${testPrompt}"`);
    
    const chatRes = await fetch(`${BASE_URL}/api/app-projects/${project.id}/chat`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        message: testPrompt,
      }),
    });
    
    if (!chatRes.ok) {
      const errorText = await chatRes.text();
      throw new Error(`Chat API failed: ${chatRes.status} ${chatRes.statusText}\n${errorText}`);
    }
    
    const chatData = await chatRes.json();
    console.log(`✅ Chat response received`);
    console.log(`   Response length: ${chatData.response?.length || 0} chars`);
    console.log(`   Files created: ${chatData.filesCreated?.length || 0}`);
    
    if (chatData.filesCreated && chatData.filesCreated.length > 0) {
      console.log('\n📁 Files created in response:');
      chatData.filesCreated.forEach((file, idx) => {
        const status = file.success ? '✅' : '❌';
        console.log(`   ${idx + 1}. ${status} ${file.path}${file.error ? ` (${file.error})` : ''}`);
      });
    } else {
      console.log('⚠️  No files created in response');
    }
    
    // Step 5: Wait a bit for database writes
    console.log('\n⏳ Step 4: Waiting 2 seconds for database writes...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 6: Check files again
    console.log('\n📋 Step 5: Checking files after generation...');
    const filesRes2 = await fetch(`${BASE_URL}/api/app-projects/${project.id}/files`, {
      headers,
      credentials: 'include',
    });
    
    if (!filesRes2.ok) {
      throw new Error(`Failed to fetch files: ${filesRes2.status} ${filesRes2.statusText}`);
    }
    
    const newFiles = await filesRes2.json();
    const finalFileCount = newFiles.length;
    const filesAdded = finalFileCount - initialFileCount;
    
    console.log(`✅ Final files: ${finalFileCount}`);
    console.log(`   Files added: ${filesAdded}`);
    
    if (filesAdded > 0) {
      console.log('\n📁 New files:');
      const newFilePaths = newFiles
        .filter(f => !currentFiles.some(cf => cf.path === f.path))
        .map(f => f.path);
      newFilePaths.forEach((path, idx) => {
        console.log(`   ${idx + 1}. ${path}`);
      });
    }
    
    // Step 7: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Project: ${project.title}`);
    console.log(`Initial files: ${initialFileCount}`);
    console.log(`Final files: ${finalFileCount}`);
    console.log(`Files added: ${filesAdded}`);
    console.log(`Files in response: ${chatData.filesCreated?.length || 0}`);
    console.log(`Successful in response: ${chatData.filesCreated?.filter(f => f.success).length || 0}`);
    
    if (filesAdded > 0) {
      console.log('\n✅ SUCCESS: Files were added to the project!');
    } else if (chatData.filesCreated && chatData.filesCreated.length > 0) {
      console.log('\n⚠️  WARNING: Files were created in response but not added to database');
      console.log('   This might be a timing issue or database error');
    } else {
      console.log('\n❌ FAILURE: No files were created');
      console.log('   Check the AI response format and file parsing logic');
    }
    
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testFileCreation();
