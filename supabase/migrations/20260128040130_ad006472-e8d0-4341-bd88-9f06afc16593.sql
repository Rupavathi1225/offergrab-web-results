-- Create sitelinks table for sponsored web results
CREATE TABLE public.sitelinks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  web_result_id UUID NOT NULL REFERENCES public.web_results(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 1 CHECK (position >= 1 AND position <= 4),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(web_result_id, position)
);

-- Enable RLS
ALTER TABLE public.sitelinks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read sitelinks"
ON public.sitelinks
FOR SELECT
USING (true);

CREATE POLICY "Public insert sitelinks"
ON public.sitelinks
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update sitelinks"
ON public.sitelinks
FOR UPDATE
USING (true);

CREATE POLICY "Public delete sitelinks"
ON public.sitelinks
FOR DELETE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_sitelinks_web_result_id ON public.sitelinks(web_result_id);

-- Create trigger for updated_at
CREATE TRIGGER update_sitelinks_updated_at
BEFORE UPDATE ON public.sitelinks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();