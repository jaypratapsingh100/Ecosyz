#!/bin/bash

# Cleanup script for unwanted files in OpenIdea project
echo "🧹 Cleaning up unwanted files..."

# 1. Remove temporary files
echo "Removing temporary files..."
rm -f package.json.tmp
rm -f cookies.txt
rm -f KnowledgeGraph_main.tsx

# 2. Remove generated project directories
echo "Removing generated project directories..."
rm -rf generated-projects/

# 3. Remove development/testing scripts (optional - uncomment if needed)
echo "Removing development scripts..."
rm -f test-all-auth-methods.sh
rm -f test-auth-apis.sh
rm -f test-local-auth.js
rm -f test-oauth-providers.sh
rm -f test-vercel-apis.sh
rm -f verify-oauth-user.sh
rm -f cleanup-all-users.sh
rm -f cleanup-users.sh

# 4. Remove redundant documentation
echo "Removing redundant documentation..."
rm -f ENHANCED_IMPLEMENTATION_PLAN.md
rm -f PARALLEL_IMPLEMENTATION_SUMMARY.md
rm -f PHASE_0_COMPLETION_SUMMARY.md
rm -f SESSION_SUMMARY.md
rm -f pr_description.md
rm -f pr_update_description.md

# 5. Remove development artifacts
echo "Removing development artifacts..."
rm -f app/.copilot-instructions.md

# 6. Remove any remaining temporary files
echo "Removing any remaining temporary files..."
find . -name "*.tmp" -type f -delete
find . -name "*.log" -type f -delete
find . -name "*.bak" -type f -delete
find . -name ".DS_Store" -type f -delete

echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary of removed files:"
echo "- Temporary files (package.json.tmp, cookies.txt, etc.)"
echo "- Generated project directories with node_modules"
echo "- Development/testing scripts"
echo "- Redundant documentation files"
echo "- Development artifacts"
echo ""
echo "💡 Your project is now cleaner and ready for production!"
