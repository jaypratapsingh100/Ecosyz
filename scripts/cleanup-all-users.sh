#!/bin/bash

# User Cleanup Script for Ecosyz
# Deletes all users from Supabase Auth and Prisma database

set -e

echo "🧹 Cleaning up all users from Ecosyz"
echo "====================================="
echo ""

# Load environment variables from .env file
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if required environment variables are set
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    print_error "SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    print_error "NEXT_PUBLIC_SUPABASE_URL environment variable is not set"
    exit 1
fi

# Step 1: Delete all users from Supabase Auth
print_status "Deleting all users from Supabase Auth..."

# Get all users from Supabase
USERS_RESPONSE=$(curl -s -X GET \
    "${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}")

if [ $? -ne 0 ]; then
    print_error "Failed to fetch users from Supabase"
    exit 1
fi

# Extract user IDs from the response
USER_IDS=$(echo "$USERS_RESPONSE" | grep -o '"id":"[^"]*"' | sed 's/"id":"//g' | sed 's/"//g')

if [ -z "$USER_IDS" ]; then
    print_warning "No users found in Supabase Auth"
else
    # Delete each user
    for USER_ID in $USER_IDS; do
        print_status "Deleting user $USER_ID from Supabase Auth..."
        DELETE_RESPONSE=$(curl -s -X DELETE \
            "${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/$USER_ID" \
            -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
            -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}")

        if [ $? -eq 0 ]; then
            print_success "Deleted user $USER_ID from Supabase Auth"
        else
            print_error "Failed to delete user $USER_ID from Supabase Auth"
        fi
    done
fi

# Step 2: Delete all records from Prisma database
print_status "Deleting all records from Prisma database..."

# Create a temporary SQL file
cat > /tmp/cleanup.sql << 'EOF'
-- Delete all profiles first (due to foreign key constraints)
DELETE FROM "Profile";

-- Delete all users
DELETE FROM "User";
EOF

# Execute the SQL file
npx prisma db execute --file=/tmp/cleanup.sql --schema=./prisma/schema.prisma

# Clean up temporary file
rm /tmp/cleanup.sql

if [ $? -eq 0 ]; then
    print_success "Deleted all records from Prisma database"
else
    print_error "Failed to delete records from Prisma database"
fi

print_success "User cleanup completed!"
print_warning "Note: OAuth provider configurations in Supabase dashboard are preserved"
echo ""
print_status "Ready to test authentication flows with clean state"