# Sandbox Validation System

## ✅ Concept

**Sandbox validation** ensures that previews are validated **server-side** before being shown to users. This prevents broken previews from being displayed and ensures quality.

## 🔄 Flow

### Before (Without Sandbox):
1. Files created → Preview generated → Shown to user
2. ❌ User might see broken previews
3. ❌ Errors only discovered client-side

### After (With Sandbox):
1. Files created → Preview generated → **Sandbox validation** → Preview shown
2. ✅ Only valid previews are shown
3. ✅ Errors caught server-side before user sees them

## 🔍 Validation Checks

### Preview HTML Validation:
1. ✅ **HTML Structure**: Has `<!DOCTYPE html>`, `<html>`, `<head>`, `<body>` tags
2. ✅ **React Scripts**: Includes React, ReactDOM, and Babel scripts
3. ✅ **Root Element**: Has `<div id="root">` element
4. ✅ **App Component**: Has App component rendering logic
5. ✅ **Script Structure**: Has sufficient script tags for React app

### File-Level Validation:
1. ✅ **Component Structure**: Has function/const/class definition
2. ✅ **Return Statement**: Has return statement for JSX
3. ✅ **Export Statement**: Has export for App files
4. ✅ **Syntax**: Balanced braces and parentheses

## 📊 Validation Results

### Success:
```json
{
  "valid": true,
  "checks": {
    "hasHTMLStructure": true,
    "hasReactScripts": true,
    "hasRootElement": true,
    "hasAppComponent": true,
    "hasValidStructure": true
  }
}
```

### Failure:
```json
{
  "valid": false,
  "error": "Preview HTML missing root element (div with id=\"root\")",
  "checks": {
    "hasHTMLStructure": true,
    "hasReactScripts": true,
    "hasRootElement": false,  // ← Failed check
    "hasAppComponent": false,
    "hasValidStructure": false
  }
}
```

## 🎯 Implementation

### 1. Preview Route (`app/api/app-projects/[id]/preview/route.ts`)
- `validatePreviewSandbox()` function validates HTML before returning
- Checks HTML structure, React scripts, root element, App component
- Returns detailed validation results

### 2. Chat Route (`app/api/app-projects/[id]/chat/route.ts`)
- After files are created, validates preview can be generated
- Checks App component structure
- Logs validation warnings/errors

## 📝 Console Logs

### Successful Validation:
```
🔍 Sandbox validation: Validating preview before returning...
✅ Sandbox validation passed: {
  checks: {
    hasHTMLStructure: true,
    hasReactScripts: true,
    hasRootElement: true,
    hasAppComponent: true,
    hasValidStructure: true
  },
  htmlLength: 15234
}
```

### Failed Validation:
```
🔍 Sandbox validation: Validating preview before returning...
❌ Sandbox validation failed: Preview HTML missing root element
Validation checks: {
  hasHTMLStructure: true,
  hasReactScripts: true,
  hasRootElement: false,  // ← Issue here
  hasAppComponent: false,
  hasValidStructure: false
}
```

## 🚨 Error Handling

### Preview Route:
- If validation fails → Returns error response
- Error includes specific validation failure details
- User sees error message instead of broken preview

### Chat Route:
- If validation fails → Logs warning
- Files are still created (validation is non-blocking)
- Warning helps identify potential issues

## 🎯 Benefits

1. **Quality Assurance**: Only valid previews shown to users
2. **Early Error Detection**: Catch issues before user sees them
3. **Better Debugging**: Detailed validation checks help identify problems
4. **User Experience**: Users never see broken previews
5. **Server-Side Validation**: Catches issues before client-side rendering

## 🔧 Future Enhancements

Potential improvements:
1. **Full HTML Parsing**: Use HTML parser to validate structure
2. **JavaScript Syntax Check**: Parse JS code to validate syntax
3. **Dependency Validation**: Check if imports resolve correctly
4. **Render Test**: Actually attempt to render preview server-side
5. **Performance Check**: Validate preview size and complexity

## 📍 Code Locations

- **Preview Validation**: `app/api/app-projects/[id]/preview/route.ts` (line ~440)
- **File Validation**: `app/api/app-projects/[id]/chat/route.ts` (line ~1870)
- **Preview Generation**: `app/api/app-projects/[id]/preview/route.ts` (line ~500)

## ✅ Status

- ✅ Sandbox validation implemented in preview route
- ✅ HTML structure validation
- ✅ React scripts validation
- ✅ Root element validation
- ✅ App component validation
- ✅ File-level validation in chat route
- ✅ Detailed error reporting
