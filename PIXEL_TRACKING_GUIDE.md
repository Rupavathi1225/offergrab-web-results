# Meta Pixel Event Tracking Implementation Guide

## Overview

Clean, best-practice Meta Pixel (Facebook Pixel) event tracking has been implemented across your React app. This guide explains the architecture and usage.

---

## 📁 File Structure

### New File Created
- **[src/lib/pixelTracking.ts](src/lib/pixelTracking.ts)** - Core Meta Pixel tracking module

### Updated Files
- **[src/pages/Landing.tsx](src/pages/Landing.tsx)** - PageView tracking on load + InboundClick for related searches
- **[src/pages/WebResult.tsx](src/pages/WebResult.tsx)** - ViewContent tracking on page load

---

## 🎯 Implementation Details

### 1. **Landing Page - PageView Tracking**

**File:** [src/pages/Landing.tsx](src/pages/Landing.tsx#L34-L40)

When user lands on the Landing page:
```tsx
useEffect(() => {
  initSession();
  trackPageView("Landing Page");  // ← Meta Pixel PageView tracked
  fetchData();
  getUserCountryCode().then(setUserCountry);
}, []);
```

**What happens:** Meta Pixel records that a user viewed the landing page.

---

### 2. **Web Results Page - ViewContent Tracking**

**File:** [src/pages/WebResult.tsx](src/pages/WebResult.tsx#L115-L125)

When user lands on Web Results page and results load:
```tsx
// Track ViewContent when results are loaded
useEffect(() => {
  if (results.length > 0 && !loading) {
    const resultIds = results.map(r => r.id);
    trackViewContent(
      `Web Results Page ${wrPage}`,
      'web_results',
      resultIds
    );
  }
}, [results, loading]);
```

**What happens:** Meta Pixel records all product/result IDs viewed on this page.

---

### 3. **Related Searches - InboundClick Tracking**

**File:** [src/pages/Landing.tsx](src/pages/Landing.tsx#L180-L185)

When user clicks a related search that navigates to another internal page:
```tsx
const handleSearchClick = (search: RelatedSearch) => {
  setClicked(true);
  trackClick("related_search", search.id, search.title, "/landing");
  trackInboundClick(search.title, `/wr/${search.target_wr}`, search.id);  // ← InboundClick
  navigate(`/wr/${search.target_wr}/${generateRandomToken(8)}`);
};
```

**What happens:** Meta Pixel tracks internal navigation with link text and destination.

---

## 🔗 External Links Tracking (Future Implementation)

For web result clicks that navigate to external sites, the infrastructure is already in place.

**Module function available:** `trackOutboundClick()`

Usage example (for future web result external links):
```tsx
const handleResultClick = async (result: WebResultItem, index: number) => {
  // Check if external URL
  if (isExternalUrl(result.link)) {
    trackOutboundClick(result.title, result.link, result.id);
  }
  // Navigate to external link
  window.location.href = result.link;
};
```

---

## 📦 Core Module: pixelTracking.ts

### Available Functions

#### `initMetaPixel()`
- **Purpose:** Initialize Meta Pixel (call once on app startup)
- **Usage:** Add to `main.tsx` or `App.tsx` on app initialization
- **Example:**
```tsx
useEffect(() => {
  initMetaPixel();
}, []);
```

#### `trackPageView(pageName: string)`
- **Purpose:** Track page views
- **Usage:** Call in useEffect when page loads
- **Example:** Already implemented in Landing.tsx

#### `trackViewContent(contentName, contentCategory, contentIds)`
- **Purpose:** Track content viewing (product lists, search results)
- **Usage:** Call when results/content loads
- **Example:** Already implemented in WebResult.tsx

#### `trackInboundClick(searchText, targetPage, contentId)`
- **Purpose:** Track internal link clicks
- **Usage:** Call before internal navigation
- **Example:** Already implemented in Landing.tsx

#### `trackOutboundClick(linkText, externalUrl, contentId)`
- **Purpose:** Track external link clicks
- **Usage:** Call when clicking to external site
- **Example:** Ready to use in web result clicks

#### `trackRelatedSearchClick(searchText, targetUrl, contentId)`
- **Purpose:** Auto-detects internal vs external and tracks appropriately
- **Usage:** Convenience function for flexible click tracking
- **Example:**
```tsx
const handleSearchClick = (search) => {
  trackRelatedSearchClick(
    search.title,
    search.url,
    search.id
  );
};
```

#### `isExternalUrl(url: string): boolean`
- **Purpose:** Helper to determine if URL is external
- **Returns:** `true` if external, `false` if internal
- **Usage:** Internal validation function

---

## ⚙️ Setup Requirements

### 1. Environment Variable

Add your Meta Pixel ID to `.env`:
```env
VITE_META_PIXEL_ID=your_pixel_id_here
```

### 2. Meta Pixel Script (index.html)

Add the Meta Pixel tracking script to `public/index.html` before the closing `</head>` tag:

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

Replace `YOUR_PIXEL_ID` with your actual Meta Pixel ID.

### 3. Initialize Pixel in App

Add to your main app component (`src/App.tsx` or `src/main.tsx`):

```tsx
import { initMetaPixel } from '@/lib/pixelTracking';

useEffect(() => {
  initMetaPixel();
}, []);
```

---

## 📊 Events Summary

| Event | Where | Trigger | Data Sent |
|-------|-------|---------|-----------|
| **PageView** | Landing.tsx | Page loads | Page name |
| **ViewContent** | WebResult.tsx | Results loaded | Content IDs, page number |
| **InboundClick** | Landing.tsx | Related search click | Link text, target page, content ID |
| **OutboundClick** | (Ready to use) | External link click | Link text, URL, content ID |

---

## 🧹 Code Quality & Best Practices

✅ **Implemented:**
- Error handling with try-catch
- Console logging for debugging
- Type safety with TypeScript
- Graceful degradation if Meta Pixel not initialized
- Separation of concerns (pixel tracking in dedicated module)
- Clean function signatures with JSDoc comments
- No blocking operations (async safe)

✅ **Design Patterns:**
- Module exports for easy reuse
- Helper functions for common patterns
- URL validation utility
- Environment-based configuration

---

## 🔍 Debugging

All tracking calls log to console:
```
[Meta Pixel] PageView tracked: Landing Page
[Meta Pixel] ViewContent tracked: Web Results Page 1
[Meta Pixel] InboundClick tracked: Best Deals -> /wr/2
```

Check browser DevTools Console to verify events are firing.

---

## 📝 Next Steps

1. ✅ Add Meta Pixel ID to `.env`
2. ✅ Add Meta Pixel script to `index.html`
3. ✅ Initialize pixel in App component
4. ✅ Test events in Meta Pixel debugger
5. (Optional) Add `trackOutboundClick` to web result clicks
6. (Optional) Add pixel tracking to other pages (Blog, Landing2, etc.)

---

## 🆘 Troubleshooting

**"Meta Pixel not initialized" warning:**
- Ensure `initMetaPixel()` is called once on app startup
- Check that Meta Pixel script is loaded in index.html

**Events not showing in Meta Pixel dashboard:**
- Verify Meta Pixel ID in env variable and HTML script
- Check browser DevTools console for errors
- Allow 24-48 hours for events to appear in dashboard

**TypeScript errors:**
- Ensure `declare global` in pixelTracking.ts is present
- Restart TypeScript server if needed

---

## 📚 References

- [Meta Pixel Documentation](https://developers.facebook.com/docs/facebook-pixel)
- [Meta Pixel Events](https://developers.facebook.com/docs/facebook-pixel/implementation/conversion-tracking)
- [Standard Events Reference](https://developers.facebook.com/docs/facebook-pixel/reference)
