-- Landing page content
CREATE TABLE public.landing_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name TEXT NOT NULL DEFAULT 'OfferGrab',
  headline TEXT NOT NULL DEFAULT 'OfferGrab - Discover Amazing Deals & Offers',
  description TEXT NOT NULL DEFAULT 'Find the best deals, exclusive offers, and money-saving opportunities. Your one-stop destination for incredible savings.',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Related searches (the clickable boxes on landing)
CREATE TABLE public.related_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  serial_number INTEGER NOT NULL DEFAULT 1,
  target_wr INTEGER NOT NULL DEFAULT 1 CHECK (target_wr >= 1 AND target_wr <= 5),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Web results
CREATE TABLE public.web_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT NOT NULL,
  logo_url TEXT,
  wr_page INTEGER NOT NULL DEFAULT 1 CHECK (wr_page >= 1 AND wr_page <= 5),
  is_sponsored BOOLEAN NOT NULL DEFAULT false,
  serial_number INTEGER NOT NULL DEFAULT 1,
  allowed_countries TEXT[] DEFAULT ARRAY['worldwide'],
  fallback_link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pre-landing pages
CREATE TABLE public.prelandings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  web_result_id UUID REFERENCES public.web_results(id) ON DELETE CASCADE,
  logo_url TEXT,
  main_image_url TEXT,
  headline TEXT NOT NULL,
  description TEXT,
  email_placeholder TEXT DEFAULT 'Enter your email',
  cta_button_text TEXT DEFAULT 'Get Started',
  background_color TEXT DEFAULT '#1a1a2e',
  background_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sessions tracking
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  country TEXT DEFAULT 'Unknown',
  country_code TEXT DEFAULT 'XX',
  source TEXT DEFAULT 'direct',
  device TEXT DEFAULT 'desktop',
  user_agent TEXT,
  page_views INTEGER NOT NULL DEFAULT 0,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Click tracking
CREATE TABLE public.clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  click_type TEXT NOT NULL CHECK (click_type IN ('related_search', 'web_result', 'prelanding_submit')),
  item_id UUID,
  item_name TEXT,
  page TEXT,
  lid INTEGER,
  original_link TEXT,
  time_spent INTEGER DEFAULT 0,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email captures from prelandings
CREATE TABLE public.email_captures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prelanding_id UUID REFERENCES public.prelandings(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  session_id TEXT,
  ip_address TEXT,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.related_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prelandings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_captures ENABLE ROW LEVEL SECURITY;

-- Public read policies for frontend
CREATE POLICY "Public read landing_content" ON public.landing_content FOR SELECT USING (true);
CREATE POLICY "Public read related_searches" ON public.related_searches FOR SELECT USING (true);
CREATE POLICY "Public read web_results" ON public.web_results FOR SELECT USING (true);
CREATE POLICY "Public read prelandings" ON public.prelandings FOR SELECT USING (true);

-- Public insert/update for tracking (anonymous users)
CREATE POLICY "Public insert sessions" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update sessions" ON public.sessions FOR UPDATE USING (true);
CREATE POLICY "Public read sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Public insert clicks" ON public.clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read clicks" ON public.clicks FOR SELECT USING (true);
CREATE POLICY "Public insert email_captures" ON public.email_captures FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read email_captures" ON public.email_captures FOR SELECT USING (true);

-- Admin full access (for now, public - you can add auth later)
CREATE POLICY "Admin manage landing_content" ON public.landing_content FOR ALL USING (true);
CREATE POLICY "Admin manage related_searches" ON public.related_searches FOR ALL USING (true);
CREATE POLICY "Admin manage web_results" ON public.web_results FOR ALL USING (true);
CREATE POLICY "Admin manage prelandings" ON public.prelandings FOR ALL USING (true);
CREATE POLICY "Admin manage sessions" ON public.sessions FOR ALL USING (true);
CREATE POLICY "Admin manage clicks" ON public.clicks FOR ALL USING (true);
CREATE POLICY "Admin manage email_captures" ON public.email_captures FOR ALL USING (true);

-- Insert default landing content
INSERT INTO public.landing_content (site_name, headline, description)
VALUES ('OfferGrab', 'OfferGrab - Discover Amazing Deals & Offers', 'Find the best deals, exclusive offers, and money-saving opportunities. Your one-stop destination for incredible savings.');

-- Insert sample related searches
INSERT INTO public.related_searches (title, serial_number, target_wr) VALUES
('Best Cashback Offers', 1, 1),
('Online Shopping Deals', 2, 2),
('Credit Card Rewards', 3, 3),
('Travel Discounts', 4, 4),
('Food & Dining Offers', 5, 5);

-- Insert sample web results
INSERT INTO public.web_results (name, title, description, link, wr_page, serial_number) VALUES
('CashbackWorld', 'CashbackWorld - Get Money Back on Every Purchase', 'Earn up to 10% cashback on all your online purchases from 5000+ partner stores.', 'https://example.com/cashback', 1, 1),
('DealHunter', 'DealHunter - Never Miss a Deal Again', 'AI-powered deal finder that alerts you to the best prices across the web.', 'https://example.com/dealhunter', 1, 2),
('ShopSmart', 'ShopSmart - Compare Prices Instantly', 'Compare prices from hundreds of retailers and save on every purchase.', 'https://example.com/shopsmart', 2, 1),
('TravelSaver', 'TravelSaver - Book Cheap Flights & Hotels', 'Find the lowest prices on flights, hotels, and vacation packages.', 'https://example.com/travelsaver', 4, 1);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_landing_content_updated_at BEFORE UPDATE ON public.landing_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_related_searches_updated_at BEFORE UPDATE ON public.related_searches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_web_results_updated_at BEFORE UPDATE ON public.web_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_prelandings_updated_at BEFORE UPDATE ON public.prelandings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_clicks_session_id ON public.clicks(session_id);
CREATE INDEX idx_clicks_click_type ON public.clicks(click_type);
CREATE INDEX idx_sessions_session_id ON public.sessions(session_id);
CREATE INDEX idx_web_results_wr_page ON public.web_results(wr_page);
CREATE INDEX idx_related_searches_serial ON public.related_searches(serial_number);