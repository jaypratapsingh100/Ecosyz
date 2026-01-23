/**
 * Database-level test for file creation
 * This test uses Prisma to directly check the database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testFileCreation() {
  console.log('🧪 Testing File Creation - Database Level\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Get a project
    console.log('\n📋 Step 1: Finding a project...');
    const project = await prisma.appProject.findFirst({
      include: {
        files: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    if (!project) {
      console.log('❌ No projects found. Please create a project first.');
      return;
    }
    
    console.log(`✅ Found project: ${project.title} (ID: ${project.id})`);
    console.log(`   Current files: ${project.files.length}`);
    console.log(`   Files: ${project.files.map(f => f.path).join(', ') || 'None'}`);
    
    const initialFileCount = project.files.length;
    const initialFilePaths = new Set(project.files.map(f => f.path));
    
    // Step 2: Simulate file creation by creating a test file
    console.log('\n📋 Step 2: Creating test file...');
    const testFilePath = `src/components/TestComponent_${Date.now()}.jsx`;
    const testFileContent = `import React from 'react';

function TestComponent() {
  return (
    <div className="p-4 bg-blue-500 text-white">
      <h2>Test Component</h2>
      <p>This is a test component created at ${new Date().toISOString()}</p>
    </div>
  );
}

export default TestComponent;`;
    
    try {
      const createdFile = await prisma.appFile.upsert({
        where: {
          projectId_path: {
            projectId: project.id,
            path: testFilePath,
          },
        },
        update: {
          content: testFileContent,
          language: 'javascript',
          name: testFilePath.split('/').pop(),
        },
        create: {
          projectId: project.id,
          path: testFilePath,
          name: testFilePath.split('/').pop(),
          content: testFileContent,
          language: 'javascript',
          isMain: false,
        },
      });
      
      console.log(`✅ Test file created: ${testFilePath}`);
      console.log(`   File ID: ${createdFile.id}`);
      console.log(`   Content length: ${createdFile.content.length} chars`);
      
      // Step 3: Verify file was added
      console.log('\n📋 Step 3: Verifying file was added...');
      const updatedProject = await prisma.appProject.findUnique({
        where: { id: project.id },
        include: {
          files: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      
      const finalFileCount = updatedProject.files.length;
      const filesAdded = finalFileCount - initialFileCount;
      
      console.log(`✅ Final files: ${finalFileCount}`);
      console.log(`   Files added: ${filesAdded}`);
      
      // Check if our test file is there
      const testFileExists = updatedProject.files.some(f => f.path === testFilePath);
      
      if (testFileExists) {
        console.log(`✅ Test file found in database: ${testFilePath}`);
      } else {
        console.log(`❌ Test file NOT found in database`);
      }
      
      // Step 4: List new files
      const newFiles = updatedProject.files.filter(f => !initialFilePaths.has(f.path));
      if (newFiles.length > 0) {
        console.log('\n📁 New files in database:');
        newFiles.forEach((file, idx) => {
          console.log(`   ${idx + 1}. ${file.path} (${file.content.length} chars)`);
        });
      }
      
      // Step 5: Cleanup - remove test file
      console.log('\n📋 Step 4: Cleaning up test file...');
      await prisma.appFile.delete({
        where: {
          projectId_path: {
            projectId: project.id,
            path: testFilePath,
          },
        },
      });
      console.log(`✅ Test file deleted`);
      
      // Step 6: Summary
      console.log('\n' + '='.repeat(60));
      console.log('📊 TEST SUMMARY');
      console.log('='.repeat(60));
      console.log(`Project: ${project.title}`);
      console.log(`Initial files: ${initialFileCount}`);
      console.log(`After creation: ${finalFileCount}`);
      console.log(`Files added: ${filesAdded}`);
      console.log(`Test file created: ${testFileExists ? '✅' : '❌'}`);
      console.log(`Test file deleted: ✅`);
      
      if (filesAdded > 0 && testFileExists) {
        console.log('\n✅ SUCCESS: File creation and database operations work correctly!');
        console.log('   - Files can be created in database');
        console.log('   - Files can be retrieved');
        console.log('   - Files can be deleted');
        console.log('\n💡 The file creation flow should work when AI generates files.');
      } else {
        console.log('\n⚠️  WARNING: File creation test had issues');
        console.log('   Check database connection and Prisma setup');
      }
      
      console.log('='.repeat(60));
      
    } catch (dbError) {
      console.error('\n❌ Database error:', dbError.message);
      throw dbError;
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testFileCreation();
