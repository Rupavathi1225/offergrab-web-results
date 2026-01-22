-- Add theme settings columns to landing_content table
ALTER TABLE public.landing_content
ADD COLUMN IF NOT EXISTS active_theme TEXT NOT NULL DEFAULT 'black',
ADD COLUMN IF NOT EXISTS white_homepage_blogs BOOLEAN NOT NULL DEFAULT true;

-- Add check constraint for valid theme values
ALTER TABLE public.landing_content
ADD CONSTRAINT valid_theme CHECK (active_theme IN ('black', 'white'));