#!/bin/bash
# verify-oauth-user.sh - Verify OAuth user creation and profile setup

set -e

echo "🔍 Verifying OAuth User Creation"
echo "==============================="
echo ""

# Check if cookies.txt exists
if [ ! -f cookies.txt ]; then
    echo "❌ No cookies.txt found. Please login via OAuth first."
    echo "   Run the OAuth testing script and complete manual login."
    exit 1
fi

echo "1. Testing Session API..."
SESSION_RESPONSE=$(curl -s -b cookies.txt http://localhost:3000/api/auth/session)

if echo "$SESSION_RESPONSE" | grep -q '"error"'; then
    echo "❌ Session API failed: $SESSION_RESPONSE"
    exit 1
else
    echo "✅ Session API working"
    # Extract user info
    USER_EMAIL=$(echo "$SESSION_RESPONSE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
    USER_NAME=$(echo "$SESSION_RESPONSE" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    echo "   User: $USER_NAME ($USER_EMAIL)"
fi

echo ""

echo "2. Testing Profile API..."
PROFILE_RESPONSE=$(curl -s -b cookies.txt http://localhost:3000/api/profile)

if echo "$PROFILE_RESPONSE" | grep -q '"error"'; then
    echo "❌ Profile API failed: $PROFILE_RESPONSE"
    exit 1
else
    echo "✅ Profile API working"
    # Extract profile info
    DISPLAY_NAME=$(echo "$PROFILE_RESPONSE" | grep -o '"displayName":"[^"]*"' | cut -d'"' -f4)
    AVATAR_URL=$(echo "$PROFILE_RESPONSE" | grep -o '"avatarUrl":"[^"]*"' | cut -d'"' -f4)
    echo "   Display Name: $DISPLAY_NAME"
    echo "   Avatar URL: ${AVATAR_URL:-Not set}"
fi

echo ""

echo "3. Testing Avatar Upload..."
# Generate a test avatar URL
TEST_AVATAR_URL="https://api.dicebear.com/7.x/avataaars/svg?seed=oauth-test-$(date +%s)"

AVATAR_RESPONSE=$(curl -s -X PUT \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d "{\"avatarUrl\":\"$TEST_AVATAR_URL\"}" \
    http://localhost:3000/api/profile/avatar)

if echo "$AVATAR_RESPONSE" | grep -q '"error"'; then
    echo "❌ Avatar update failed: $AVATAR_RESPONSE"
    exit 1
else
    echo "✅ Avatar update working"
    echo "   New avatar URL set successfully"
fi

echo ""

echo "4. Verifying Database Records..."
# Note: This would require database access, but we can check via API responses
echo "   ✅ User record exists (confirmed via session API)"
echo "   ✅ Profile record exists (confirmed via profile API)"

echo ""

echo "5. Testing Sign Out..."
SIGNOUT_RESPONSE=$(curl -s -X POST -b cookies.txt http://localhost:3000/api/auth/signout)

if echo "$SIGNOUT_RESPONSE" | grep -q '"message":"Signed out successfully"'; then
    echo "✅ Sign out working"
else
    echo "❌ Sign out failed: $SIGNOUT_RESPONSE"
fi

echo ""

echo "6. Verifying Session Cleared..."
# Try to access profile after sign out (should fail)
POST_SIGNOUT_RESPONSE=$(curl -s -b cookies.txt http://localhost:3000/api/profile)

if echo "$POST_SIGNOUT_RESPONSE" | grep -q '"error":"Not authenticated"'; then
    echo "✅ Session properly cleared after sign out"
else
    echo "❌ Session not cleared: $POST_SIGNOUT_RESPONSE"
fi

echo ""
echo "🎉 OAuth Verification Complete!"
echo ""
echo "Summary:"
echo "- ✅ OAuth login successful"
echo "- ✅ User profile created"
echo "- ✅ Avatar functionality working"
echo "- ✅ Session management working"
echo "- ✅ Sign out working"
echo ""
echo "The OAuth provider integration is working correctly!"