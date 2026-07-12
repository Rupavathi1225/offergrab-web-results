import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AstepstairLayout, { useSiteSettings, SOCIAL_ICONS } from "@/components/astepstair/Layout";

function usePublishedArticles() {
  return useQuery({
    queryKey: ["articles-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("published", true)
        .eq("is_active", true)
        .order("published_at", { ascending: false });
      return data || [];
    },
  });
}

function useTrending() {
  return useQuery({
    queryKey: ["trending"],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("id,slug,title")
        .eq("published", true)
        .eq("is_active", true)
        .order("view_count", { ascending: false })
        .limit(4);
      return data || [];
    },
  });
}

function NewsletterBand() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from("newsletter_subscribers").insert({ email, source: "band" });
    setDone(true);
  };
  return (
    <section className="as-news">
      <div className="as-wrap as-wrap-inner">
        <div><h2>One sharp email each morning.</h2><p>Markets, tax, and tech — explained in under 5 minutes.</p></div>
        <div>
          {done ? <p>Thanks — you're on the list.</p> : (
            <form onSubmit={submit}>
              <div className="as-nform"><input required type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} /><button>Join Free</button></div>
              <small>240,000+ readers · No spam · Unsubscribe anytime.</small>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function TaxCalculator() {
  const [inc, setInc] = useState(1200000);
  const [out, setOut] = useState("Better: New Regime");
  const calc = () => {
    const oldT = Math.max(0, (inc - 250000)) * 0.15;
    const newT = Math.max(0, (inc - 300000)) * 0.12;
    const better = newT < oldT ? "New Regime" : "Old Regime";
    const save = Math.abs(oldT - newT).toLocaleString("en-IN", { maximumFractionDigits: 0 });
    setOut(`Better: ${better} · saves ≈ ₹${save}/yr`);
  };
  return (
    <div className="as-wrap" style={{ paddingTop: 44 }}>
      <div className="as-tool">
        <div className="as-tool-l">
          <span className="as-eyebrow" style={{ color: "var(--brasslt)" }}>Free Calculator</span>
          <h2>Old vs New Tax Regime</h2>
          <p>Punch in your annual income and see which regime saves you more for FY 2026.</p>
        </div>
        <div className="as-tool-r">
          <label>Annual income (₹)</label>
          <input type="number" value={inc} onChange={e => setInc(+e.target.value || 0)} placeholder="e.g. 1200000" />
          <button onClick={calc}>Calculate →</button>
          <div className="res">{out}</div>
        </div>
      </div>
    </div>
  );
}

export default function AstepstairHome() {
  const navigate = useNavigate();
  const { data: articles = [] } = usePublishedArticles();
  const { data: trending } = useTrending();
  const { data: settings } = useSiteSettings();
  const social = (settings?.social_urls as any) || {};

  const go = (slug: string) => navigate(`/post/${slug}`);

  // Automatic placement — only articles with feature_on_homepage=true fill Hero + Mosaic
  const featured = articles.filter((a: any) => a.feature_on_homepage);

  const heroPost = featured[0];
  const bigPost = featured[1];
  const mSide = featured.slice(2, 4);
  const latest = articles.slice(0, 6);
  const mini = articles.slice(4, 8);

  // Steps: manually pinned articles by step_position (1-4)
  const stepArticles = articles.filter((a: any) => a.is_step && a.step_position);
  const steps = [1, 2, 3, 4].map(pos => stepArticles.find((a: any) => a.step_position === pos));

  return (
    <AstepstairLayout>
      {/* HERO */}
      {heroPost && (
        <section className="as-hero">
          <div className="as-wrap as-hero-grid">
            <div>
              <span className="as-eyebrow">{heroPost.category ? `${heroPost.category} · ${new Date(heroPost.published_at).getFullYear()}` : "Cover Story"}</span>
              <h1>{heroPost.title}</h1>
              {heroPost.lead && <p>{heroPost.lead}</p>}
              <div className="meta">By {heroPost.author_name || "Editorial Team"} · {heroPost.read_minutes || 5} min read · {new Date(heroPost.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
            </div>
            <a className="as-hero-img" onClick={() => go(heroPost.slug)} style={{ cursor: "pointer" }}>
              <img src={heroPost.hero_image} alt={heroPost.title} />
              <span className="tag">{heroPost.category?.toUpperCase()}</span>
            </a>
          </div>
        </section>
      )}

      {/* STEPS (manual only) */}
      {steps.some(Boolean) && (
        <section className="as-steps-sec">
          <div className="as-wrap">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
              <div>
                <span className="as-eyebrow">Start Here</span>
                <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 30, fontWeight: 600, marginTop: 8, color: "var(--ivory)" }}>Four steps up your money game</h2>
              </div>
              <div style={{ display: "flex", gap: 14, fontSize: 18 }}>
                {["twitter", "linkedin", "whatsapp"].map(k => <a key={k} href={social[k] || "#"} style={{ color: "#9DB0C4" }}><i className={SOCIAL_ICONS[k]} /></a>)}
              </div>
            </div>
            <div className="as-stair">
              {steps.map((s: any, i) => s ? (
                <a key={s.id} className="as-step" onClick={() => go(s.slug)}>
                  <span className="n">{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.lead}</p>
                  <span className="cat">{s.category}</span>
                </a>
              ) : (
                <div key={i} className="as-step" style={{ opacity: 0.3 }}>
                  <span className="n">{i + 1}</span>
                  <h3>Coming soon</h3>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FEATURED MOSAIC */}
      {bigPost && (
        <div className="as-wrap">
          <div className="as-lhead"><h2>Featured<span className="dot">.</span></h2><a>All stories →</a></div>
          <div className="as-mosaic">
            <a className="as-fcard as-m-big" onClick={() => go(bigPost.slug)}>
              <div className="as-fthumb"><img src={bigPost.hero_image} alt="" /></div>
              <div className="as-fbody">
                <span className="as-fcat">{bigPost.category}</span>
                <h3>{bigPost.title}</h3>
                <p style={{ fontSize: 15, color: "#44586c" }}>{bigPost.lead}</p>
                <span className="as-fmeta">{new Date(bigPost.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {bigPost.read_minutes} min read</span>
              </div>
            </a>
            {mSide.map((s: any) => (
              <a key={s.id} className="as-fcard as-m-side" onClick={() => go(s.slug)}>
                <div className="as-fthumb"><img src={s.hero_image} alt="" /></div>
                <div className="as-fbody"><span className="as-fcat">{s.category}</span><h3>{s.title}</h3></div>
              </a>
            ))}
          </div>
        </div>
      )}

      <TaxCalculator />

      {/* LATEST + SIDEBAR */}
      <div className="as-wrap">
        <div className="as-lhead"><h2>Latest<span className="dot">.</span></h2><a>View all →</a></div>
        <div className="as-latest">
          <div className="as-llist">
            {latest.map((l: any) => (
              <a key={l.id} className="as-row" onClick={() => go(l.slug)} style={{ cursor: "pointer" }}>
                <div className="as-rthumb"><img src={l.hero_image} alt="" /></div>
                <div>
                  <span className="as-fcat">{l.category}</span>
                  <h3>{l.title}</h3>
                  <p>{l.lead}</p>
                  <span className="as-fmeta">{new Date(l.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {l.author_name}</span>
                </div>
              </a>
            ))}
          </div>
          <aside>
            <div className="as-rbox">
              <h4>Follow <b>Us</b></h4>
              <div className="as-sidebar-social">
                {Object.keys(SOCIAL_ICONS).map(k => <a key={k} href={social[k] || "#"}><i className={SOCIAL_ICONS[k]} /></a>)}
              </div>
            </div>
            <div className="as-rbox">
              <h4>Trending <b>Now</b></h4>
              <div className="as-trend">
                {(trending || []).map((t: any, i) => (
                  <a key={t.id} onClick={() => go(t.slug)} style={{ cursor: "pointer" }}><span className="tn">{i + 1}</span><h5>{t.title}</h5></a>
                ))}
              </div>
            </div>
            {settings?.deal_enabled && (
              <div className="as-rbox">
                <h4>Deal of the <b>Week</b></h4>
                <div style={{ padding: "18px 16px" }}>
                  <div style={{ fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 700, lineHeight: 1.05 }}>{settings.deal_title}</div>
                  <p style={{ fontSize: 14, color: "#44586c", margin: "8px 0 14px" }}>{settings.deal_desc}</p>
                  <a href={settings.deal_cta_url} style={{ display: "inline-block", background: "var(--ink)", color: "var(--ivory)", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, padding: "10px 16px", borderRadius: 4 }}>{settings.deal_cta_text}</a>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      <NewsletterBand />

      {/* MINI GRID */}
      {mini.length > 0 && (
        <div className="as-wrap" style={{ paddingTop: 52, paddingBottom: 20 }}>
          <div className="as-lhead" style={{ paddingTop: 0 }}><h2>More to explore<span className="dot">.</span></h2><a>Archive →</a></div>
          <div className="as-mgrid">
            {mini.map((m: any) => (
              <a key={m.id} className="as-mini" onClick={() => go(m.slug)} style={{ cursor: "pointer" }}>
                <span className="as-fcat">{m.category}</span>
                <h4>{m.title}</h4>
                <span className="as-fmeta">{new Date(m.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </AstepstairLayout>
  );
}
