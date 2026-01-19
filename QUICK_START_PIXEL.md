# 🚀 Meta Pixel Tracking - Quick Start Checklist

## Step 1: Environment Setup (5 min)

- [ ] Add to `.env`:
  ```
  VITE_META_PIXEL_ID=your_pixel_id_here
  ```

## Step 2: Update index.html (5 min)

- [ ] Open `index.html`
- [ ] Find the closing `</head>` tag
- [ ] Paste this before it:
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
- [ ] Replace `YOUR_PIXEL_ID` twice with your actual Meta Pixel ID

## Step 3: Initialize in App (5 min)

- [ ] Open `src/main.tsx`
- [ ] Add this import at top:
  ```tsx
  import { initMetaPixel } from '@/lib/pixelTracking';
  ```
- [ ] Call after app mounts (in root component useEffect or directly):
  ```tsx
  initMetaPixel();
  ```

## Step 4: Verify (10 min)

- [ ] Run: `npm run dev` (or `bun run dev`)
- [ ] Open app in browser
- [ ] Open DevTools Console (F12)
- [ ] Look for `[Meta Pixel]` log messages
- [ ] Navigate to Landing Page → should see:
  ```
  [Meta Pixel] PageView tracked: Landing Page
  ```
- [ ] Click a related search → should see:
  ```
  [Meta Pixel] InboundClick tracked: [Search Text] -> /wr/X
  ```

## Step 5: Test in Meta Pixel Debugger (5 min)

- [ ] Go to [Meta Pixel Debugger](https://business.facebook.com/tools/pixel-debugger)
- [ ] Select your pixel
- [ ] Visit your app pages
- [ ] Watch events populate in real-time
- [ ] Verify event payloads look correct

---

## ✅ What's Already Done

No additional code needed in these files - they're ready to go:

- ✅ **Landing.tsx** - PageView tracking on load
- ✅ **Landing.tsx** - InboundClick tracking on related search clicks
- ✅ **WebResult.tsx** - ViewContent tracking when results load
- ✅ **pixelTracking.ts** - Full module with all event functions

---

## 📊 Events Being Tracked

| Page | Event | When |
|------|-------|------|
| Landing | PageView | Page loads |
| Landing | InboundClick | Related search clicked |
| WebResult | ViewContent | Results load |

---

## 🎯 Optional: Add OutboundClick Tracking

If you want to track clicks to external websites:

1. Open `src/pages/WebResult.tsx`
2. Import `trackOutboundClick`:
   ```tsx
   import { trackOutboundClick } from '@/lib/pixelTracking';
   ```
3. In `handleResultClick()`, before `window.location.href`:
   ```tsx
   if (content?.redirect_enabled === false) {
     trackOutboundClick(result.title, result.link, result.id);
     window.location.href = result.link;
     return;
   }
   ```

---

## 🐛 Debug Checklist

If events aren't showing:

- [ ] Is Meta Pixel ID correct in `.env` and `index.html`?
- [ ] Is `initMetaPixel()` being called?
- [ ] Can you see `[Meta Pixel]` logs in console?
- [ ] Are you using a real Meta Pixel (not test pixel)?
- [ ] Check Meta Pixel Debugger for event details
- [ ] Wait 24-48 hours for events to appear in dashboard

---

## 📞 Support

See [PIXEL_TRACKING_GUIDE.md](PIXEL_TRACKING_GUIDE.md) for full documentation.
