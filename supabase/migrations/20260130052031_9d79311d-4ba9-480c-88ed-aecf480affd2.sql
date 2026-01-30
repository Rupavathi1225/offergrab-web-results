-- Create table for consultation pages
CREATE TABLE public.consultation_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  destination_link TEXT NOT NULL,
  image_url TEXT,
  trust_line TEXT DEFAULT 'To proceed, please complete a short, secure consultation form.',
  cta_text TEXT DEFAULT 'Take Your Consultation',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consultation_pages ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Public read consultation_pages" 
ON public.consultation_pages 
FOR SELECT 
USING (true);

CREATE POLICY "Public insert consultation_pages" 
ON public.consultation_pages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public update consultation_pages" 
ON public.consultation_pages 
FOR UPDATE 
USING (true);

CREATE POLICY "Public delete consultation_pages" 
ON public.consultation_pages 
FOR DELETE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_consultation_pages_updated_at
BEFORE UPDATE ON public.consultation_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();