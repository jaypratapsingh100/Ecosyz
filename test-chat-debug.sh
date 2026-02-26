#!/usr/bin/env bash

set -euo pipefail

APP_ID="${APP_ID:-cmm3a5o5u00hkpzddjoyhj7vb}"
BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "POST $BASE_URL/api/app-projects/$APP_ID/chat/debug"

curl -i -X POST "$BASE_URL/api/app-projects/$APP_ID/chat/debug" \
  -H "Content-Type: application/json" \
  -H "Cookie: ${AUTH_COOKIE:-<your auth cookie>}" \
  -d '{
    "message": "Add a pricing section with three tiers.",
    "userProvider": "groq",
    "userModel": "llama-3.3-70b-versatile",
    "currentFile": "src/App.jsx"
  }'

