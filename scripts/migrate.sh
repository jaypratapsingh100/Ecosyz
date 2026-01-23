#!/bin/bash
# Smart migration script for Vercel
# Only runs migrations if there are pending ones
# Gracefully handles connection errors to prevent build failures

echo "🔍 Checking for pending migrations..."

# Check if DIRECT_URL is set (required for migrations)
if [ -z "$DIRECT_URL" ]; then
  echo "⚠️  DIRECT_URL not set. Skipping migrations."
  echo "   Migrations will be skipped. Set DIRECT_URL in Vercel to enable migrations."
  exit 0
fi

# Run migrate deploy - it's idempotent and only applies pending migrations
# This is safe to run multiple times
# Capture output and exit code
MIGRATE_OUTPUT=$(pnpm prisma migrate deploy 2>&1)
MIGRATE_EXIT=$?

if [ $MIGRATE_EXIT -eq 0 ]; then
  echo "✅ Migrations applied successfully (or already up to date)"
  exit 0
else
  echo "⚠️  Migration failed with exit code $MIGRATE_EXIT"
  echo "$MIGRATE_OUTPUT" | head -10  # Show first 10 lines of error
  echo ""
  
  # Check for specific connection errors and provide helpful guidance
  if echo "$MIGRATE_OUTPUT" | grep -q "P1001\|Can't reach database server"; then
    echo "❌ Database connection error detected (P1001)"
    echo ""
    echo "   🔍 Problem: Vercel is IPv4-only, but Direct Connection may be IPv6-only"
    echo ""
    echo "   ✅ SOLUTION: Use Transaction Pooler (IPv4 compatible)"
    echo ""
    echo "   1. Go to Supabase Dashboard → Your Project → Settings → Database"
    echo "   2. Scroll to 'Connection String' section"
    echo "   3. Select 'Transaction Pooler' (port 5432, NOT Session Pooler on 6543)"
    echo "   4. Copy the connection string"
    echo "   5. Update DIRECT_URL in Vercel Dashboard → Settings → Environment Variables"
    echo ""
    echo "   Transaction Pooler format example:"
    echo "   postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require"
    echo ""
    echo "   Current DIRECT_URL check:"
    if [[ "$DIRECT_URL" == *"pooler"* ]] && [[ "$DIRECT_URL" == *":5432"* ]]; then
      echo "   ⚠️  Using pooler but still failing - verify it's Transaction Pooler (port 5432)"
    elif [[ "$DIRECT_URL" == *"db."* ]] && [[ "$DIRECT_URL" == *":5432"* ]]; then
      echo "   ❌ Using Direct Connection - switch to Transaction Pooler"
    fi
    echo ""
  fi
  
  echo "⚠️  Build will continue without migrations."
  echo "   If database tables don't exist, auth features may not work."
  echo "   Run migrations manually: pnpm prisma migrate deploy"
  # Don't fail the build - allow deployment to continue
  exit 0
fi
