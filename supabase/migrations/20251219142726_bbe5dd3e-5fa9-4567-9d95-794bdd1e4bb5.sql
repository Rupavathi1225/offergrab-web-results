-- Add explicit ownership for web results so blog deletions only remove their own data
ALTER TABLE public.web_results
  ADD COLUMN IF NOT EXISTS blog_id uuid,
  ADD COLUMN IF NOT EXISTS related_search_id uuid;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_web_results_blog_id ON public.web_results (blog_id);
CREATE INDEX IF NOT EXISTS idx_web_results_related_search_id ON public.web_results (related_search_id);

-- Foreign keys (safe drop/create)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema='public' AND table_name='web_results' AND constraint_name='web_results_blog_id_fkey'
  ) THEN
    ALTER TABLE public.web_results DROP CONSTRAINT web_results_blog_id_fkey;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema='public' AND table_name='web_results' AND constraint_name='web_results_related_search_id_fkey'
  ) THEN
    ALTER TABLE public.web_results DROP CONSTRAINT web_results_related_search_id_fkey;
  END IF;
END$$;

ALTER TABLE public.web_results
  ADD CONSTRAINT web_results_blog_id_fkey
  FOREIGN KEY (blog_id) REFERENCES public.blogs(id)
  ON DELETE CASCADE;

ALTER TABLE public.web_results
  ADD CONSTRAINT web_results_related_search_id_fkey
  FOREIGN KEY (related_search_id) REFERENCES public.related_searches(id)
  ON DELETE CASCADE;

-- Ensure deleting a blog deletes its related searches (and cascades to web_results via related_search_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema='public' AND table_name='related_searches' AND constraint_name='related_searches_blog_id_fkey'
  ) THEN
    ALTER TABLE public.related_searches DROP CONSTRAINT related_searches_blog_id_fkey;
  END IF;
END$$;

ALTER TABLE public.related_searches
  ADD CONSTRAINT related_searches_blog_id_fkey
  FOREIGN KEY (blog_id) REFERENCES public.blogs(id)
  ON DELETE CASCADE;

-- Ensure deleting web_results deletes their prelandings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema='public' AND table_name='prelandings' AND constraint_name='prelandings_web_result_id_fkey'
  ) THEN
    ALTER TABLE public.prelandings DROP CONSTRAINT prelandings_web_result_id_fkey;
  END IF;
END$$;

ALTER TABLE public.prelandings
  ADD CONSTRAINT prelandings_web_result_id_fkey
  FOREIGN KEY (web_result_id) REFERENCES public.web_results(id)
  ON DELETE CASCADE;
