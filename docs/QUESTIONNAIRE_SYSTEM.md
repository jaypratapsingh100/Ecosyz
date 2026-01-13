# Questionnaire System Implementation

## Overview
The questionnaire system collects detailed requirements from users before they start building their app, enabling the AI to generate higher-quality, more personalized applications.

## Features

### 1. Multi-Step Questionnaire Wizard
A comprehensive 6-step questionnaire that collects:
- **Step 1**: App type and main purpose
- **Step 2**: Target audience and technical level
- **Step 3**: Design preferences (style, colors, layout)
- **Step 4**: Required sections and special features
- **Step 5**: Content and branding information
- **Step 6**: Technical preferences (framework, mobile, performance)

### 2. Database Schema Updates
Added fields to `AppProject` model:
- `questionnaireData` (JSON) - Complete questionnaire answers
- `appType` - Type of app (portfolio, business, ecommerce, etc.)
- `targetAudience` - Target audience (general, b2b, b2c, etc.)
- `designStyle` - Design preference (modern-minimal, bold-colorful, etc.)
- `colorScheme` - Color preference (blue, orange-red, green-teal, etc.)
- `layoutStyle` - Layout preference (single-page, multi-page, etc.)
- `requiredFeatures` - Array of required features
- `brandName` - Brand/company name
- `tagline` - Main tagline/message
- `keyPoints` - Key points to highlight

### 3. Integration Points

#### Project Creation Flow
- When users click "Create Project", they're shown the questionnaire wizard first
- Users can skip the questionnaire if they prefer
- Questionnaire data is saved to the database when creating the project

#### AI Code Generation
- Enhanced system prompt includes questionnaire context
- AI uses questionnaire data to:
  - Apply appropriate design styles
  - Use correct color schemes
  - Create layouts matching user preferences
  - Include required sections and features
  - Tailor content for target audience
  - Follow technical preferences

### 4. Quality Improvements

The enhanced system prompt includes:
- **Quality Standards**: Modern design patterns, responsive design, accessibility, performance optimization
- **Design Requirements**: Specific guidelines based on selected design style, color scheme, and target audience
- **Layout Guidelines**: Instructions for creating layouts matching user preferences

## Usage

### For Users
1. Click "Create Project" in the app builder
2. Complete the questionnaire (or skip)
3. Project is created with questionnaire data
4. AI chat uses questionnaire context for better code generation

### For Developers
The questionnaire data is automatically included in:
- Project creation API (`/api/app-projects`)
- Chat API (`/api/app-projects/[id]/chat`)
- System prompts for AI code generation

## Benefits

1. **Better App Quality**: AI generates apps that match user requirements from the start
2. **Personalization**: Apps are tailored to user preferences, audience, and purpose
3. **Consistency**: Design choices are consistent throughout the app
4. **Efficiency**: Users don't need to repeatedly specify preferences in chat
5. **Professional Results**: Quality guidelines ensure professional, modern apps

## Technical Details

### Component: `QuestionnaireWizard.tsx`
- Multi-step form with progress tracking
- Validates required fields before proceeding
- Stores all answers in state
- Calls `onComplete` callback with questionnaire data

### API Updates
- `POST /api/app-projects` - Accepts questionnaire fields
- `GET /api/app-projects/[id]/chat` - Includes questionnaire data in project query
- Enhanced system prompt uses questionnaire context

### Database Migration
Run `pnpm prisma db push` to apply schema changes.

## Future Enhancements

1. **Template Suggestions**: Suggest templates based on questionnaire answers
2. **Pre-filled Content**: Generate initial content based on questionnaire
3. **Design Preview**: Show design preview based on selected preferences
4. **Questionnaire Editing**: Allow users to update questionnaire after project creation
5. **Analytics**: Track which questionnaire choices lead to better app quality





