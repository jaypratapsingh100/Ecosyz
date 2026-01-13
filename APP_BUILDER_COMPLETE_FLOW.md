# App Builder Complete Flow

## 🎯 End-to-End Flow Overview

This document describes the complete flow of the App Builder, from project creation to preview rendering, including all validation steps.

---

## 📋 Complete Flow Diagram

```
1. User Creates Project (with Questionnaire)
   ↓
2. Project Created in Database
   ↓
3. Scaffold Files Auto-Created (App.jsx, index.js, App.css, index.css)
   ↓
4. Scaffold Verification (Preview API called to verify rendering)
   ↓
5. Project Selected & Preview Shown (Scaffold renders immediately)
   ↓
6. AI Generation Triggered (Build prompt from questionnaire)
   ↓
7. Files Created Incrementally (One by one)
   ↓
8. Each File Validated (Syntax, structure, integration)
   ↓
9. Sandbox Validation (After all files created)
   ↓
10. Preview Updated (With new components)
   ↓
11. Sandbox Validation (Before returning preview)
   ↓
12. Preview Shown to User
```

---

## 🔄 Detailed Step-by-Step Flow

### Step 1: Project Creation with Questionnaire

**Location**: `app/components/app-builder/ProjectManager.tsx`

**Process**:
1. User fills out questionnaire (app type, design style, features, etc.)
2. `handleQuestionnaireComplete()` is called
3. Project data prepared with questionnaire answers
4. POST request to `/api/app-projects`

**Data Sent**:
```typescript
{
  title: brandName || 'My App',
  type: 'web',
  framework: 'react',
  questionnaireData: {...},
  appType: 'portfolio',
  brandName: '...',
  tagline: '...',
  // ... other questionnaire fields
}
```

---

### Step 2: Project Created in Database

**Location**: `app/api/app-projects/route.ts` (POST handler)

**Process**:
1. Project record created in database
2. **Scaffold files automatically created**:
   - `src/App.jsx` (main component with brand name/tagline)
   - `src/index.js` (React entry point)
   - `src/App.css` (styled with gradient)
   - `src/index.css` (global styles)

**Scaffold Files Content**:
- Uses `brandName` and `tagline` from project
- App.jsx shows welcome screen
- All files marked appropriately (`isMain: true` for App.jsx)

**Console Log**:
```
✅ Created 4 scaffold files for project [id]
```

---

### Step 3: Scaffold Verification

**Location**: `app/components/app-builder/ProjectManager.tsx`

**Process**:
1. Wait 500ms for files to be saved
2. Call `/api/app-projects/[id]/preview` POST
3. Verify preview HTML is generated successfully
4. Log verification status

**Console Logs**:
```
🔍 Step 1: Verifying scaffold files render...
✅ Scaffold files verified - preview renders successfully
📊 Preview HTML length: [number]
```

**If Verification Fails**:
- Warning logged but doesn't block flow
- Preview still attempted

---

### Step 4: Project Selected & Preview Shown

**Location**: `app/components/app-builder/ProjectManager.tsx`

**Process**:
1. `onSelectProject(project.id)` called
2. Preview panel automatically generates preview
3. User sees scaffold preview immediately (welcome screen)

**What User Sees**:
- Welcome screen with brand name
- Tagline
- Message: "🚀 Start building your app by asking the AI to create components!"
- Gradient background (purple to blue)

---

### Step 5: AI Generation Triggered

**Location**: `app/components/app-builder/ProjectManager.tsx`

**Process**:
1. Build prompt generated from questionnaire data
2. Prompt stored in `sessionStorage`
3. `auto-prompt-ready` event dispatched
4. AI chat request sent to `/api/app-projects/[id]/chat`

**Build Prompt Includes**:
- App type (portfolio, business, etc.)
- Design style (modern-minimal, bold-colorful, etc.)
- Color scheme
- Required sections
- Special features
- Brand name, tagline, key points
- **CRITICAL**: Instructions to build on top of scaffold files

**Console Logs**:
```
📝 Step 2: Generated build prompt from questionnaire
🤖 Step 3: Triggering AI generation to build on scaffold...
```

---

### Step 6: AI Request Sent

**Location**: `app/api/app-projects/[id]/chat/route.ts`

**Process**:
1. User authenticated
2. Project loaded with all files (including scaffold)
3. System prompt built with:
   - Project context
   - **All existing files** (scaffold files included!)
   - Questionnaire requirements
   - **CRITICAL**: Instructions to build on top, not replace scaffold
4. Request sent to DeepSeek Coder via OpenRouter

**System Prompt Includes**:
```
🚨 CRITICAL: SCAFFOLD FILES EXIST 🚨
- BUILD ON TOP of these files
- DO NOT replace or delete scaffold files
- Create NEW component files
- Import and use new components in App.jsx
```

**Console Logs**:
```
🚀 Making AI request: {
  provider: 'openrouter',
  model: 'deepseek/deepseek-coder',
  scaffoldFilesCount: 4,
  scaffoldFilesIncluded: true,
  systemPromptLength: [number]
}
📦 Scaffold files included in system prompt: ['src/App.jsx', 'src/index.js', ...]
```

---

### Step 7: Files Created Incrementally

**Location**: `app/api/app-projects/[id]/chat/route.ts` → `parseAndCreateFiles()`

**Process**:
1. AI response parsed for code blocks
2. Multiple regex patterns extract files:
   - ````file:path/to/file.js`
   - ````javascript\n// path: src/App.js\n...`
   - Other variations
3. **Each file created one by one**

**For Each File**:
1. Path normalized and validated
2. Language detected from extension
3. File created/updated in database
4. **Immediate validation** (syntax, structure)
5. Validation result tracked

**Console Logs**:
```
✅ Created/updated file: src/Home.jsx
🔍 Validating integration for: src/Home.jsx
✅ File validated successfully: src/Home.jsx (preview length: 1234)
```

---

### Step 8: Incremental File Validation

**Location**: `app/api/app-projects/[id]/chat/route.ts` → `validateFileIntegration()`

**For Each File Created**:
1. **Syntax Validation**:
   - Balanced braces `{` and `}`
   - Balanced parentheses `(` and `)`
   - Component structure (function/const/class)
   - Return statement
   - Export statement (for App files)

2. **Integration Check**:
   - Reload project with updated files
   - Check if App file still exists
   - Verify component structure

**Validation Results**:
```typescript
{
  path: 'src/Home.jsx',
  success: true,           // File created successfully
  validated: true,         // Passed validation
  validationError: undefined
}
```

**If Validation Fails**:
```typescript
{
  path: 'src/Broken.jsx',
  success: true,           // File still created
  validated: false,        // Failed validation
  validationError: 'Unbalanced braces: 5 open, 2 close'
}
```

**Console Logs**:
```
⚠️ File created but validation failed: src/Broken.jsx - [error]
   File will be kept but may cause preview issues
```

---

### Step 9: Sandbox Validation (After Files Created)

**Location**: `app/api/app-projects/[id]/chat/route.ts`

**Process**:
1. After all files are created
2. Reload project with new files
3. Check if App component structure exists
4. Validate component has required elements

**Checks**:
- App file exists
- Has component structure (function/const/class)
- Has return statement
- Has export statement

**Console Logs**:
```
🔍 Sandbox validation: Validating preview generation after file creation...
✅ Sandbox validation passed: Preview can be generated
```

**If Validation Fails**:
```
⚠️ Sandbox validation warning: App component may be incomplete
   Component: true, Return: false, Export: true
```

---

### Step 10: Preview Updated

**Location**: `app/components/app-builder/PreviewPanel.tsx`

**Process**:
1. `files-updated` event received
2. Wait 1 second for files to be saved
3. Call `/api/app-projects/[id]/preview` POST
4. Update preview HTML

**Console Logs**:
```
Preview API response: { status: 'success', output: '...' }
Preview HTML length: [number]
Preview HTML set successfully
```

---

### Step 11: Preview Generation with Sandbox Validation

**Location**: `app/api/app-projects/[id]/preview/route.ts`

**Process**:
1. Load project with all files
2. Generate preview HTML:
   - Process component files
   - Process App file
   - Detect React Router usage
   - Detect Tailwind CSS usage
   - Combine JavaScript
   - Include React/ReactDOM/Babel CDNs
   - Include Tailwind CDN if needed
   - Include React Router CDN if needed
   - Add CSP headers
3. **Sandbox Validation** (non-blocking):
   - Check HTML structure
   - Check React scripts
   - Check root element
   - Check App component
   - Log warnings if issues found
4. Return preview HTML

**Sandbox Validation Checks**:
```typescript
{
  hasHTMLStructure: true,    // DOCTYPE, html, head, body
  hasReactScripts: true,     // React, ReactDOM, Babel
  hasRootElement: true,      // div#root
  hasAppComponent: true,     // App rendering logic
  hasValidStructure: true    // Script tags present
}
```

**Console Logs**:
```
🔍 Sandbox validation: Validating preview structure...
✅ Sandbox validation passed: {
  checks: {...},
  htmlLength: 15234
}
```

**If Validation Fails**:
```
⚠️ Sandbox validation failed: Preview HTML missing root element
Validation checks: {...}
// Preview still returned - graceful degradation
```

---

### Step 12: Preview Shown to User

**Location**: `app/components/app-builder/PreviewPanel.tsx`

**Process**:
1. Preview HTML received
2. Set in iframe `srcdoc`
3. User sees rendered preview
4. Console logs show component loading

**What User Sees**:
- Fully rendered React app
- All components displayed
- Styling applied (Tailwind if used)
- Images loading (if included)

**Browser Console** (in preview iframe):
```
Starting preview render...
📦 Components loaded. Checking availability...
✅ Component Navbar loaded and available
✅ Component Home loaded and available
📦 Available components after loading: ['Navbar', 'Home', 'App']
✅ App component found: function
🎨 Rendering App...
✅ Preview render completed successfully
```

---

## 🔍 Validation Layers

### Layer 1: File-Level Validation
- **When**: After each file is created
- **What**: Syntax, structure, balanced braces/parentheses
- **Action**: Track validation status, log warnings

### Layer 2: Integration Validation
- **When**: After each file is created
- **What**: Check if file integrates with project
- **Action**: Verify App file still exists, component structure

### Layer 3: Sandbox Validation (After Files)
- **When**: After all files are created
- **What**: Check if preview can be generated
- **Action**: Validate App component structure

### Layer 4: Sandbox Validation (Before Return)
- **When**: Before returning preview HTML
- **What**: Validate HTML structure, React scripts, root element
- **Action**: Log warnings, don't block preview

---

## 📊 Key Features

### ✅ Scaffold Files
- Created automatically on project creation
- Ensure preview works immediately
- Use brand name and tagline
- AI builds on top of them

### ✅ Incremental Validation
- Each file validated as it's created
- Syntax and structure checks
- Integration verification
- Detailed error logging

### ✅ Sandbox Validation
- Non-blocking validation
- Catches issues early
- Detailed validation checks
- Graceful degradation

### ✅ Error Handling
- Comprehensive error logging
- Fallback file creation
- Error messages in preview
- Console debugging info

---

## 🎯 User Experience Flow

1. **User creates project** → Sees scaffold preview immediately ✅
2. **AI generates files** → Files created incrementally ✅
3. **Each file validated** → Issues caught early ✅
4. **Preview updates** → Shows new components ✅
5. **Validation logs** → Help debug issues ✅

---

## 📝 Console Output Example

```
🔍 Step 1: Verifying scaffold files render...
✅ Scaffold files verified - preview renders successfully
📊 Preview HTML length: 8234

📝 Step 2: Generated build prompt from questionnaire
🤖 Step 3: Triggering AI generation to build on scaffold...

🚀 Making AI request: {
  scaffoldFilesCount: 4,
  scaffoldFilesIncluded: true
}
📦 Scaffold files included in system prompt: ['src/App.jsx', 'src/index.js', ...]

✅ Created/updated file: src/Navbar.jsx
🔍 Validating integration for: src/Navbar.jsx
✅ File validated successfully: src/Navbar.jsx

✅ Created/updated file: src/Home.jsx
🔍 Validating integration for: src/Home.jsx
✅ File validated successfully: src/Home.jsx

📊 File creation summary: {
  totalFound: 5,
  successful: 5,
  validated: 5,
  validationFailed: 0
}

🔍 Sandbox validation: Validating preview generation after file creation...
✅ Sandbox validation passed: Preview can be generated

🔍 Sandbox validation: Validating preview structure...
✅ Sandbox validation passed: {
  checks: { hasHTMLStructure: true, hasReactScripts: true, ... }
}
```

---

## ✅ Status

- ✅ Scaffold files auto-created
- ✅ Scaffold verification
- ✅ Incremental file validation
- ✅ Sandbox validation (non-blocking)
- ✅ Preview generation with validation
- ✅ Complete end-to-end flow working

The App Builder now has a robust, validated flow from creation to preview! 🚀
