# Meta Pixel Tracking - Event Flow Diagram

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Application                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ├─ Imports
                              │
                ┌─────────────┴────────────────┐
                │                              │
        ┌───────▼────────┐           ┌────────▼──────────┐
        │  Landing.tsx   │           │  WebResult.tsx    │
        └────────────────┘           └───────────────────┘
                │                              │
                │                              │
        ┌───────▼────────────────────────────────────────┐
        │   src/lib/pixelTracking.ts                     │
        │                                                │
        │   ├─ initMetaPixel()                           │
        │   ├─ trackPageView()                           │
        │   ├─ trackViewContent()                        │
        │   ├─ trackInboundClick()                       │
        │   ├─ trackOutboundClick()                      │
        │   └─ trackRelatedSearchClick()                 │
        │                                                │
        └───────┬────────────────────────────────────────┘
                │
                │   window.fbq('track', 'EventName')
                │
        ┌───────▼────────────────────────────────────────┐
        │   Meta Pixel JavaScript Library                │
        │   (Loaded from Facebook CDN)                   │
        └───────┬────────────────────────────────────────┘
                │
                │   XHR/Fetch to Meta servers
                │
        ┌───────▼────────────────────────────────────────┐
        │   Meta Pixel Dashboard                         │
        │   (facebook.com/ads/manager)                   │
        └────────────────────────────────────────────────┘
```

---

## Event Flow: Landing Page → Web Results

```
User Opens Landing Page
         │
         ▼
   useEffect fires
         │
         ├─ initSession()
         ├─ trackPageView("Landing Page")  ◄── PIXEL EVENT #1
         └─ fetchData()
         
         ... page renders ...

User Clicks Related Search
         │
         ▼
   handleSearchClick() fires
         │
         ├─ trackClick(...) [internal app tracking]
         ├─ trackInboundClick(title, route, id)  ◄── PIXEL EVENT #2
         └─ navigate() [navigate to Web Results page]
         
         ... page transitions ...

User Lands on Web Results Page
         │
         ▼
   useEffect fires (initial + fetchData)
         │
         ├─ initSession()
         ├─ fetchData()
         └─ getUserCountryCode()
         
         ... results data loads ...
         
   useEffect fires (when results load)
         │
         ├─ trackViewContent(name, category, ids)  ◄── PIXEL EVENT #3
         └─ UI renders with results
```

---

## Data Flow: Each Event

### Event #1: PageView (Landing Page)

```
Landing.tsx useEffect
         │
         ▼
trackPageView("Landing Page")
         │
         ▼
initMetaPixel() [if first time]
         │
         ▼
window.fbq('track', 'PageView')
         │
         ▼
Meta Pixel Library sends to Facebook
         │
         ▼
Dashboard: Events → Web → PageView [+1]
```

### Event #2: InboundClick (Related Search)

```
handleSearchClick(search)
         │
         ▼
trackInboundClick(
  "Best Deals",
  "/wr/2",
  "search_id_123"
)
         │
         ▼
window.fbq('track', 'Link', {
  content_name: "Best Deals",
  content_category: "internal_navigation",
  content_id: "search_id_123",
  value: "/wr/2",
  currency: "USD"
})
         │
         ▼
Dashboard: Events → Web → Link [+1]
```

### Event #3: ViewContent (Web Results Page)

```
useEffect triggered by results loading
         │
         ▼
trackViewContent(
  "Web Results Page 2",
  "web_results",
  ["id1", "id2", "id3", ...]
)
         │
         ▼
window.fbq('track', 'ViewContent', {
  content_name: "Web Results Page 2",
  content_category: "web_results",
  content_ids: ["id1", "id2", "id3", ...],
  content_type: "product",
  currency: "USD"
})
         │
         ▼
Dashboard: Events → Web → ViewContent [+1]
```

---

## Component Interaction Map

```
App.tsx (Main)
     │
     └─ initMetaPixel()  [ONE TIME SETUP]
     
     ├─ Landing.tsx
     │  ├─ useEffect[init]
     │  │  └─ trackPageView("Landing Page")
     │  │
     │  └─ handleSearchClick()
     │     └─ trackInboundClick(...SEARCH...)
     │
     └─ WebResult.tsx
        ├─ useEffect[init]
        │  └─ fetchData()
        │
        └─ useEffect[results]
           └─ trackViewContent(...RESULTS...)
```

---

## Type Safety & Error Handling

```
User Action
     │
     ▼
trackPixelEvent()
     │
     ├─ Check: window.fbq exists?
     │  ├─ YES ─┐
     │  └─ NO ──┼─ Log Warning
     │          │
     │  ┌──────┘
     │  │
     ├─ Try Block
     │  ├─ Call window.fbq()
     │  ├─ Log Success to Console
     │  └─ Return
     │
     └─ Catch Block
        ├─ Log Error to Console
        └─ Continue (Non-blocking)
```

---

## State Timeline

```
INITIAL STATE
└─ Window loads
   └─ Meta Pixel script loads (from CDN)
   
LANDING PAGE FLOW
├─ User navigates to /
├─ Landing.tsx mounts
├─ useEffect fires
│  ├─ initMetaPixel() → fbq initialized
│  └─ trackPageView() → EVENT SENT
└─ Related searches render

CLICK EVENT
├─ User clicks "Best Deals"
├─ handleSearchClick() fires
├─ trackInboundClick() → EVENT SENT
└─ navigate() → route change

WEB RESULTS FLOW
├─ User navigates to /wr/2
├─ WebResult.tsx mounts
├─ useEffect[init] fires → fetchData()
├─ Supabase query → results load
├─ State updates (setResults)
├─ useEffect[results] fires
└─ trackViewContent() → EVENT SENT
```

---

## Redux/Context (Not Used - Direct Tracking)

**Why we use direct function calls instead of Redux:**

✅ **Advantages:**
- Simpler, fewer dependencies
- Faster event fire (no redux dispatch overhead)
- Works without Redux setup
- Easy to test in isolation
- Clear cause-effect in component

```
[Landing.tsx]
    │
    └─ trackPageView()  ◄── Direct function call
         │
         ├─ No Redux dispatch
         ├─ No context provider needed
         └─ fbq called immediately
```

---

## Browser DevTools Console Output

```
✅ Normal Operation:

[Meta Pixel] PageView tracked: Landing Page
[Meta Pixel] InboundClick tracked: Best Deals -> /wr/2
[Meta Pixel] ViewContent tracked: Web Results Page 2


⚠️ If Warning:

[Meta Pixel] ViewContent tracked: Web Results Page 2
(because components might unmount)


❌ If Error:

[Meta Pixel] Error tracking PageView: [error details]
(but app continues - tracking is non-blocking)
```

---

## File Dependencies

```
Landing.tsx
    │
    ├─ imports: pixelTracking.ts
    │  └─ trackPageView()
    │  └─ trackInboundClick()
    │
    └─ calls from handleSearchClick()

WebResult.tsx
    │
    ├─ imports: pixelTracking.ts
    │  └─ trackViewContent()
    │
    └─ calls from useEffect hooks

pixelTracking.ts
    │
    ├─ No dependencies (utility module)
    ├─ window.fbq (global)
    ├─ environment variables
    └─ TypeScript globals (declare global)
```

---

## Testing Checklist

```
Step 1: Verify Setup
├─ [ ] .env has VITE_META_PIXEL_ID
├─ [ ] index.html has fbq script
└─ [ ] initMetaPixel() called in App.tsx

Step 2: Console Logging
├─ [ ] Open DevTools
├─ [ ] Reload page
└─ [ ] See "[Meta Pixel]" logs

Step 3: Event Firing
├─ [ ] Go to Landing Page
├─ [ ] See "PageView tracked" log
├─ [ ] Click related search
├─ [ ] See "InboundClick tracked" log
├─ [ ] Navigate to Web Results
└─ [ ] See "ViewContent tracked" log

Step 4: Meta Debugger
├─ [ ] Go to Pixel Debugger
├─ [ ] Select your pixel
├─ [ ] Visit app pages
├─ [ ] Events appear in real-time
└─ [ ] Check event payload details
```

---

## Quick Reference

| Function | Use When | Returns |
|----------|----------|---------|
| `initMetaPixel()` | App starts (once) | void |
| `trackPageView(name)` | Page loads | void |
| `trackViewContent(name, cat, ids)` | Content viewed | void |
| `trackInboundClick(text, url, id)` | Internal link clicked | void |
| `trackOutboundClick(text, url, id)` | External link clicked | void |
| `trackRelatedSearchClick(text, url, id)` | Auto-detect internal/external | void |
| `isExternalUrl(url)` | Check if URL is external | boolean |
