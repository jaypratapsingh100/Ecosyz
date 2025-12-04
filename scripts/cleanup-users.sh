#!/bin/bash

# Ecosyz User Cleanup Script
# This script deletes all users from both Supabase and Prisma databases
# Use this for testing purposes to start with a clean slate

echo "🧹 Cleaning up all users from Ecosyz databases"
echo "=============================================="

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

echo ""
echo "1. Deleting users from Prisma database..."

# Delete from Prisma
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deletePrismaUsers() {
  try {
    const profileCount = await prisma.profile.deleteMany();
    console.log(\`✅ Deleted \${profileCount.count} profiles\`);

    const userCount = await prisma.user.deleteMany();
    console.log(\`✅ Deleted \${userCount.count} users from Prisma\`);
  } catch (error) {
    console.error('❌ Error deleting from Prisma:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

deletePrismaUsers();
"

echo ""
echo "2. Deleting users from Supabase..."

# Delete from Supabase
node -e "
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase environment variables not set');
  process.exit(1);
}

const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function deleteSupabaseUsers() {
  try {
    const { data: users, error: listError } = await supabaseServer.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing Supabase users:', listError.message);
      return;
    }

    const userList = users?.users || [];
    if (!userList || userList.length === 0) {
      console.log('✅ No users found in Supabase');
      return;
    }

    console.log(\`Found \${userList.length} users in Supabase\`);

    for (const user of userList) {
      const { error: deleteError } = await supabaseServer.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(\`❌ Error deleting user \${user.email}: \${deleteError.message}\`);
      } else {
        console.log(\`✅ Deleted user: \${user.email}\`);
      }
    }

    console.log('✅ Finished deleting Supabase users');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deleteSupabaseUsers();
"

echo ""
echo "3. Verification..."

# Verify Prisma is clean
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyClean() {
  try {
    const users = await prisma.user.findMany();
    const profiles = await prisma.profile.findMany();

    console.log(\`📊 Remaining in Prisma - Users: \${users.length}, Profiles: \${profiles.length}\`);

    if (users.length === 0 && profiles.length === 0) {
      console.log('✅ Prisma database is clean');
    } else {
      console.log('⚠️  Some data still remains in Prisma');
    }
  } catch (error) {
    console.error('❌ Error verifying Prisma:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

verifyClean();
"

echo ""
echo "🎉 Cleanup complete!"
echo ""
echo "You can now run the API tests with a fresh database:"
echo "  ./test-auth-apis.sh"
echo ""
echo "Or test with your credentials:"
echo "  ysony7070@gmail.com / Joy@#2020"