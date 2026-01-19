# Meta Pixel Tracking - Code Snippets & Examples

## 📋 Copy-Paste Ready Code

### Step 1: Add to `.env`

```env
VITE_META_PIXEL_ID=your_actual_pixel_id_here
```

---

### Step 2: Add to `index.html`

Find `</head>` and add this before it:

```html
<!-- Meta Pixel Code -->
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

⚠️ **IMPORTANT:** Replace `YOUR_PIXEL_ID` (appears twice) with your actual Meta Pixel ID

---

### Step 3: Initialize in `src/main.tsx` or `src/App.tsx`

**Option A: In main.tsx (Direct initialization)**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initMetaPixel } from '@/lib/pixelTracking'

// Initialize Meta Pixel once
initMetaPixel()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Option B: In src/App.tsx (Component-based)**

```tsx
import { useEffect } from 'react'
import { initMetaPixel } from '@/lib/pixelTracking'

function App() {
  useEffect(() => {
    initMetaPixel()
  }, [])

  return (
    // Your app JSX
  )
}

export default App
```

---

## 🎯 Usage Examples

### Example 1: Track Page View

**When:** User lands on a page

```tsx
import { trackPageView } from '@/lib/pixelTracking'
import { useEffect } from 'react'

function MyPage() {
  useEffect(() => {
    trackPageView('My Page Name')
  }, [])

  return <div>Page content</div>
}
```

**Console Output:**
```
[Meta Pixel] PageView tracked: My Page Name
```

---

### Example 2: Track Content View (Search Results)

**When:** User sees multiple products/results

```tsx
import { trackViewContent } from '@/lib/pixelTracking'
import { useEffect, useState } from 'react'

function SearchResults() {
  const [results, setResults] = useState([])

  useEffect(() => {
    // Fetch results...
    setResults([...])
  }, [])

  // Track when results load
  useEffect(() => {
    if (results.length > 0) {
      const resultIds = results.map(r => r.id)
      
      trackViewContent(
        'Search Results',           // content_name
        'product_search',           // content_category
        resultIds                   // content_ids array
      )
    }
  }, [results])

  return (
    <div>
      {results.map(result => (
        <div key={result.id}>{result.name}</div>
      ))}
    </div>
  )
}
```

**Console Output:**
```
[Meta Pixel] ViewContent tracked: Search Results
```

---

### Example 3: Track Internal Link Click

**When:** User clicks link that stays within app

```tsx
import { trackInboundClick } from '@/lib/pixelTracking'
import { useNavigate } from 'react-router-dom'

function NavigationLink({ to, label, id }) {
  const navigate = useNavigate()

  const handleClick = () => {
    // Track the internal navigation
    trackInboundClick(
      label,              // search text / link label
      to,                 // target route/page
      id                  // content ID
    )
    
    // Then navigate
    navigate(to)
  }

  return <a onClick={handleClick}>{label}</a>
}
```

**Console Output:**
```
[Meta Pixel] InboundClick tracked: Best Deals -> /wr/2
```

---

### Example 4: Track External Link Click

**When:** User clicks link leaving your site

```tsx
import { trackOutboundClick } from '@/lib/pixelTracking'

function ExternalLink({ href, title, id }) {
  const handleClick = () => {
    // Track external click
    trackOutboundClick(
      title,              // link text
      href,               // external URL
      id                  // content ID
    )
    
    // Navigate externally
    window.location.href = href
  }

  return <a onClick={handleClick}>{title}</a>
}
```

**Console Output:**
```
[Meta Pixel] OutboundClick tracked: Amazon -> https://amazon.com
```

---

### Example 5: Auto-Detect Internal vs External

**When:** You want one function to handle both cases

```tsx
import { trackRelatedSearchClick } from '@/lib/pixelTracking'
import { useNavigate } from 'react-router-dom'

function SearchLink({ search }) {
  const navigate = useNavigate()

  const handleClick = () => {
    // Automatically detects if internal or external
    trackRelatedSearchClick(
      search.title,
      search.url,
      search.id
    )
    
    // Handle navigation
    if (search.url.startsWith('/')) {
      navigate(search.url)
    } else {
      window.location.href = search.url
    }
  }

  return <button onClick={handleClick}>{search.title}</button>
}
```

---

## 🏗️ Full Component Example

**Complete integration of all tracking:**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  trackPageView,
  trackViewContent,
  trackInboundClick
} from '@/lib/pixelTracking'

interface ResultItem {
  id: string
  title: string
  description: string
}

function SearchResultsPage() {
  const navigate = useNavigate()
  const [results, setResults] = useState<ResultItem[]>([])
  const [loading, setLoading] = useState(true)

  // Track PageView when page loads
  useEffect(() => {
    trackPageView('Search Results Page')
  }, [])

  // Fetch results
  useEffect(() => {
    fetchResults().then(data => {
      setResults(data)
      setLoading(false)
    })
  }, [])

  // Track ViewContent when results load
  useEffect(() => {
    if (results.length > 0 && !loading) {
      trackViewContent(
        'Search Results',
        'product',
        results.map(r => r.id)
      )
    }
  }, [results, loading])

  const handleResultClick = (result: ResultItem) => {
    // Track internal navigation
    trackInboundClick(
      result.title,
      `/details/${result.id}`,
      result.id
    )

    // Navigate
    navigate(`/details/${result.id}`)
  }

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <h1>Results</h1>
      <div>
        {results.map(result => (
          <article key={result.id}>
            <h2>{result.title}</h2>
            <p>{result.description}</p>
            <button onClick={() => handleResultClick(result)}>
              View Details
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}

export default SearchResultsPage
```

---

## 🧪 Testing Code Snippets

### Test in Console

Copy-paste these in DevTools Console:

**Check if fbq is loaded:**
```javascript
window.fbq
// Should output: ƒ fbq(...) or similar
```

**Test manual PageView:**
```javascript
window.fbq('track', 'PageView')
console.log('Manual PageView tracked')
```

**Test manual ViewContent:**
```javascript
window.fbq('track', 'ViewContent', {
  content_name: 'Test Content',
  content_category: 'test',
  content_ids: ['test1', 'test2'],
  content_type: 'product'
})
console.log('Manual ViewContent tracked')
```

---

## ⚠️ Common Mistakes & Fixes

### ❌ Mistake 1: Tracking Before Initialization

```tsx
// ❌ WRONG: Function called before initMetaPixel()
trackPageView('My Page')

useEffect(() => {
  initMetaPixel()  // ← Called too late
}, [])
```

✅ **FIX:**
```tsx
// ✅ RIGHT: Initialize first
useEffect(() => {
  initMetaPixel()  // ← Called first
}, [])

useEffect(() => {
  trackPageView('My Page')
}, [])
```

---

### ❌ Mistake 2: Missing Environment Variable

```tsx
// ❌ WRONG: ID not in .env
// .env has nothing, VITE_META_PIXEL_ID is undefined
```

✅ **FIX:**
```env
# ✅ RIGHT: Add to .env
VITE_META_PIXEL_ID=your_actual_pixel_id
```

---

### ❌ Mistake 3: Wrong Script Setup

```html
<!-- ❌ WRONG: Script in wrong place or missing -->
<body>
  <div id="root"></div>
  <!-- Meta Pixel script here - TOO LATE! -->
</body>
</html>
```

✅ **FIX:**
```html
<!-- ✅ RIGHT: Script in <head> -->
<head>
  <meta charset="UTF-8" />
  <!-- ... other meta tags ... -->
  
  <!-- Meta Pixel Code -->
  <script>
    !function(f,b,e,v,n,t,s) { ... }
  </script>
</head>
<body>
  <div id="root"></div>
</body>
</html>
```

---

### ❌ Mistake 4: Not Awaiting Results

```tsx
// ❌ WRONG: Tracking before results load
useEffect(() => {
  trackViewContent('Results', 'product', resultIds)
  setResults(data)  // ← Results not loaded yet
}, [])
```

✅ **FIX:**
```tsx
// ✅ RIGHT: Track after results load
useEffect(() => {
  if (results.length > 0) {
    trackViewContent('Results', 'product', results.map(r => r.id))
  }
}, [results])
```

---

## 📊 Data Payloads

### PageView Event

```javascript
// Sent to Meta Pixel:
{
  "event": "PageView",
  // Meta Pixel captures: URL, referrer, user agent, etc.
}
```

### ViewContent Event

```javascript
{
  "event": "ViewContent",
  "eventData": {
    "content_name": "Web Results Page 1",
    "content_category": "web_results",
    "content_ids": [
      "result_id_1",
      "result_id_2",
      "result_id_3"
    ],
    "content_type": "product",
    "currency": "USD"
  }
}
```

### InboundClick Event

```javascript
{
  "event": "Link",
  "eventData": {
    "content_name": "Best Deals",
    "content_category": "internal_navigation",
    "content_id": "search_123",
    "value": "/wr/2",
    "currency": "USD"
  }
}
```

### OutboundClick Event

```javascript
{
  "event": "Contact",
  "eventData": {
    "content_name": "Amazon Deal",
    "content_category": "outbound_click",
    "content_id": "result_456",
    "value": "https://amazon.com/...",
    "currency": "USD"
  }
}
```

---

## 🐛 Debug Tips

### Enable Verbose Logging

```tsx
import { trackPageView } from '@/lib/pixelTracking'

// All functions already log to console:
trackPageView('My Page')
// Output: [Meta Pixel] PageView tracked: My Page

// Check console for [Meta Pixel] prefix on all events
```

### Check if fbq is Initialized

```tsx
import { useEffect } from 'react'

useEffect(() => {
  console.log('fbq available?', typeof window.fbq !== 'undefined')
  console.log('fbq value:', window.fbq)
}, [])
```

### Monitor Network Requests

1. Open DevTools → Network tab
2. Filter by "facebook" or "fbevents"
3. You should see requests to `facebook.com` when events fire
4. Check "Initiator" to see which event triggered it

---

## 📚 Function Reference

```typescript
// Initialize once
initMetaPixel(): void

// Track page loads
trackPageView(pageName: string): void

// Track content viewing
trackViewContent(
  contentName: string,
  contentCategory: string,
  contentIds: string[]
): void

// Track internal navigation
trackInboundClick(
  searchText: string,
  targetPage: string,
  contentId: string
): void

// Track external navigation
trackOutboundClick(
  linkText: string,
  externalUrl: string,
  contentId: string
): void

// Auto-detect internal/external
trackRelatedSearchClick(
  searchText: string,
  targetUrl: string,
  contentId: string
): void

// Helper: Check if URL is external
isExternalUrl(url: string): boolean
```

---

## ✅ Pre-Launch Checklist

Before going live:

- [ ] Environment variable `VITE_META_PIXEL_ID` set
- [ ] Meta Pixel script in `index.html`
- [ ] `initMetaPixel()` called once in app
- [ ] Console shows no errors
- [ ] Test page loads in debugger
- [ ] See PageView events in debugger
- [ ] See ViewContent events when results load
- [ ] See InboundClick events on link clicks
- [ ] Verify all events appear in Meta dashboard after 24 hours

---

## 🆘 Troubleshooting

**Q: Events not showing in dashboard?**
A: Check fbq in console, verify pixel ID, wait 24-48 hours

**Q: "fbq is not defined" error?**
A: Ensure Meta Pixel script is in index.html and page loaded

**Q: Events showing as "Unmatched" in debugger?**
A: Normal for custom events, use ViewContent/Track events instead

**Q: Want to disable tracking in dev?**
```tsx
const isProduction = import.meta.env.PROD

if (isProduction) {
  initMetaPixel()
}
```
