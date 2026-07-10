## Astepstair — New UI + Supabase backend

Only the homepage and blog post UI are replaced. All existing routes (`/adm`, `/wr`, `/cnos`, `/ty`, `/prelanding`, `/lid`, `/p`, `/q`, `/fastmoney`, analytics, tracking, consultation, fallback URLs, web results system) stay untouched and functional.

### 1. Design system (index.css)
Add Astepstair tokens as a scoped `.astepstair` class (Ink #0A1A2F, Ivory #FAF7F0, Brass #C6893F, Brass Light #E4B872, Muted #6E7C8C, Line #DED7C7) so it doesn't collide with existing dark/light themes. Load Fraunces / Inter / JetBrains Mono via `@fontsource` packages, Font Awesome via CDN link in `index.html`.

### 2. Frontend components (new, under `src/components/astepstair/`)
- `NotifBar`, `Ticker`, `Header` (sticky, logo, nav, social, Sign In/Up), `MobileMenu`
- Homepage: `HeroSplit`, `StepsSection`, `FeaturedMosaic`, `TaxCalculator`, `LatestList`, `TrendingBox`, `FollowUsBox`, `DealOfWeekBox`, `NewsletterBand`, `MiniGrid`, `Footer`
- Blog: `BackButton`, `PostHead`, `PostHero`, `AuthorRow`, `FloatingShare`, `ArticleBody`, `LikeShareStrip`, `PrevNext`, `CommentsSection`, `Sidebar`, `SidebarNewsletter`
- `NewsletterPopup` (60s timer, session-dismissed)
- `AuthDialog` (Sign In / Sign Up modal via Supabase email/password)

### 3. New pages
- `AstepstairHome` — mounted at `/` (replaces ThemedHomepage as root)
- `AstepstairPost` — mounted at `/post/:slug`
- `/auth` page for password reset flow

Old `/landing` route keeps ThemedHomepage so existing links still work.

### 4. Supabase — schema

New tables (all with GRANTs + RLS + updated_at trigger):
- `profiles` (id → auth.users, display_name, avatar_url, bio)
- `app_role` enum + `user_roles` (admin / user) + `has_role()` security-definer function
- `articles` (slug, title, lead, category, hero_image, body_html, author_id, published, published_at, view_count, like_count, is_featured, is_trending, layout_slot: hero/steps/mosaic_big/mosaic_side/latest/mini, sort_order)
- `article_views` (article_id, session_id, ip_hash) — for tracking
- `article_likes` (article_id, user_id, unique)
- `comments` (article_id, user_id, parent_id nullable for threads, body, like_count)
- `comment_likes` (comment_id, user_id, unique)
- `newsletter_subscribers` (email unique, source, subscribed_at, is_active)
- `site_settings` (single-row JSON: notif_bar_enabled/text/link, deal_of_week {title,desc,cta_text,cta_url,enabled}, social_urls, ticker_items)
- Trending derived from `articles.view_count` (last 7d) — no separate table.

RLS: articles/comments public read (published only); likes/comments write requires auth; admin write via `has_role('admin')`; profiles self-manage; subscribers insert-open, read admin-only.

### 5. Auth
- Email/password via Supabase (`emailRedirectTo: window.location.origin`).
- `AuthDialog` for sign in / sign up.
- On signup: trigger auto-creates `profiles` row + default `user` role.
- `useAuth` hook: `onAuthStateChange` + session state.

### 6. Admin — new tabs added to existing `/adm` AdminLayout
- **Articles** — CRUD, layout_slot picker, publish toggle, TipTap-lite (textarea HTML for now, matching existing Blogs pattern)
- **Comments** — moderation queue, delete, approve
- **Subscribers** — list + CSV export
- **Site Settings** — notif bar, deal-of-week, social URLs, ticker items
- Admin tabs gated by `has_role('admin')`; non-admins see "Access denied".

Existing tabs (Landing, Searches, Web Results, Pre-Landings, Blogs, Analytics, Bulk Editor, Fallback URLs, Consultation Pages) stay exactly as-is.

### 7. Wiring behavior
- Homepage sections read `articles` filtered by `layout_slot`.
- Tax calculator: pure client (spec doesn't require persistence).
- Newsletter forms (band, sidebar, popup) all insert into `newsletter_subscribers`.
- Post view: fetch by slug, increment `view_count` once per session, load comments (threaded), like button toggles `article_likes` and updates counter.
- Prev/Next: query articles by `published_at`.
- Trending sidebar: top 4 by `view_count` desc from last 7 days.
- Notification bar text + Deal of Week from `site_settings`.

### 8. Migrations & seed
- One migration creates enums, tables, GRANTs, RLS, triggers, `has_role`, `handle_new_user` trigger.
- A second data-insert seeds one `site_settings` row + 8 sample articles (matching HTML mocks) so the homepage renders immediately after auth is set up.
- User will need to sign up, then I'll grant them admin via a small SQL insert once they share the email.

### Technical notes (skip if non-technical)
- Fonts: `bun add @fontsource/fraunces @fontsource/inter @fontsource/jetbrains-mono`.
- Font Awesome: single CDN `<link>` added to `index.html` `<head>`.
- Scoped CSS: all new styles either Tailwind or under `.astepstair` root class so old themes are untouched.
- `App.tsx` route reorder: `/` → AstepstairHome, `/landing` → ThemedHomepage (kept), new `/post/:slug`, `/auth`. Existing `/:slug` catch-all stays LAST.

### Out of scope (explicitly not doing)
- Not touching Web Results, Consultation Pages, Analytics tracking, existing Blogs system, existing ThemedHomepage/BlogPage.
- No email verification templates (default Supabase emails).
- No rich-text WYSIWYG in admin (HTML textarea, same as your existing Blogs admin).

Reply "go" to build, or tell me what to change first.
