-- Make redirect enabled by default
ALTER TABLE public.landing_content
ALTER COLUMN redirect_enabled SET DEFAULT true;

-- Ensure existing row(s) are enabled by default as requested
UPDATE public.landing_content
SET redirect_enabled = true
WHERE redirect_enabled IS DISTINCT FROM true;