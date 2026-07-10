
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','user'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.article_slot AS ENUM ('hero','step','mosaic_big','mosaic_side','latest','mini','featured'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text, avatar_url text, bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)),
          NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  lead text, category text, hero_image text, body_html text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text, author_avatar text,
  read_minutes int DEFAULT 5,
  published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  view_count int NOT NULL DEFAULT 0,
  like_count int NOT NULL DEFAULT 0,
  layout_slot public.article_slot NOT NULL DEFAULT 'latest',
  sort_order int NOT NULL DEFAULT 0,
  is_trending boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published articles are public" ON public.articles FOR SELECT USING (published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage articles" ON public.articles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_articles_updated BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX IF NOT EXISTS idx_articles_slot ON public.articles(layout_slot, sort_order);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON public.articles(published_at DESC);

CREATE TABLE IF NOT EXISTS public.article_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(article_id, user_id)
);
GRANT SELECT ON public.article_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.article_likes TO authenticated;
GRANT ALL ON public.article_likes TO service_role;
ALTER TABLE public.article_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes readable" ON public.article_likes FOR SELECT USING (true);
CREATE POLICY "Users like" ON public.article_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlike" ON public.article_likes FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.tg_article_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE public.articles SET like_count = like_count+1 WHERE id=NEW.article_id; RETURN NEW;
  ELSIF TG_OP='DELETE' THEN UPDATE public.articles SET like_count=GREATEST(0,like_count-1) WHERE id=OLD.article_id; RETURN OLD; END IF;
  RETURN NULL; END; $$;
CREATE TRIGGER trg_article_like_ins AFTER INSERT ON public.article_likes FOR EACH ROW EXECUTE FUNCTION public.tg_article_like_count();
CREATE TRIGGER trg_article_like_del AFTER DELETE ON public.article_likes FOR EACH ROW EXECUTE FUNCTION public.tg_article_like_count();

CREATE OR REPLACE FUNCTION public.increment_article_views(_slug text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.articles SET view_count = view_count + 1 WHERE slug = _slug AND published = true;
$$;
GRANT EXECUTE ON FUNCTION public.increment_article_views(text) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  like_count int NOT NULL DEFAULT 0,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments public read" ON public.comments FOR SELECT USING (is_hidden=false OR auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users write comment" ON public.comments FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Users edit own comment" ON public.comments FOR UPDATE USING (auth.uid()=user_id);
CREATE POLICY "Users delete own comment or admin" ON public.comments FOR DELETE USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_comments_updated BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);
GRANT SELECT ON public.comment_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT ALL ON public.comment_likes TO service_role;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comment likes readable" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "User likes comment" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "User unlikes comment" ON public.comment_likes FOR DELETE USING (auth.uid()=user_id);

CREATE OR REPLACE FUNCTION public.tg_comment_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE public.comments SET like_count=like_count+1 WHERE id=NEW.comment_id; RETURN NEW;
  ELSIF TG_OP='DELETE' THEN UPDATE public.comments SET like_count=GREATEST(0,like_count-1) WHERE id=OLD.comment_id; RETURN OLD; END IF;
  RETURN NULL; END; $$;
CREATE TRIGGER trg_comment_like_ins AFTER INSERT ON public.comment_likes FOR EACH ROW EXECUTE FUNCTION public.tg_comment_like_count();
CREATE TRIGGER trg_comment_like_del AFTER DELETE ON public.comment_likes FOR EACH ROW EXECUTE FUNCTION public.tg_comment_like_count();

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text,
  is_active boolean NOT NULL DEFAULT true,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_newsletter_email ON public.newsletter_subscribers (lower(email));
GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read subscribers" ON public.newsletter_subscribers FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update subscribers" ON public.newsletter_subscribers FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete subscribers" ON public.newsletter_subscribers FOR DELETE USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.site_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  notif_enabled boolean NOT NULL DEFAULT true,
  notif_text text DEFAULT 'New: ITR deadline extended to Aug 31',
  notif_link text DEFAULT '#',
  deal_enabled boolean NOT NULL DEFAULT true,
  deal_title text DEFAULT '₹0 brokerage on your first 30 trades',
  deal_desc text DEFAULT 'Partner offer for new demat accounts. Terms apply.',
  deal_cta_text text DEFAULT 'Claim →',
  deal_cta_url text DEFAULT '#',
  social_urls jsonb DEFAULT '{"twitter":"#","facebook":"#","instagram":"#","youtube":"#","linkedin":"#","telegram":"#","whatsapp":"#"}'::jsonb,
  ticker_items jsonb DEFAULT '[{"label":"NIFTY","value":"▲0.62%","dir":"up"},{"label":"SENSEX","value":"▲0.48%","dir":"up"},{"label":"USD/INR","value":"▼0.11%","dir":"down"},{"label":"GOLD","value":"▲0.30%","dir":"up"}]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Site settings public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins update site settings" ON public.site_settings FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_site_settings_updated BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
INSERT INTO public.site_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
