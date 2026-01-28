# Sitelinks Feature for Sponsored Ads

## Overview

Sitelinks are additional clickable links that appear beneath sponsored web results. They provide users with quick access to specific pages or actions, increasing engagement by offering multiple entry points.

## Key Features

### 1. Sitelink Configuration
- **Up to 4 sitelinks** per sponsored ad
- Each sitelink has an independent clickable URL
- Action-based titles (e.g., "Apply Now", "Get Quote", "Contact Us")
- Active/inactive toggle per sitelink

### 2. Admin Management
- Accessible via the **Link icon** on sponsored web results in the admin panel
- Quick suggestions for common CTA text
- Position-based ordering (1-4)
- Real-time preview of filled sitelinks count

### 3. Frontend Display
- Mobile-first responsive design
- Sponsored label always visible
- Subtle, semi-transparent CTA button styling
- Sitelinks displayed in a flex-wrap layout below the main CTA

## Database Schema

```sql
CREATE TABLE public.sitelinks (
  id UUID PRIMARY KEY,
  web_result_id UUID REFERENCES web_results(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  position INTEGER (1-4),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Usage

### Adding Sitelinks (Admin)
1. Navigate to **Admin > Web Results**
2. Find a **Sponsored** web result (marked with "Ad" badge)
3. Click the **Link icon** (🔗) in the actions column
4. Add up to 4 sitelinks with title and URL
5. Use quick suggestions or enter custom titles
6. Save changes

### How Sitelinks Appear (Frontend)
- Only sponsored results can display sitelinks
- Sitelinks appear below the "Visit Website" button
- Each sitelink is clickable and navigates directly to its URL
- Click tracking is enabled for analytics

## Design Guidelines

| Element | Recommendation |
|---------|----------------|
| Layout | Mobile-first responsive |
| Sponsored Label | Always visible, subtle background |
| CTA Buttons | Semi-transparent, hover effects |
| Sitelinks | Border buttons with hover state |

## Click Tracking

Sitelink clicks are tracked with:
- `click_type: 'sitelink'`
- `item_id`: parent web result ID
- `item_name`: sitelink title
- `original_link`: sitelink URL

## Files Modified

- `src/pages/WebResult.tsx` - Display sitelinks on sponsored ads
- `src/pages/admin/WebResults.tsx` - Admin sitelinks management
- `src/components/admin/SitelinksEditor.tsx` - Sitelinks editor component
- `src/components/web-results/SponsoredAdCard.tsx` - Reusable sponsored ad component
- `src/lib/tracking.ts` - Added 'sitelink' click type
