# Header Grey Issue - Troubleshooting Guide

## Problem
The header appears grey on some laptops instead of the intended glassmorphism effect.

## Root Cause
The header uses the `.glass` CSS class which relies on `backdrop-filter: blur()` for the glass effect. When this CSS feature is:
- Not supported by the browser
- Disabled for performance reasons
- Blocked by hardware acceleration settings
- Not working due to browser flags

The fallback background color `rgba(17, 25, 40, 0.35)` appears as a solid grey.

## How to Replicate on Mac

### Method 1: Disable Backdrop-Filter in Chrome DevTools
1. Open Chrome DevTools (F12 or Cmd+Option+I)
2. Go to **Settings** (gear icon) → **Experiments**
3. Search for "backdrop-filter" and disable it
4. Or use Command Palette (Cmd+Shift+P) → "Show Rendering"
5. Find "Emulate CSS media feature backdrop-filter" → Set to "disabled"

### Method 2: Use Browser Flags
1. Open Chrome with flags: `open -a "Google Chrome" --args --disable-background-networking`
2. Or disable hardware acceleration:
   - Chrome Settings → Advanced → System → Turn off "Use hardware acceleration when available"

### Method 3: Use Older Browser
- Use Safari 8 or older (doesn't support backdrop-filter)
- Use Firefox with `layout.css.backdrop-filter.enabled` set to false in `about:config`

### Method 4: CSS Override in DevTools
1. Inspect the header element
2. In Styles panel, find `.glass` class
3. Uncheck `backdrop-filter` property
4. You'll see the grey background appear

## Solution Options

### Option 1: Enhanced Fallback (Recommended)
Add a better fallback that detects backdrop-filter support and provides an alternative styling.

### Option 2: Feature Detection
Use JavaScript to detect backdrop-filter support and apply alternative classes.

### Option 3: Progressive Enhancement
Use a solid dark background as base, then enhance with glass effect if supported.

## Testing Checklist
- [ ] Test in Chrome with backdrop-filter disabled
- [ ] Test in Firefox (may need flag enabled)
- [ ] Test in Safari (should work natively)
- [ ] Test with hardware acceleration disabled
- [ ] Test on different screen resolutions
- [ ] Test with reduced motion preferences

