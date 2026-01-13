# Testing Guide - Open Resources Chat Features

## 🚀 Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

2. **Navigate to:** `http://localhost:3000/openresources`

3. **Make sure you have OPENROUTER_API_KEY set** in your `.env` file (optional, but needed for AI features)

---

## ✅ Feature Testing Checklist

### 1. Quick Action Buttons

**Test Steps:**
1. Search for any topic (e.g., "drone", "ride hailing", "machine learning")
2. Wait for results to load
3. Look below the chat input field
4. You should see 7 quick action buttons:
   - "Compare top 3 resources"
   - "Which is best for beginners?"
   - "Show me code examples"
   - "Create a learning path"
   - "Summarize all resources"
   - "Find similar resources"
   - "What are the key differences?"

**Expected Result:**
- ✅ Buttons appear above the input field
- ✅ Clicking a button fills the input field
- ✅ Input field gets focus automatically
- ✅ Buttons only show when search results exist

**Test:** Click each button and verify it fills the input correctly.

---

### 2. Search Summary Below Search Bar

**Test Steps:**
1. Perform a search (e.g., "drone")
2. Wait for results to load
3. Look right below the search bar

**Expected Result:**
- ✅ A summary box appears with gradient background
- ✅ Shows helpful overview of the search topic
- ✅ Mentions resource types and sources
- ✅ Loading spinner appears briefly while generating

**Test:** Try different searches and verify summaries are relevant.

---

### 3. Clickable Resource Citations

**Test Steps:**
1. Search for resources (e.g., "ride hailing")
2. In the chat, ask: "Compare Resource 1 and Resource 2"
3. Wait for AI response
4. Look for clickable "Resource 1", "Resource 2" links in the response

**Expected Result:**
- ✅ Resource numbers are clickable (green, underlined)
- ✅ Clicking scrolls to the resource card
- ✅ Resource card highlights briefly (green ring)
- ✅ Hover shows tooltip with resource title

**Test:** Click different resource citations and verify scrolling works.

---

### 4. Copy Citations Feature

**Test Steps:**
1. Ask a question that mentions resources (e.g., "Tell me about Resource 1")
2. Wait for response with citations
3. Look for "📋 Copy Citations" button
4. Click it

**Expected Result:**
- ✅ Button shows citation count (e.g., "Copy Citations (3)")
- ✅ Clicking copies citations to clipboard
- ✅ Button shows "✓ Citations Copied!" feedback
- ✅ Citations formatted as: `[1] Title - URL`

**Test:** Paste clipboard and verify citations are formatted correctly.

---

### 5. Academic Citation Formats

**Test Steps:**
1. Get a response with citations
2. Find the citation section below the message
3. Click the style dropdown (shows "SIMPLE" by default)
4. Select different formats: APA, MLA, Chicago, BibTeX
5. Click "Copy Citations" for each format

**Expected Result:**
- ✅ Dropdown shows 5 options: Simple, APA, MLA, Chicago, BibTeX
- ✅ Preview updates when style changes
- ✅ Copied citations match selected format
- ✅ APA format: `Author, A. A. (Year). Title. Source.`
- ✅ MLA format: `Author. "Title." Source, Year, URL.`
- ✅ BibTeX format: `@article{...}`

**Test:** Copy each format and verify formatting is correct.

---

### 6. Download Citations

**Test Steps:**
1. Get citations in a message
2. Click "💾 Download" button
3. Check your downloads folder

**Expected Result:**
- ✅ File downloads automatically
- ✅ Filename: `citations-{style}-{timestamp}.txt` or `.bib`
- ✅ File contains all citations in selected format
- ✅ File opens correctly in text editor

**Test:** Download and open the file to verify content.

---

### 7. Export All Citations

**Test Steps:**
1. Have multiple messages with citations
2. Look at chat header (top right)
3. Find the download icon button
4. Click it

**Expected Result:**
- ✅ Button appears when citations exist
- ✅ Collects all citations from entire conversation
- ✅ Removes duplicates automatically
- ✅ Downloads file with all citations

**Test:** Have multiple conversations, then export all.

---

### 8. Follow-up Question Suggestions

**Test Steps:**
1. Ask a question (e.g., "Compare top 3 resources")
2. Wait for AI response
3. Look below the response

**Expected Result:**
- ✅ Shows "💡 Follow-up questions:" section
- ✅ 3 suggested questions appear
- ✅ Questions are relevant to the response
- ✅ Clicking fills input field
- ✅ Questions reference mentioned resources

**Test:** Click follow-up questions and verify they work.

---

### 9. Code Snippet Extraction

**Test Steps:**
1. Ask: "Show me code examples"
2. Wait for response with code blocks
3. Look for formatted code blocks

**Expected Result:**
- ✅ Code blocks have dark background
- ✅ Language label shown (e.g., "javascript", "python")
- ✅ "📋 Copy" button for each block
- ✅ Clicking copy button copies code
- ✅ Button shows "✓ Copied" feedback

**Test:** Copy code and paste to verify it's correct.

---

### 10. Table Rendering

**Test Steps:**
1. Ask: "Compare top 3 resources"
2. Wait for response with comparison table
3. Look for formatted table

**Expected Result:**
- ✅ Table has proper borders and styling
- ✅ Headers are highlighted (emerald color)
- ✅ Rows have hover effects
- ✅ Table is scrollable if wide
- ✅ Dark theme matches UI

**Test:** Verify tables render correctly for comparisons.

---

### 11. Chat Reset on New Search

**Test Steps:**
1. Search for "ride hailing"
2. Ask a question in chat
3. Search for "drone" (new search)
4. Check chat messages

**Expected Result:**
- ✅ Chat messages clear when new search happens
- ✅ Welcome message updates with new search query
- ✅ Chat context uses only new search results
- ✅ Previous search context is removed

**Test:** Perform multiple searches and verify chat resets.

---

## 🐛 Common Issues & Solutions

### Issue: Citations not appearing
**Solution:** Make sure AI response mentions resources by number (e.g., "Resource 1")

### Issue: Code blocks not formatting
**Solution:** Check that AI response uses markdown code blocks: ```language

### Issue: Tables not rendering
**Solution:** Verify AI response uses markdown table format: | col1 | col2 |

### Issue: Summary not generating
**Solution:** Check browser console for errors, verify API key is set

### Issue: Export not working
**Solution:** Check browser download permissions, verify citations exist

---

## 📊 Test Scenarios

### Scenario 1: Complete Workflow
1. Search "machine learning"
2. Click "Compare top 3 resources"
3. Click a resource citation
4. Copy citations in APA format
5. Download citations
6. Search "deep learning" (new search)
7. Verify chat reset

### Scenario 2: Citation Formats
1. Get citations in response
2. Test each format: Simple, APA, MLA, Chicago, BibTeX
3. Copy each format
4. Verify formatting is correct
5. Download each format

### Scenario 3: Code & Tables
1. Ask "Show me code examples"
2. Copy code snippets
3. Ask "Compare resources in a table"
4. Verify table renders correctly

---

## ✅ Success Criteria

All features work correctly if:
- ✅ No console errors
- ✅ All buttons respond to clicks
- ✅ Citations copy correctly
- ✅ Downloads work
- ✅ Chat resets on new search
- ✅ Code blocks format properly
- ✅ Tables render correctly
- ✅ Follow-up questions appear
- ✅ Resource links scroll correctly

---

## 🔍 Debugging Tips

1. **Open Browser Console** (F12) to see errors
2. **Check Network Tab** for API call failures
3. **Verify API Key** is set in `.env` file
4. **Check localStorage** for stored settings
5. **Clear cache** if issues persist

---

## 📝 Notes

- Citation formats follow standard academic conventions
- Code blocks support all common languages
- Tables auto-detect markdown format
- All features work without API key (with fallbacks)
- Mobile responsive design included

---

## 🎯 Quick Test Commands

```bash
# Start dev server
npm run dev

# Check for linting errors
npm run lint

# Build for production
npm run build
```

---

Happy Testing! 🚀

