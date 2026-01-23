/**
 * Migrate App Projects from Local to Production Database
 * 
 * This script copies all projects, files, and images for a user from local to production.
 * 
 * Usage:
 * 1. Set LOCAL_DATABASE_URL and PROD_DATABASE_URL environment variables
 * 2. Run: node scripts/migrate-projects-to-production.js tesla@gmail.com
 * 
 * IMPORTANT: Make sure the user has logged in to production at least once
 * so their user record exists in the production database.
 */

const { PrismaClient } = require('@prisma/client');

// Create two separate Prisma clients for local and production
const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.LOCAL_DATABASE_URL,
    },
  },
  log: ['error', 'warn'],
});

const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.PROD_DATABASE_URL,
    },
  },
  log: ['error', 'warn'],
});

async function migrateProjects(email) {
  try {
    console.log(`\n🚀 Migrating projects for: ${email}\n`);
    console.log('='.repeat(60));

    // Step 1: Get user from local database
    console.log('\n1️⃣ Fetching user from LOCAL database...');
    const localUser = await localPrisma.user.findUnique({
      where: { email },
      include: {
        appProjects: {
          include: {
            files: true,
            images: true,
            chats: true,
          },
        },
      },
    });

    if (!localUser) {
      console.log('❌ User not found in LOCAL database');
      console.log(`   Email: ${email}`);
      return;
    }

    console.log('✅ User found in LOCAL database');
    console.log(`   - Local User ID: ${localUser.id}`);
    console.log(`   - Supabase ID: ${localUser.supabaseId}`);
    console.log(`   - Projects: ${localUser.appProjects.length}`);

    if (localUser.appProjects.length === 0) {
      console.log('\n⚠️  No projects to migrate');
      return;
    }

    // Step 2: Get user from production database
    console.log('\n2️⃣ Fetching user from PRODUCTION database...');
    const prodUser = await prodPrisma.user.findUnique({
      where: { email },
    });

    if (!prodUser) {
      console.log('❌ User NOT found in PRODUCTION database');
      console.log('\n💡 SOLUTION:');
      console.log('   1. Visit your production site (e.g., https://openidea.world)');
      console.log(`   2. Log in with ${email}`);
      console.log('   3. This will create the user record automatically');
      console.log('   4. Then run this script again');
      return;
    }

    console.log('✅ User found in PRODUCTION database');
    console.log(`   - Production User ID: ${prodUser.id}`);
    console.log(`   - Supabase ID: ${prodUser.supabaseId}`);

    // Verify Supabase IDs match
    if (localUser.supabaseId !== prodUser.supabaseId) {
      console.log('\n⚠️  WARNING: Supabase IDs do not match!');
      console.log(`   Local: ${localUser.supabaseId}`);
      console.log(`   Prod:  ${prodUser.supabaseId}`);
      console.log('\n   This might cause issues. Proceeding anyway...');
    }

    // Step 3: Check existing projects in production
    console.log('\n3️⃣ Checking existing projects in PRODUCTION...');
    const existingProjects = await prodPrisma.appProject.findMany({
      where: { ownerId: prodUser.id },
      select: { id: true, title: true },
    });

    console.log(`   Found ${existingProjects.length} existing project(s) in production`);
    if (existingProjects.length > 0) {
      console.log('   Existing projects:');
      existingProjects.forEach(p => {
        console.log(`     - ${p.title} (${p.id})`);
      });
    }

    // Step 4: Migrate each project
    console.log('\n4️⃣ Migrating projects...\n');

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const localProject of localUser.appProjects) {
      try {
        // Check if project already exists (by title and owner)
        const existing = await prodPrisma.appProject.findFirst({
          where: {
            ownerId: prodUser.id,
            title: localProject.title,
          },
        });

        if (existing) {
          console.log(`   ⏭️  Skipping "${localProject.title}" (already exists)`);
          skippedCount++;
          continue;
        }

        console.log(`   📦 Migrating "${localProject.title}"...`);

        // Create project in production
        const prodProject = await prodPrisma.appProject.create({
          data: {
            title: localProject.title,
            description: localProject.description,
            type: localProject.type,
            framework: localProject.framework,
            ownerId: prodUser.id,
            workspaceId: localProject.workspaceId,
            config: localProject.config,
            questionnaireData: localProject.questionnaireData,
            appType: localProject.appType,
            targetAudience: localProject.targetAudience,
            designStyle: localProject.designStyle,
            colorScheme: localProject.colorScheme,
            layoutStyle: localProject.layoutStyle,
            requiredFeatures: localProject.requiredFeatures,
            brandName: localProject.brandName,
            tagline: localProject.tagline,
            keyPoints: localProject.keyPoints,
            deploymentUrl: localProject.deploymentUrl,
            deploymentStatus: localProject.deploymentStatus,
            deploymentPlatform: localProject.deploymentPlatform,
            deploymentId: localProject.deploymentId,
            claimUrl: localProject.claimUrl,
            deployedAt: localProject.deployedAt,
            createdAt: localProject.createdAt,
            updatedAt: localProject.updatedAt,
          },
        });

        console.log(`      ✅ Project created (ID: ${prodProject.id})`);

        // Migrate files
        if (localProject.files.length > 0) {
          console.log(`      📄 Migrating ${localProject.files.length} file(s)...`);
          await prodPrisma.appFile.createMany({
            data: localProject.files.map(file => ({
              projectId: prodProject.id,
              path: file.path,
              name: file.name,
              content: file.content,
              language: file.language,
              isMain: file.isMain,
              createdAt: file.createdAt,
              updatedAt: file.updatedAt,
            })),
          });
          console.log(`      ✅ Files migrated`);
        }

        // Migrate images
        if (localProject.images.length > 0) {
          console.log(`      🖼️  Migrating ${localProject.images.length} image(s)...`);
          await prodPrisma.appImage.createMany({
            data: localProject.images.map(image => ({
              projectId: prodProject.id,
              url: image.url,
              name: image.name,
              type: image.type,
              createdAt: image.createdAt,
              updatedAt: image.updatedAt,
            })),
          });
          console.log(`      ✅ Images migrated`);
        }

        // Migrate chats (if any)
        if (localProject.chats.length > 0) {
          console.log(`      💬 Migrating ${localProject.chats.length} chat(s)...`);
          await prodPrisma.appChat.createMany({
            data: localProject.chats.map(chat => ({
              projectId: prodProject.id,
              messages: chat.messages,
              createdAt: chat.createdAt,
              updatedAt: chat.updatedAt,
            })),
          });
          console.log(`      ✅ Chats migrated`);
        }

        migratedCount++;
        console.log(`      ✨ "${localProject.title}" migration complete!\n`);

      } catch (error) {
        console.error(`      ❌ Error migrating "${localProject.title}":`, error.message);
        errorCount++;
      }
    }

    // Step 5: Summary
    console.log('='.repeat(60));
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount} project(s)`);
    console.log(`   ⏭️  Skipped: ${skippedCount} project(s)`);
    console.log(`   ❌ Errors: ${errorCount} project(s)`);
    console.log(`   📦 Total: ${localUser.appProjects.length} project(s)`);

    if (migratedCount > 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\n💡 Next steps:');
      console.log('   1. Log in to production with tesla@gmail.com');
      console.log('   2. Navigate to App Builder');
      console.log('   3. Your projects should now be visible');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Check:');
    console.error('   1. LOCAL_DATABASE_URL is set correctly');
    console.error('   2. PROD_DATABASE_URL is set correctly');
    console.error('   3. Both databases are accessible');
    console.error('   4. User exists in production database');
  } finally {
    await localPrisma.$disconnect();
    await prodPrisma.$disconnect();
  }
}

// Check environment variables
if (!process.env.LOCAL_DATABASE_URL) {
  console.error('\n❌ LOCAL_DATABASE_URL environment variable is not set');
  console.error('\n💡 Usage:');
  console.error('   export LOCAL_DATABASE_URL="your-local-database-url"');
  console.error('   export PROD_DATABASE_URL="your-production-database-url"');
  console.error('   node scripts/migrate-projects-to-production.js tesla@gmail.com');
  process.exit(1);
}

if (!process.env.PROD_DATABASE_URL) {
  console.error('\n❌ PROD_DATABASE_URL environment variable is not set');
  console.error('\n💡 Usage:');
  console.error('   export LOCAL_DATABASE_URL="your-local-database-url"');
  console.error('   export PROD_DATABASE_URL="your-production-database-url"');
  console.error('   node scripts/migrate-projects-to-production.js tesla@gmail.com');
  process.exit(1);
}

// Run migration
const email = process.argv[2] || 'tesla@gmail.com';
migrateProjects(email).catch(console.error);
