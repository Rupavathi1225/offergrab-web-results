-- Drop the existing restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Admin manage web_results" ON public.web_results;
DROP POLICY IF EXISTS "Public read web_results" ON public.web_results;

-- Create permissive policies for web_results
CREATE POLICY "Public read web_results" 
ON public.web_results 
FOR SELECT 
USING (true);

CREATE POLICY "Public insert web_results" 
ON public.web_results 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public update web_results" 
ON public.web_results 
FOR UPDATE 
USING (true);

CREATE POLICY "Public delete web_results" 
ON public.web_results 
FOR DELETE 
USING (true);