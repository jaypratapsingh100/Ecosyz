/**
 * Diagnostic script to check user and project data in production
 * 
 * Usage:
 * 1. Set DATABASE_URL to production database
 * 2. Run: node scripts/diagnose-production-user.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function diagnoseUser(email = 'tesla@gmail.com') {
  try {
    console.log(`\n🔍 Diagnosing user: ${email}\n`);
    console.log('=' .repeat(60));

    // 1. Check if user exists
    console.log('\n1️⃣ Checking if user exists in database...');
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        appProjects: {
          include: {
            files: true,
            images: true,
          },
        },
      },
    });

    if (!user) {
      console.log('❌ User NOT found in database');
      console.log('\n💡 Solution: User needs to log in at least once in production');
      console.log('   The ensureUserInDb function will create the user record automatically.');
      return;
    }

    console.log('✅ User found!');
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Supabase ID: ${user.supabaseId}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Name: ${user.name || 'N/A'}`);
    console.log(`   - Created: ${user.createdAt}`);

    // 2. Check projects
    console.log(`\n2️⃣ Checking projects for this user...`);
    const projectCount = user.appProjects.length;
    console.log(`   Found ${projectCount} project(s)`);

    if (projectCount === 0) {
      console.log('\n⚠️  No projects found for this user');
      console.log('\n💡 Possible reasons:');
      console.log('   - Projects were created in local database only');
      console.log('   - Projects belong to a different user account');
      console.log('   - Projects were deleted');
      return;
    }

    // 3. List projects with file counts
    console.log('\n3️⃣ Project details:');
    user.appProjects.forEach((project, index) => {
      console.log(`\n   Project ${index + 1}:`);
      console.log(`   - ID: ${project.id}`);
      console.log(`   - Title: ${project.title}`);
      console.log(`   - Type: ${project.type || 'N/A'}`);
      console.log(`   - Files: ${project.files.length}`);
      console.log(`   - Images: ${project.images.length}`);
      console.log(`   - Created: ${project.createdAt}`);
      console.log(`   - Updated: ${project.updatedAt}`);
      
      if (project.files.length > 0) {
        console.log(`   - File paths:`);
        project.files.slice(0, 5).forEach(file => {
          console.log(`     • ${file.path} (${file.name})`);
        });
        if (project.files.length > 5) {
          console.log(`     ... and ${project.files.length - 5} more`);
        }
      }
    });

    // 4. Check for orphaned projects (projects without owner)
    console.log('\n4️⃣ Checking for orphaned projects...');
    const allProjects = await prisma.appProject.findMany({
      where: {
        ownerId: {
          not: user.id,
        },
      },
      select: {
        id: true,
        title: true,
        ownerId: true,
      },
    });
    
    if (allProjects.length > 0) {
      console.log(`   Found ${allProjects.length} project(s) owned by other users`);
    } else {
      console.log('   No orphaned projects found');
    }

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   ✅ User exists: Yes`);
    console.log(`   ✅ Projects: ${projectCount}`);
    console.log(`   ✅ Total files: ${user.appProjects.reduce((sum, p) => sum + p.files.length, 0)}`);
    console.log(`   ✅ Total images: ${user.appProjects.reduce((sum, p) => sum + p.images.length, 0)}`);

    if (projectCount > 0) {
      console.log('\n✅ User has projects and files in the database');
      console.log('\n💡 If files are not showing in production UI:');
      console.log('   1. Check browser console for errors');
      console.log('   2. Verify authentication is working');
      console.log('   3. Check API route logs: /api/app-projects/[id]/files');
      console.log('   4. Verify DATABASE_URL is correct in production');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Check:');
    console.error('   1. DATABASE_URL is set correctly');
    console.error('   2. Database is accessible');
    console.error('   3. Prisma client is generated (run: npx prisma generate)');
  } finally {
    await prisma.$disconnect();
  }
}

// Run diagnosis
const email = process.argv[2] || 'tesla@gmail.com';
diagnoseUser(email).catch(console.error);
