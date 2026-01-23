#!/bin/bash

echo "🧪 Testing App Builder with Azure DeepSeek"
echo "=========================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  Warning: .env.local not found"
    echo "   Make sure AZURE_DEEPSEEK_URL is set"
else
    echo "✅ .env.local found"
    if grep -q "AZURE_DEEPSEEK_URL" .env.local; then
        echo "✅ AZURE_DEEPSEEK_URL is configured"
        AZURE_URL=$(grep AZURE_DEEPSEEK_URL .env.local | cut -d '=' -f2)
        echo "   URL: $AZURE_URL"
    else
        echo "❌ AZURE_DEEPSEEK_URL not found in .env.local"
    fi
fi

echo ""
echo "1️⃣  Testing Azure DeepSeek Connection..."
echo "----------------------------------------"
node scripts/test-azure-deepseek-connection.js

echo ""
echo "2️⃣  Checking if dev server is running..."
echo "----------------------------------------"
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Dev server is running on port 3000"
    echo "   Open http://localhost:3000/app-builder in your browser"
else
    echo "⚠️  Dev server is not running"
    echo "   Start it with: pnpm dev"
fi

echo ""
echo "3️⃣  Quick API Test..."
echo "----------------------------------------"
AZURE_URL=${AZURE_URL:-"http://74.225.138.116:8000"}
echo "Testing: $AZURE_URL/health"
curl -s "$AZURE_URL/health" | head -c 200
echo ""
echo ""

echo "✅ Testing complete!"
echo ""
echo "Next steps:"
echo "1. Start dev server: pnpm dev"
echo "2. Open http://localhost:3000/app-builder"
echo "3. Create a project and test chat"
