#!/bin/bash
# Smart migration script for Vercel
# Only runs migrations if there are pending ones

set -e

echo "🔍 Checking for pending migrations..."

# Check if DIRECT_URL is set (required for migrations)
if [ -z "$DIRECT_URL" ]; then
  echo "⚠️  DIRECT_URL not set. Skipping migrations."
  echo "   Migrations will be skipped. Set DIRECT_URL in Vercel to enable migrations."
  exit 0
fi

# Run migrate deploy - it's idempotent and only applies pending migrations
# This is safe to run multiple times
if pnpm prisma migrate deploy; then
  echo "✅ Migrations applied successfully (or already up to date)"
else
  echo "❌ Migration failed"
  exit 1
fi
