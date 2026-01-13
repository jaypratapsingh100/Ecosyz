# Questionnaire System Testing Guide

## Overview
This guide helps you test the questionnaire system implementation, including the UI, database storage, and AI integration.

## Prerequisites
1. Database is synced: `pnpm prisma db push`
2. Prisma client is generated: `pnpm prisma generate`
3. Development server is running: `pnpm dev`
4. You're logged in to the app

## Test Checklist

### 1. Database Schema Test ✅
**Verify questionnaire fields exist in database**

```bash
# Check Prisma schema
cat prisma/schema.prisma | grep -A 20 "questionnaireData"

# Verify Prisma client is generated
pnpm prisma generate
```

**Expected**: No errors, schema includes questionnaire fields

---

### 2. Questionnaire Wizard UI Test ✅
**Test the questionnaire component appearance and flow**

**Steps**:
1. Navigate to `/app-builder`
2. Click "Create Project" button
3. Verify questionnaire wizard appears as modal overlay
4. Check that progress bar shows "Step 1 of 6"
5. Test each step:
   - **Step 1**: Select app type and main purpose
   - **Step 2**: Select target audience and technical level
   - **Step 3**: Select design style, color scheme, and layout
   - **Step 4**: Select required sections and special features
   - **Step 5**: Enter brand name, tagline, and key points
   - **Step 6**: Select framework, mobile responsiveness, performance priority
6. Test "Back" button navigation
7. Test "Skip" button (should close wizard)
8. Test "Next" button validation (should disable if required fields missing)
9. Complete questionnaire and click "Complete"

**Expected**:
- Modal appears with dark theme matching app design
- Progress bar updates correctly
- Navigation works smoothly
- Validation prevents proceeding without required fields
- All selections are saved

---

### 3. Project Creation with Questionnaire Test ✅
**Verify questionnaire data is saved when creating project**

**Steps**:
1. Complete questionnaire with test data:
   - App Type: Portfolio
   - Main Purpose: Showcase work/portfolio
   - Target Audience: General Public
   - Design Style: Modern & Minimal
   - Color Scheme: Professional Blue
   - Layout: Single Page
   - Sections: Hero, About, Portfolio, Contact
   - Features: Contact Form, Social Media Links
   - Brand Name: "Test Portfolio"
   - Tagline: "Showcasing my work"
   - Key Points: "Creative projects, Professional design"
2. Click "Complete"
3. Check browser console for any errors
4. Verify project appears in project list
5. Check database directly or via API

**API Test**:
```bash
# Get your auth token first, then:
curl -X GET http://localhost:3000/api/app-projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.[0] | {title, appType, designStyle, colorScheme, brandName, tagline}'
```

**Expected**:
- Project created successfully
- Questionnaire data saved in database
- No console errors
- Project appears in list

---

### 4. Database Storage Test ✅
**Verify questionnaire data is correctly stored**

**Steps**:
1. Create a project with questionnaire
2. Query database directly:

```sql
-- Connect to your database and run:
SELECT 
  id,
  title,
  "appType",
  "targetAudience",
  "designStyle",
  "colorScheme",
  "layoutStyle",
  "requiredFeatures",
  "brandName",
  tagline,
  "keyPoints",
  "questionnaireData"
FROM "AppProject"
ORDER BY "createdAt" DESC
LIMIT 1;
```

**Expected**:
- All questionnaire fields populated
- `questionnaireData` JSON contains complete questionnaire answers
- Individual fields match questionnaire selections

---

### 5. API Endpoint Test ✅
**Test project creation API with questionnaire data**

**Test Script**:
```bash
# Save this as test-questionnaire-api.sh
#!/bin/bash

TOKEN="YOUR_AUTH_TOKEN"
API_URL="http://localhost:3000/api/app-projects"

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Questionnaire Project",
    "type": "web",
    "framework": "react",
    "appType": "portfolio",
    "targetAudience": "general",
    "designStyle": "modern-minimal",
    "colorScheme": "blue",
    "layoutStyle": "single-page",
    "requiredFeatures": ["contact-form", "social"],
    "brandName": "Test Brand",
    "tagline": "Test Tagline",
    "keyPoints": "Key point 1, Key point 2",
    "questionnaireData": {
      "appType": "portfolio",
      "mainPurpose": "Showcase work/portfolio",
      "targetAudience": "general",
      "designStyle": "modern-minimal",
      "colorScheme": "blue"
    }
  }' | jq '.'
```

**Expected**:
- API returns 201 Created
- Response includes project with questionnaire fields
- No validation errors

---

### 6. AI Chat Integration Test ✅
**Verify AI uses questionnaire context in code generation**

**Steps**:
1. Create project with questionnaire:
   - Design Style: Bold & Colorful
   - Color Scheme: Orange/Red
   - Layout: Single Page
   - Sections: Hero, About, Portfolio
2. Open project in app builder
3. Open AI chat
4. Send message: "Create a hero section"
5. Check generated code:
   - Should use orange/red colors (#F97316, #EF4444)
   - Should be bold and colorful design
   - Should match single-page layout
   - Should include hero section

**Expected**:
- Generated code matches questionnaire preferences
- Colors match selected color scheme
- Design style matches selection
- Layout matches preference

---

### 7. System Prompt Test ✅
**Verify enhanced system prompt includes questionnaire data**

**Steps**:
1. Create project with specific questionnaire answers
2. Open browser DevTools → Network tab
3. Send a chat message
4. Find the chat API request
5. Check request payload (if logged) or check server logs
6. Verify system prompt includes:
   - Quality standards section
   - Design requirements section
   - Questionnaire context
   - Target audience guidelines

**Server Logs Check**:
```bash
# Check your server logs when sending a chat message
# Look for system prompt content
```

**Expected**:
- System prompt includes questionnaire context
- Quality standards are included
- Design requirements match questionnaire answers
- Target audience guidelines are present

---

### 8. Edge Cases Test ✅

#### Test 8.1: Skip Questionnaire
- Click "Create Project"
- Click "Skip" in questionnaire
- Verify project still creates (without questionnaire data)

#### Test 8.2: Partial Questionnaire
- Start questionnaire
- Fill only Step 1
- Try to proceed (should be blocked)
- Complete required fields
- Verify can proceed

#### Test 8.3: Empty Questionnaire Data
- Create project without questionnaire
- Verify no errors occur
- Verify AI chat still works

#### Test 8.4: Invalid Data
- Try to create project with invalid questionnaire data via API
- Verify validation errors are returned

---

### 9. UI/UX Test ✅

**Visual Checks**:
- [ ] Questionnaire modal is centered and responsive
- [ ] Progress bar is visible and updates correctly
- [ ] Buttons are properly styled and have hover effects
- [ ] Form fields are accessible (keyboard navigation works)
- [ ] Error states are clear
- [ ] Success message appears after completion

**Accessibility**:
- [ ] Screen reader can navigate questionnaire
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG standards

---

### 10. Performance Test ✅

**Load Time**:
- [ ] Questionnaire modal opens quickly (< 100ms)
- [ ] Step transitions are smooth
- [ ] No lag when selecting options

**Memory**:
- [ ] No memory leaks when opening/closing questionnaire multiple times
- [ ] State is properly cleaned up

---

## Automated Testing Script

Run the comprehensive test script:

```bash
chmod +x scripts/test-questionnaire.sh
./scripts/test-questionnaire.sh
```

---

## Common Issues & Solutions

### Issue: Questionnaire not appearing
**Solution**: Check browser console for errors, verify component is imported correctly

### Issue: Data not saving
**Solution**: Check API endpoint, verify database connection, check Prisma schema

### Issue: AI not using questionnaire data
**Solution**: Verify project query includes questionnaire fields, check system prompt generation

### Issue: TypeScript errors
**Solution**: Run `pnpm prisma generate` and restart TypeScript server

---

## Success Criteria

✅ All tests pass
✅ No console errors
✅ Database stores questionnaire data correctly
✅ AI generates code matching questionnaire preferences
✅ UI is responsive and accessible
✅ Performance is acceptable

---

## Next Steps After Testing

1. Fix any bugs found
2. Gather user feedback
3. Consider adding analytics to track questionnaire completion rates
4. Optimize based on performance test results





