-- Add wr_type column to differentiate WR101 (normal) and WR201 (category-based sponsored)
ALTER TABLE public.web_results 
ADD COLUMN wr_type text NOT NULL DEFAULT 'WR101';

-- Add category_id to link WR201 results to blog categories
ALTER TABLE public.web_results 
ADD COLUMN category_id text NULL;

-- Create index for efficient WR201 queries by category
CREATE INDEX idx_web_results_wr_type ON public.web_results(wr_type);
CREATE INDEX idx_web_results_category_id ON public.web_results(category_id);

-- Add comment for clarity
COMMENT ON COLUMN public.web_results.wr_type IS 'WR101 = normal web results, WR201 = category-based sponsored (shown on country mismatch)';
COMMENT ON COLUMN public.web_results.category_id IS 'Category for WR201 results - matches blog category field';