# Auto-Generate App from Questionnaire

## Overview
When users complete the questionnaire, the system now automatically generates a comprehensive prompt and sends it to the AI chat to create all files based on questionnaire requirements.

## How It Works

### 1. Questionnaire Completion
- User completes all 6 steps of questionnaire
- Provides: app type, design style, colors, sections, features, branding, etc.

### 2. Project Creation
- Project is created with questionnaire data stored
- Project type is set to "web" (valid enum value)
- Questionnaire appType (portfolio/business/etc.) stored as metadata

### 3. Automatic Prompt Generation
- System generates comprehensive build prompt from questionnaire data
- Prompt includes:
  - Brand & Content (name, tagline, key points)
  - Design Requirements (style, colors, layout)
  - Required Sections (all components to create)
  - Special Features (all features to implement)
  - Critical Instructions (exact requirements)
  - File Generation Requirements (format, structure)

### 4. Auto-Send to AI Chat
- Prompt is automatically sent to `/api/app-projects/[id]/chat`
- AI receives questionnaire data in system prompt + explicit build request
- AI generates all files based on questionnaire requirements

### 5. File Generation
- AI creates all required components
- Creates App.jsx that imports all components
- Creates index.js entry point
- Creates CSS files for styling
- All files use exact design style, colors, layout specified

## Prompt Structure

The generated prompt includes:

```
Create a complete, production-ready [appType] application...

**Brand & Content:**
- Brand Name: [name]
- Tagline: [tagline]
- Key Points: [points]
- Target Audience: [audience]

**Design Requirements:**
- Design Style: [style]
- Color Scheme: [scheme]
- Layout Style: [layout]

**Required Sections:**
- [section1]
- [section2]
...

**Special Features:**
- [feature1]
- [feature2]
...

**CRITICAL INSTRUCTIONS:**
1. Create ALL required sections as separate React components
2. Use EXACT design style "[style]" throughout
3. Use EXACT color scheme "[scheme]"
4. Implement "[layout]" layout style
5. Implement ALL special features
...

**FILE GENERATION REQUIREMENTS:**
- Generate ALL files in ONE response
- Use ```file:path/to/file.jsx format
- Create components for: [all sections]
- Include App.jsx, index.js, CSS files
- DO NOT ask questions - generate immediately
```

## Implementation Details

### Function: `generateBuildPrompt()`
Located in: `app/components/app-builder/ProjectManager.tsx`

**Parameters:**
- `questionnaireData`: Complete questionnaire answers
- `projectTitle`: Project title

**Returns:**
- Comprehensive prompt string with all requirements

### Auto-Chat Integration
After project creation:
1. Generate prompt using `generateBuildPrompt()`
2. Send POST request to `/api/app-projects/[id]/chat`
3. AI processes prompt with questionnaire context
4. Files are generated automatically
5. User sees files appear in project

## Benefits

1. **No Manual Prompting**: User doesn't need to ask AI to build
2. **Complete Generation**: All files created at once
3. **Matches Requirements**: Uses exact questionnaire specifications
4. **Production Ready**: Professional, polished code
5. **All Sections**: Creates all required components
6. **All Features**: Implements all special features

## User Experience

1. User completes questionnaire (6 steps)
2. Clicks "Complete"
3. Project is created
4. AI automatically starts generating files
5. User sees: "AI is now generating your app..."
6. Files appear in project automatically
7. User can check Chat tab to see generation progress

## Troubleshooting

### Issue: Files Not Generated
**Check:**
1. Browser console for errors
2. Network tab for chat API request
3. Verify AI API key is configured
4. Check Chat tab for AI response

### Issue: Only 3 Files Generated
**Solution:**
- Prompt now explicitly requires ALL files in ONE response
- System prompt emphasizes questionnaire requirements
- AI should generate all components immediately

### Issue: Files Don't Match Questionnaire
**Check:**
1. Verify questionnaire data is saved in database
2. Check system prompt includes questionnaire context
3. Review generated prompt in console logs

## Testing

1. Complete questionnaire with specific requirements:
   - Select design style: "Bold & Colorful"
   - Select color scheme: "Orange/Red"
   - Select sections: Hero, About, Portfolio, Contact
   - Select features: Contact Form, Social Media
   - Enter brand name and tagline

2. Click "Complete"

3. Verify:
   - Project is created
   - AI chat request is sent
   - Files are generated
   - Files match questionnaire requirements
   - Colors match selected scheme
   - All sections are created
   - All features are implemented

## Next Steps

If AI still doesn't generate all files:
1. Check AI provider/model capabilities
2. Verify prompt is being sent correctly
3. Review AI response in chat
4. Consider breaking into multiple requests if needed





