-- Create fallback_urls table for sequential URL rotation
CREATE TABLE public.fallback_urls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  sequence_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a table to track the current sequence position
CREATE TABLE public.fallback_sequence_tracker (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  current_index INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert initial tracker row
INSERT INTO public.fallback_sequence_tracker (current_index) VALUES (0);

-- Enable RLS
ALTER TABLE public.fallback_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fallback_sequence_tracker ENABLE ROW LEVEL SECURITY;

-- RLS policies for fallback_urls
CREATE POLICY "Public read fallback_urls" ON public.fallback_urls FOR SELECT USING (true);
CREATE POLICY "Public insert fallback_urls" ON public.fallback_urls FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update fallback_urls" ON public.fallback_urls FOR UPDATE USING (true);
CREATE POLICY "Public delete fallback_urls" ON public.fallback_urls FOR DELETE USING (true);

-- RLS policies for fallback_sequence_tracker
CREATE POLICY "Public read fallback_sequence_tracker" ON public.fallback_sequence_tracker FOR SELECT USING (true);
CREATE POLICY "Public update fallback_sequence_tracker" ON public.fallback_sequence_tracker FOR UPDATE USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_fallback_urls_updated_at
BEFORE UPDATE ON public.fallback_urls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fallback_sequence_tracker_updated_at
BEFORE UPDATE ON public.fallback_sequence_tracker
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();