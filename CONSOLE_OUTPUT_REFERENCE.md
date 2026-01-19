# Console Output Reference

## Expected Console Output When Everything Works

### Scenario 1: User Opens Landing Page

```
[Meta Pixel] PageView tracked: Landing Page
```

**What's happening:**
- Landing page loaded
- Component mounted
- Meta Pixel event sent to Facebook
- Ready for user to click related searches

---

### Scenario 2: User Clicks "Best Deals" Related Search

```
Tracking click: {
  clickType: 'related_search',
  sessionId: 'session_1234567890_abc123',
  itemName: 'Best Deals',
  page: '/landing'
}
Click tracked successfully: [...]

[Meta Pixel] InboundClick tracked: Best Deals -> /wr/2
```

**What's happening:**
- Internal app tracking fired (Supabase)
- Meta Pixel tracking fired (Facebook)
- Navigation begins to Web Results page

---

### Scenario 3: User Lands on Web Results Page (Page 2)

```
WebResult page 2 wbr abc123 loaded - waiting for user click

[Meta Pixel] ViewContent tracked: Web Results Page 2
```

**What's happening:**
- Web Results page loaded
- Results data fetched from Supabase
- All product IDs collected
- Meta Pixel event sent to Facebook with list of 10-20 product IDs

---

## Complete Session Flow (Full Console Log)

```
/* User opens app */
[Meta Pixel] PageView tracked: Landing Page

/* User clicks "Best Deals" */
Tracking click: {
  clickType: 'related_search',
  sessionId: 'session_1707123456_x7a9b2c',
  itemName: 'Best Deals',
  page: '/landing'
}
Click tracked successfully: [Array]

[Meta Pixel] InboundClick tracked: Best Deals -> /wr/2

/* User lands on Web Results Page 2 */
WebResult page 2 wbr k9x2p1 loaded - waiting for user click

[Meta Pixel] ViewContent tracked: Web Results Page 2

/* User clicks a web result */
Tracking click: {
  clickType: 'web_result',
  sessionId: 'session_1707123456_x7a9b2c',
  itemName: 'Amazon - Best Deals',
  page: '/wr/2/k9x2p1',
  lid: 1
}
Click tracked successfully: [Array]
```

---

## Error Messages & What They Mean

### Warning: "Meta Pixel not initialized"

```
[Meta Pixel] Meta Pixel not initialized
```

**Cause:** Function called before `initMetaPixel()` was run

**Fix:**
```tsx
// Make sure this runs FIRST:
useEffect(() => {
  initMetaPixel()
}, [])
```

---

### Error: "Error tracking PageView"

```
[Meta Pixel] Error tracking PageView: TypeError: window.fbq is not a function
```

**Cause:** Meta Pixel script not loaded from index.html

**Fix:**
1. Check that script is in `<head>` of index.html
2. Verify script is not broken
3. Check browser Network tab for fbevents.js

---

### Error: "Error tracking ViewContent"

```
[Meta Pixel] Error tracking ViewContent: 
SyntaxError: Unexpected token
```

**Cause:** Data being sent has invalid format

**Fix:** Should never happen - our code validates. Check pixelTracking.ts

---

## TypeScript/Build Errors

### "Cannot find module 'pixelTracking'"

```
ERROR in src/pages/Landing.tsx(6,9):
error TS2307: Cannot find module '@/lib/pixelTracking'
```

**Fix:**
1. Restart TypeScript server (Ctrl+Shift+P → "TypeScript: Restart TS Server")
2. Verify file exists at `src/lib/pixelTracking.ts`
3. Clear node_modules and reinstall

---

## What SHOULDN'T Appear in Console

❌ **These errors indicate a problem:**

```
// ❌ BAD: fbq undefined
[Meta Pixel] Meta Pixel not initialized

// ❌ BAD: Script not found
Failed to load resource: fbevents.js

// ❌ BAD: CORS error
Access-Control-Allow-Origin error

// ❌ BAD: Pixel ID missing
pixel_id is undefined or null
```

✅ **These are OK:**

```
// ✅ OK: Normal traffic
Cross-Origin Request Blocked: The Same Origin Policy...
(This is normal security message)

// ✅ OK: Third-party scripts loading
Loading third-party script

// ✅ OK: Deprecation warnings
(Unrelated to our pixel tracking)
```

---

## Debug Code Snippets (Paste in Console)

### Check if fbq is loaded

```javascript
typeof window.fbq
// Output: "function" ✅
// or "undefined" ❌
```

### Check pixel ID

```javascript
window.fbq
// Look for pixel ID in initialization
```

### Fire manual PageView

```javascript
window.fbq('track', 'PageView')
console.log('Manual PageView fired')
```

### Check if tracking is working

```javascript
// Open DevTools Console
// Go to Network tab
// Filter by "facebook" or "fbevents"
// You should see requests to:
// - connect.facebook.net
// - facebook.com/tr/
```

### Get all fbq events

```javascript
// In console, add this before events fire:
const originalFbq = window.fbq
window.fbq = function(...args) {
  console.log('fbq called:', args)
  originalFbq.apply(this, args)
}

// Now all fbq calls will log before firing
```

---

## Expected Network Activity

### In Browser DevTools → Network Tab

**When page loads:**
```
Request to: connect.facebook.net/fbevents.js
Status: 200
Size: ~40KB
```

**When events fire:**
```
Multiple requests to: facebook.com/tr/?...
Status: 200 or 204
Size: Usually very small (< 1KB)

POST /api/logs (if using internal tracking)
Status: 200
```

---

## Common Questions

### Q: Why do I see two tracking calls?

```
Tracking click: { ... }  ← Internal app tracking (Supabase)
[Meta Pixel] ...         ← Meta Pixel tracking (Facebook)
```

**A:** Intentional! We track in two systems:
1. Your database (Supabase) for analytics
2. Meta Pixel (Facebook) for ads

---

### Q: Why doesn't the console show fbq directly?

```javascript
// You won't see this in logs:
window.fbq('track', 'PageView')

// But you'll see:
[Meta Pixel] PageView tracked: Landing Page
```

**A:** Our wrapper function logs a cleaner message. The fbq call still happens behind the scenes.

---

### Q: Can I disable console logging?

```tsx
// Option 1: Remove console.log statements from pixelTracking.ts
// Option 2: Wrap in production check
if (import.meta.env.DEV) {
  console.log('[Meta Pixel]', message)
}
```

---

## Testing with Real Events

### Step-by-step to generate all 3 events:

**1. Open your app**
```
Console shows: [Meta Pixel] PageView tracked: Landing Page ✅
```

**2. Click a related search**
```
Console shows: [Meta Pixel] InboundClick tracked: [Search] -> /wr/X ✅
```

**3. Wait for Web Results to load**
```
Console shows: [Meta Pixel] ViewContent tracked: Web Results Page X ✅
```

**All 3 shown? Perfect!** 🎉

---

## Troubleshooting Checklist

- [ ] See `[Meta Pixel]` logs in console?
  - YES → Next step
  - NO → Add initMetaPixel() call

- [ ] Logs appear immediately?
  - YES → Good, pixel is responsive
  - NO → Check if fbq script loaded

- [ ] See two tracking calls (internal + pixel)?
  - YES → Perfect, both systems working
  - NO → Check Supabase connection

- [ ] See events in Meta Pixel Debugger?
  - YES → Everything working! ✅
  - NO → Wait 5-10 minutes for sync

---

## Production Deployment Checklist

Before deploying to production:

```
[ ] Run app in dev mode
[ ] Open console
[ ] Navigate Landing → Related Search → Web Results
[ ] Verify all 3 events appear in console
[ ] Check Meta Pixel Debugger shows events
[ ] No error messages in console
[ ] Ready for production deploy ✅
```

---

## Sample Full Session Log

```
=== SESSION START ===
App initialized at 2024-01-19 10:23:45

User navigates to Landing Page
[Meta Pixel] PageView tracked: Landing Page

User hovers over related searches
(No log - just hovering)

User clicks "Best Deals"
Tracking click: {
  clickType: 'related_search',
  sessionId: 'session_1705666225_x7k2m9n',
  itemName: 'Best Deals',
  page: '/landing'
}
Click tracked successfully: [{
  id: 'click_uuid_123',
  session_id: 'session_1705666225_x7k2m9n',
  click_type: 'related_search',
  item_name: 'Best Deals',
  page: '/landing',
  created_at: '2024-01-19T10:23:47.123Z'
}]

[Meta Pixel] InboundClick tracked: Best Deals -> /wr/2

Page transitions to /wr/2/abc123

WebResult page 2 wbr abc123 loaded - waiting for user click

(Loading results from database...)

[Meta Pixel] ViewContent tracked: Web Results Page 2

User sees 10 results displayed

User scrolls and sees more details
(No log - just viewing)

User clicks first result
Tracking click: {
  clickType: 'web_result',
  sessionId: 'session_1705666225_x7k2m9n',
  itemName: 'Amazon - Best Deals of 2024',
  page: '/wr/2/abc123',
  lid: 1,
  original_link: 'https://amazon.com/...'
}
Click tracked successfully: [{
  id: 'click_uuid_456',
  session_id: 'session_1705666225_x7k2m9n',
  click_type: 'web_result',
  item_name: 'Amazon - Best Deals of 2024',
  original_link: 'https://amazon.com/...',
  created_at: '2024-01-19T10:24:12.456Z'
}]

User navigates to Amazon
(Session ends)

=== SESSION END ===
```

---

## Meta Pixel Debugger View

What you'll see in [Meta Pixel Debugger](https://business.facebook.com/tools/pixel-debugger):

```
PIXEL: Your Pixel ID (12345678901234)

EVENTS (Real-time):
├─ PageView
│  ├─ Timestamp: Jan 19, 10:23:45
│  └─ Source: Browser
│
├─ Link (InboundClick)
│  ├─ Timestamp: Jan 19, 10:24:01
│  ├─ content_name: Best Deals
│  ├─ content_id: search_123
│  └─ value: /wr/2
│
├─ ViewContent
│  ├─ Timestamp: Jan 19, 10:24:05
│  ├─ content_name: Web Results Page 2
│  ├─ content_ids: [result_1, result_2, ...]
│  └─ content_category: web_results
│
└─ (More events as user interacts)
```

---

**Bookmark this page for quick reference while testing!**
