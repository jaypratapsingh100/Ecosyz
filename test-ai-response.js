// Test what the AI actually generates
const testPrompt = `Create a complete, production-ready portfolio application with the following specifications:

**Brand & Content:**
- Brand Name: Test Portfolio
- Tagline: My Amazing Work
- Target Audience: general

**Design Requirements:**
- Design Style: modern-minimal
- Color Scheme: blue
- Layout Style: single-page

**Required Sections (create components for ALL of these):**
- portfolio
- services
- contact

**Special Features (implement ALL of these):**
- contact-form

**FILE GENERATION REQUIREMENTS - CRITICAL:**
- Generate ALL files in ONE response
- Use the exact format: \`\`\`file:src/ComponentName.jsx\`\`\`
- Create separate component files: Portfolio.jsx, Services.jsx, Contact.jsx
- MUST include: App.jsx (imports ALL components), index.js (renders App)
- Each component should be complete, functional React component

🚨 START GENERATING NOW - Create the complete application with ALL files in ONE response! 🚨`;

console.log('Test prompt length:', testPrompt.length);
console.log('This should generate multiple files in the format:');
// console.log(testPrompt);