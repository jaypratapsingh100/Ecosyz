#!/bin/bash

# Ecosyz Authentication API Testing Suite
# Run this script to test all authentication endpoints

BASE_URL="http://localhost:3000"
TEST_EMAIL="ysony7070@gmail.com"
TEST_PASSWORD="Joy@#2020"

echo "🧪 Testing Ecosyz Authentication APIs"
echo "======================================"

# 0. Clean up - Delete existing user if it exists
echo ""
echo "0. Cleaning up existing user..."
# First try to sign in to get cookies, then delete
LOGIN_ATTEMPT=$(curl -s -X POST "$BASE_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
  -c cookies.txt)

if echo "$LOGIN_ATTEMPT" | grep -q "Signed in successfully"; then
  echo "User exists, deleting..."
  DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/auth/delete" \
    -b cookies.txt)
  echo "Delete Response: $DELETE_RESPONSE"
else
  echo "User doesn't exist or can't sign in, proceeding with signup"
fi

# 1. Test Sign Up
echo ""
echo "1. Testing Sign Up..."
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"name\":\"Test User\"}")

echo "Sign Up Response: $SIGNUP_RESPONSE"

# Extract session cookies from signup response (if any)
SESSION_COOKIE=$(echo "$SIGNUP_RESPONSE" | grep -o 'sb-access-token=[^;]*' || echo "")
REFRESH_COOKIE=$(echo "$SIGNUP_RESPONSE" | grep -o 'sb-refresh-token=[^;]*' || echo "")

# 2. Test Sign In
echo ""
echo "2. Testing Sign In..."
SIGNIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
  -c cookies.txt)

echo "Sign In Response: $SIGNIN_RESPONSE"

# 3. Test Get Session
echo ""
echo "3. Testing Get Session..."
SESSION_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/session" \
  -b cookies.txt)

echo "Session Response: $SESSION_RESPONSE"

# 4. Test Get Profile
echo ""
echo "4. Testing Get Profile..."
PROFILE_GET_RESPONSE=$(curl -s -X GET "$BASE_URL/api/profile" \
  -b cookies.txt)

echo "Profile Get Response: $PROFILE_GET_RESPONSE"

# 5. Test Update Profile
echo ""
echo "5. Testing Update Profile..."
PROFILE_UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/profile" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "displayName": "Updated Test User",
    "bio": "This is a test bio",
    "preferences": {
      "theme": "dark",
      "language": "en-IN",
      "emailNotifications": true
    }
  }')

echo "Profile Update Response: $PROFILE_UPDATE_RESPONSE"

# 6. Test Avatar Upload (using a dummy image URL)
echo ""
echo "6. Testing Avatar Upload..."
AVATAR_UPLOAD_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/profile/avatar" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"avatarUrl": "https://example.com/avatar.jpg"}')

echo "Avatar Upload Response: $AVATAR_UPLOAD_RESPONSE"

# 7. Test Sign Out
echo ""
echo "7. Testing Sign Out..."
SIGNOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/signout" \
  -b cookies.txt)

echo "Sign Out Response: $SIGNOUT_RESPONSE"

# 8. Test Session After Sign Out
echo ""
echo "8. Testing Session After Sign Out..."
SESSION_AFTER_SIGNOUT=$(curl -s -X GET "$BASE_URL/api/auth/session" \
  -b cookies.txt)

echo "Session After Sign Out: $SESSION_AFTER_SIGNOUT"

echo ""
echo "✅ API Testing Complete!"
echo "Check the responses above for any errors."
echo "Cookies were saved to cookies.txt for manual inspection if needed."

# Clean up
rm -f cookies.txt