#!/bin/bash

# Comprehensive Authentication Testing Script for Ecosyz
# Tests email/password auth, GitHub OAuth, and Google OAuth

set -e

echo "🧪 Testing Ecosyz Authentication System"
echo "========================================"
echo ""

BASE_URL="http://localhost:3000"
COOKIES_FILE="cookies.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to make API request and check response
make_request() {
    local method=$1
    local url=$2
    local data=$3
    local description=$4

    print_status "$description..."

    if [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
        response=$(curl -s -X $method \
            -H "Content-Type: application/json" \
            -d "$data" \
            -c $COOKIES_FILE \
            -b $COOKIES_FILE \
            $url)
    else
        response=$(curl -s -X $method \
            -c $COOKIES_FILE \
            -b $COOKIES_FILE \
            $url)
    fi

    # Check if response contains error
    if echo "$response" | grep -q '"error"'; then
        print_error "Failed: $(echo $response | grep -o '"error":"[^"]*' | cut -d'"' -f4)"
        return 1
    else
        print_success "Success"
        return 0
    fi
}

# Function to test OAuth flow (manual step)
test_oauth_manual() {
    local provider=$1
    local email=$2

    print_warning "Manual OAuth testing required for $provider"
    echo "  1. Visit: $BASE_URL/auth"
    echo "  2. Click 'Continue with $provider'"
    echo "  3. Use email: $email"
    echo "  4. After login, run verification commands below"
    echo ""
}

# Clean up function
cleanup() {
    print_status "Cleaning up..."
    rm -f $COOKIES_FILE
}

# Main testing function
main() {
    # Cleanup on exit
    trap cleanup EXIT

    print_status "Starting comprehensive authentication tests..."
    echo ""

    # Step 1: Delete all users
    print_status "Step 1: Deleting all existing users..."
    make_request "DELETE" "$BASE_URL/api/auth/delete" "" "Deleting all users"
    echo ""

    # Step 2: Test email/password signup
    print_status "Step 2: Testing Email/Password Authentication"
    echo ""

    # Sign up
    SIGNUP_DATA='{
        "name": "Test User",
        "email": "test@example.com",
        "password": "testpassword123"
    }'
    make_request "POST" "$BASE_URL/api/auth/signup" "$SIGNUP_DATA" "Signing up with email/password"
    echo ""

    # Sign in
    SIGNIN_DATA='{
        "email": "test@example.com",
        "password": "testpassword123"
    }'
    make_request "POST" "$BASE_URL/api/auth/signin" "$SIGNIN_DATA" "Signing in with email/password"
    echo ""

    # Test session
    make_request "GET" "$BASE_URL/api/auth/session" "" "Testing session retrieval"
    echo ""

    # Test profile
    make_request "GET" "$BASE_URL/api/profile" "" "Testing profile retrieval"
    echo ""

    # Sign out
    make_request "POST" "$BASE_URL/api/auth/signout" "" "Signing out"
    echo ""

    # Step 3: Test GitHub OAuth
    print_status "Step 3: Testing GitHub OAuth"
    test_oauth_manual "GitHub" "sohni2012@gmail.com"
    echo ""

    # Step 4: Test Google OAuth
    print_status "Step 4: Testing Google OAuth"
    test_oauth_manual "Google" "ysony7070@gmail.com"
    echo ""

    # Verification commands
    print_status "Verification Commands (run after manual OAuth login):"
    echo ""
    echo "# Check session:"
    echo "curl -b cookies.txt $BASE_URL/api/auth/session"
    echo ""
    echo "# Check profile:"
    echo "curl -b cookies.txt $BASE_URL/api/profile"
    echo ""
    echo "# Check database (run in separate terminal):"
    echo "npx prisma studio"
    echo ""

    print_success "Authentication testing script completed!"
    print_warning "Complete manual OAuth testing in browser as instructed above."
}

# Run main function
main "$@"