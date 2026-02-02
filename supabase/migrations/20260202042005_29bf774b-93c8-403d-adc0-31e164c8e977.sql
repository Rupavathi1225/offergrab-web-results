-- Add urgency fields to blogs table
ALTER TABLE public.blogs 
ADD COLUMN IF NOT EXISTS urgency_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS urgency_hours INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS urgency_text TEXT DEFAULT 'Within 3 hours, a consultation form will be available. Please come back or leave your email to get notified.',
ADD COLUMN IF NOT EXISTS urgency_action TEXT DEFAULT 'email';

-- Add tracking event types for consultation pages
ALTER TABLE public.clicks DROP CONSTRAINT IF EXISTS clicks_click_type_check;
ALTER TABLE public.clicks ADD CONSTRAINT clicks_click_type_check CHECK (
  click_type IN (
    'related_search', 
    'web_result', 
    'prelanding_submit', 
    'landing2_view', 
    'landing2_click', 
    'fallback_redirect', 
    'thankyou_view', 
    'sitelink', 
    'wr201_sponsored',
    'consultation_view',
    'consultation_click'
  )
);