# Quick Testing Guide - Questionnaire System

## 🚀 Quick Start Testing

### Step 1: Start the Development Server
```bash
pnpm dev
```

### Step 2: Navigate to App Builder
1. Open browser: `http://localhost:3000`
2. Log in (if not already)
3. Navigate to `/app-builder`

### Step 3: Test Questionnaire UI
1. Click **"Create Project"** button
2. **Questionnaire wizard should appear** ✅
3. Complete all 6 steps:
   - **Step 1**: Select "Portfolio" app type, "Showcase work/portfolio"
   - **Step 2**: Select "General Public", "Non-technical"
   - **Step 3**: Select "Modern & Minimal", "Professional Blue", "Single Page"
   - **Step 4**: Select sections: Hero, About, Portfolio, Contact
   - **Step 5**: Enter brand name: "Test Portfolio", tagline: "My Work"
   - **Step 6**: Select "React", "Essential", "Balanced"
4. Click **"Complete"**

### Step 4: Verify Project Creation
- ✅ Project appears in project list
- ✅ Project title matches your input
- ✅ No console errors

### Step 5: Test AI Chat Integration
1. Click on the created project
2. Open AI chat panel
3. Send message: **"Create a hero section"**
4. **Verify generated code**:
   - Uses blue colors (#3B82F6, #2563EB)
   - Modern & minimal design
   - Single-page layout
   - Professional styling

### Step 6: Verify Database Storage
```bash
# Option 1: Check via API (in browser console)
fetch('/api/app-projects').then(r => r.json()).then(console.log)

# Option 2: Check database directly
# Connect to your database and run:
SELECT title, "appType", "designStyle", "colorScheme", "brandName" 
FROM "AppProject" 
ORDER BY "createdAt" DESC 
LIMIT 1;
```

## ✅ Success Criteria

- [ ] Questionnaire wizard appears when creating project
- [ ] All 6 steps can be completed
- [ ] Project is created successfully
- [ ] Questionnaire data is saved to database
- [ ] AI generates code matching questionnaire preferences
- [ ] No console errors

## 🐛 Common Issues

### Issue: Questionnaire doesn't appear
**Fix**: Check browser console, verify `QuestionnaireWizard` is imported

### Issue: Data not saving
**Fix**: Check network tab, verify API call succeeds

### Issue: AI not using questionnaire
**Fix**: Verify project query includes questionnaire fields

## 📖 Full Testing Guide
See `docs/QUESTIONNAIRE_TESTING_GUIDE.md` for comprehensive testing

