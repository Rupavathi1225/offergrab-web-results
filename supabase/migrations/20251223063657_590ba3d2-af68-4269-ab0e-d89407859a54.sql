-- Add allowed_countries column to fallback_urls table
ALTER TABLE public.fallback_urls 
ADD COLUMN allowed_countries text[] DEFAULT ARRAY['worldwide']::text[];

-- Update existing rows to have worldwide access
UPDATE public.fallback_urls SET allowed_countries = ARRAY['worldwide']::text[] WHERE allowed_countries IS NULL;