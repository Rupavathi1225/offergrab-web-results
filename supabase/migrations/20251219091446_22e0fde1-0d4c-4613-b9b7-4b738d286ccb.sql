-- Create web_result_update_history table for rollback support
CREATE TABLE public.web_result_update_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  web_result_id UUID NOT NULL REFERENCES public.web_results(id) ON DELETE CASCADE,
  old_title TEXT,
  old_url TEXT,
  new_title TEXT,
  new_url TEXT,
  updated_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.web_result_update_history ENABLE ROW LEVEL SECURITY;

-- Create policies (admin access for now, public read for history)
CREATE POLICY "Public read web_result_update_history"
ON public.web_result_update_history
FOR SELECT
USING (true);

CREATE POLICY "Public insert web_result_update_history"
ON public.web_result_update_history
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_web_result_update_history_web_result_id ON public.web_result_update_history(web_result_id);
CREATE INDEX idx_web_result_update_history_updated_at ON public.web_result_update_history(updated_at DESC);