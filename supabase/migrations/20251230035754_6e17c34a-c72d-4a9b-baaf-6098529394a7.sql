-- Add redirect toggle columns to landing_content table
ALTER TABLE public.landing_content 
ADD COLUMN IF NOT EXISTS redirect_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS redirect_delay_seconds integer NOT NULL DEFAULT 5;