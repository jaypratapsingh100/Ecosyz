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
  echo "⚠️  Build will continue without migrations."
  echo "   If database tables don't exist, auth features may not work."
  echo "   Run migrations manually: pnpm prisma migrate deploy"
  # Don't fail the build - allow deployment to continue
  exit 0
fi
