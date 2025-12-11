-- Add blog_id column to related_searches table
ALTER TABLE public.related_searches 
ADD COLUMN blog_id uuid REFERENCES public.blogs(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_related_searches_blog_id ON public.related_searches(blog_id);