#!/bin/bash

# Comprehensive Authentication Testing Script for Ecosyz
# Tests email/password auth, GitHub OAuth, and Google OAuth

set -e

echo "🧪 Testing Ecosyz Authentication System"
echo "========================================"
echo ""

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

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
            -c $COOKIES_FILE \
            -b $COOKIES_FILE \
            -w "\n%{http_code}" \
            -d "$data" \
            "$url" 2>/dev/null)
    else
        response=$(curl -s -X $method \
            -c $COOKIES_FILE \
            -b $COOKIES_FILE \
            -w "\n%{http_code}" \
            "$url" 2>/dev/null)
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        print_success "HTTP $http_code - $description completed"
        echo "$body" | head -20  # Limit output
    else
        print_error "HTTP $http_code - $description failed"
        echo "$body" | head -20
        return 1
    fi
}

echo "🎯 Authentication Testing Plan:"
echo "1. Email/Password Authentication"
echo "2. GitHub OAuth (sohni2012@gmail.com)"
echo "3. Google OAuth (ysony7070@gmail.com)"
echo ""

# Clean up old cookies
rm -f $COOKIES_FILE

echo "📧 Testing Email/Password Authentication"
echo "----------------------------------------"

# Test user signup
make_request "POST" "$BASE_URL/api/auth/signup" \
    '{"name":"Test User","email":"test@example.com","password":"password123"}' \
    "Signing up test user"

# Test user signin
make_request "POST" "$BASE_URL/api/auth/signin" \
    '{"email":"test@example.com","password":"password123"}' \
    "Signing in test user"

# Test session
make_request "GET" "$BASE_URL/api/auth/session" \
    "" \
    "Getting user session"

# Test profile
make_request "GET" "$BASE_URL/api/profile" \
    "" \
    "Getting user profile"

# Test profile update
make_request "PUT" "$BASE_URL/api/profile" \
    '{"displayName":"Updated Test User","bio":"This is a test bio"}' \
    "Updating user profile"

# Test avatar upload
make_request "POST" "$BASE_URL/api/profile/avatar" \
    "" \
    "Uploading avatar"

# Test signout
make_request "POST" "$BASE_URL/api/auth/signout" \
    "" \
    "Signing out user"

echo ""
echo "🐙 GitHub OAuth Testing (sohni2012@gmail.com)"
echo "---------------------------------------------"
echo ""
print_warning "GitHub OAuth requires manual browser interaction:"
echo "1. Visit: $BASE_URL/auth"
echo "2. Click 'Continue with GitHub'"
echo "3. Sign in with: sohni2012@gmail.com"
echo "4. Should redirect to: $BASE_URL/profile"
echo "5. Check that user profile is created with GitHub data"
echo ""

echo "🔍 To test GitHub OAuth programmatically, run:"
echo "curl -I $BASE_URL/api/auth/github"
echo ""

echo "🌐 Google OAuth Testing (ysony7070@gmail.com)"
echo "---------------------------------------------"
echo ""
print_warning "Google OAuth requires manual browser interaction:"
echo "1. Visit: $BASE_URL/auth"
echo "2. Click 'Continue with Google'"
echo "3. Sign in with: ysony7070@gmail.com"
echo "4. Should redirect to: $BASE_URL/profile"
echo "5. Check that user profile is created with Google data"
echo ""

echo "🔍 To test Google OAuth programmatically, run:"
echo "curl -I $BASE_URL/api/auth/google"
echo ""

echo "✅ Testing Complete!"
echo ""
print_success "Email/Password authentication: Tested and working"
print_warning "OAuth providers: Require manual browser testing"
echo ""
echo "📋 Manual Testing Checklist:"
echo "□ Visit $BASE_URL/auth"
echo "□ Test GitHub login with sohni2012@gmail.com"
echo "□ Verify redirect to /profile"
echo "□ Test Google login with ysony7070@gmail.com"
echo "□ Verify redirect to /profile"
echo "□ Check user creation in database"
echo "□ Test profile updates work"