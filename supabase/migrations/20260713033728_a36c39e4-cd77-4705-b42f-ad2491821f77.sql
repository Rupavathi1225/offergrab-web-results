
DROP POLICY IF EXISTS "Admins manage articles" ON public.articles;
CREATE POLICY "Admin manage articles" ON public.articles FOR ALL USING (true) WITH CHECK (true);
