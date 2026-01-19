# Meta Pixel Tracking - Quick Reference Card

## 🎯 One-Page Overview

### What We Implemented

```
Landing Page Load
       ↓
trackPageView("Landing Page")
       ↓
Meta Pixel: PageView ✓

---

User Clicks Related Search
       ↓
trackInboundClick(title, route, id)
       ↓
Meta Pixel: Link (InboundClick) ✓
       ↓
Navigate to Web Results Page

---

Web Results Load
       ↓
trackViewContent(name, category, ids)
       ↓
Meta Pixel: ViewContent ✓
```

---

## 📦 Core Module Functions

### Import
```tsx
import {
  initMetaPixel,           // Initialize once
  trackPageView,           // Page loads
  trackViewContent,        // Content viewed
  trackInboundClick,       // Internal link
  trackOutboundClick,      // External link
  trackRelatedSearchClick, // Auto-detect
  isExternalUrl            // Helper
} from '@/lib/pixelTracking'
```

### Usage

| Function | Usage | Example |
|----------|-------|---------|
| `initMetaPixel()` | Once on app start | `useEffect(() => initMetaPixel(), [])` |
| `trackPageView(name)` | When page loads | `trackPageView('Landing Page')` |
| `trackViewContent(name, cat, ids)` | When results load | `trackViewContent('Results', 'product', resultIds)` |
| `trackInboundClick(text, url, id)` | Internal link click | `trackInboundClick('Deal', '/wr/2', 'id123')` |
| `trackOutboundClick(text, url, id)` | External link click | `trackOutboundClick('Amazon', 'https://...', 'id123')` |

---

## 🗂️ File Changes

### NEW FILE: src/lib/pixelTracking.ts
Core tracking module (240 lines)
- ✅ Ready to use
- ✅ Type-safe
- ✅ Error handling
- ✅ Console logging

### MODIFIED: src/pages/Landing.tsx
- Line 6: Added imports
- Line 35: `trackPageView("Landing Page")`
- Line 181: `trackInboundClick(...)`

### MODIFIED: src/pages/WebResult.tsx
- Line 6: Added import
- Line 115-125: ViewContent tracking

---

## 🚀 3-Minute Setup

### 1. .env
```env
VITE_META_PIXEL_ID=your_pixel_id
```

### 2. index.html
Add before `</head>`:
```html
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.queue=[];n.version='2.0';
  n.queue.push(['setPixelId','YOUR_PIXEL_ID']);
  t=b.createElement(e);t.async=!0;
  t.src=v+'?id=YOUR_PIXEL_ID';
  s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
</script>
```

### 3. src/App.tsx or src/main.tsx
```tsx
import { initMetaPixel } from '@/lib/pixelTracking'

useEffect(() => {
  initMetaPixel()
}, [])
```

**DONE!** ✅

---

## 🧪 Verify It Works

### Console Check
```javascript
// See these logs:
// [Meta Pixel] PageView tracked: Landing Page
// [Meta Pixel] InboundClick tracked: Best Deals -> /wr/2
// [Meta Pixel] ViewContent tracked: Web Results Page 1
```

### Meta Debugger Check
1. Go to facebook.com/ads/manager
2. Tools → Pixel Debugger
3. Select your pixel
4. Visit your app
5. See events in real-time

---

## 🎯 What's Being Tracked

### Landing Page
```
When: Page loads
Event: PageView
Data Sent:
  - Page name: "Landing Page"
  - URL: current URL
  - Referrer: where user came from
  - Device: mobile/desktop
```

### Related Search Click (Landing)
```
When: User clicks a related search
Event: InboundClick (Link)
Data Sent:
  - content_name: Search text (e.g., "Best Deals")
  - content_id: Search ID
  - value: Target page (e.g., "/wr/2")
```

### Web Results Page Load
```
When: Results from database load
Event: ViewContent
Data Sent:
  - content_name: "Web Results Page 2"
  - content_category: "web_results"
  - content_ids: [id1, id2, id3, ...]
  - Page number
```

---

## 📊 Events Dashboard

What you'll see in Meta Pixel Dashboard:

```
Events
├─ PageView
│  └─ Landing Page: 1,234 views
│
├─ Link (InboundClick)
│  └─ Best Deals: 345 clicks
│  └─ Top Offers: 289 clicks
│
└─ ViewContent
   └─ Web Results Page 1: 567 views
   └─ Web Results Page 2: 432 views
```

---

## ❌ Common Issues

| Issue | Solution |
|-------|----------|
| "Meta Pixel not initialized" | Call `initMetaPixel()` first |
| No events in dashboard | Add Pixel ID to .env and index.html |
| Events not showing | Check [Meta Pixel Debugger](https://business.facebook.com/tools/pixel-debugger) |
| fbq is not defined | Ensure script is in `<head>` of index.html |

---

## 📚 Documentation Quick Links

| Document | Content | Read Time |
|----------|---------|-----------|
| [QUICK_START_PIXEL.md](QUICK_START_PIXEL.md) | Step-by-step setup | 5 min |
| [PIXEL_TRACKING_GUIDE.md](PIXEL_TRACKING_GUIDE.md) | Full reference | 15 min |
| [PIXEL_TRACKING_EXAMPLES.md](PIXEL_TRACKING_EXAMPLES.md) | Code examples | 15 min |
| [PIXEL_TRACKING_ARCHITECTURE.md](PIXEL_TRACKING_ARCHITECTURE.md) | System design | 20 min |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) | What was done | 10 min |

---

## 🔗 Code Locations

| Feature | File | Line |
|---------|------|------|
| Core module | [src/lib/pixelTracking.ts](src/lib/pixelTracking.ts) | - |
| PageView tracking | [src/pages/Landing.tsx](src/pages/Landing.tsx#L35) | 35 |
| InboundClick tracking | [src/pages/Landing.tsx](src/pages/Landing.tsx#L181) | 181 |
| ViewContent tracking | [src/pages/WebResult.tsx](src/pages/WebResult.tsx#L115-L125) | 115-125 |

---

## 🎓 Implementation Pattern

All events follow this pattern:

```tsx
// Step 1: When to fire?
useEffect(() => {
  // When [condition]
  
  // Step 2: Track event
  trackEventType(data)
  
  // Step 3: Continue app logic
  navigate() // or handleClick() // or etc
}, [dependencies])
```

---

## 🚀 Next Steps

### Immediate (Done!)
- ✅ Core module created
- ✅ Landing page tracking
- ✅ Web results tracking
- ✅ Related search tracking

### Soon (Optional)
- Add OutboundClick to web results
- Add tracking to Blog pages
- Add custom events as needed

### Later (As needed)
- Revenue tracking (Purchase events)
- Conversion tracking
- Custom audience creation
- Retargeting campaigns

---

## 💡 Pro Tips

**Tip 1: Test Before Deploy**
```tsx
// In dev, check console logs
// Don't deploy if you see errors
```

**Tip 2: Use Pixel Debugger**
Real-time event monitoring is worth it

**Tip 3: Wait 24 Hours**
Dashboard data updates after 24-48 hours

**Tip 4: Check Conversions**
Set up conversion tracking in Meta dashboard

**Tip 5: Build Audiences**
Use ViewContent events for retargeting

---

## ✅ Checklist: Before Going Live

```
Setup:
☐ Pixel ID in .env
☐ Script in index.html  
☐ initMetaPixel() in app

Testing:
☐ Console shows [Meta Pixel] logs
☐ No errors in DevTools
☐ Pixel Debugger shows events
☐ Test on different pages

Review:
☐ Read QUICK_START_PIXEL.md
☐ Verify all 3 events fire
☐ Check privacy compliance
☐ Inform team

Deploy:
☐ Code reviewed
☐ Tested in staging
☐ Ready to launch
```

---

## 📞 Need Help?

1. **Check Console** → Look for `[Meta Pixel]` errors
2. **Read Examples** → See [PIXEL_TRACKING_EXAMPLES.md](PIXEL_TRACKING_EXAMPLES.md)
3. **Check Setup** → Follow [QUICK_START_PIXEL.md](QUICK_START_PIXEL.md)
4. **Debug Flow** → Review [PIXEL_TRACKING_ARCHITECTURE.md](PIXEL_TRACKING_ARCHITECTURE.md)

---

**Status: ✅ READY TO USE**

All code is production-ready. Just add your Pixel ID and initialize!
