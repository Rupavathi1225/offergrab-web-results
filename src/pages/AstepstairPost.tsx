import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AstepstairLayout, { useSiteSettings, SOCIAL_ICONS } from "@/components/astepstair/Layout";
import AuthDialog from "@/components/astepstair/AuthDialog";
import { useAuth } from "@/hooks/useAuth";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function Sidebar() {
  const { data: settings } = useSiteSettings();
  const social = (settings?.social_urls as any) || {};
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const { data: trending } = useQuery({
    queryKey: ["trending-post"],
    queryFn: async () => {
      const { data } = await supabase.from("articles").select("id,slug,title").eq("published", true).order("view_count", { ascending: false }).limit(4);
      return data || [];
    },
  });
  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from("newsletter_subscribers").insert({ email, source: "post_sidebar" });
    setDone(true);
  };
  return (
    <aside className="as-sidebar">
      <div className="as-sbox">
        <h4>Follow <b>Us</b></h4>
        <div className="as-sidebar-social">
          {Object.keys(SOCIAL_ICONS).map(k => <a key={k} href={social[k] || "#"}><i className={SOCIAL_ICONS[k]} /></a>)}
        </div>
      </div>
      <div className="as-sbox as-s-newsletter">
        <h4>Get the daily brief</h4>
        <p>One email, every morning. Markets + Tax + Tech.</p>
        {done ? <p style={{ color: "var(--brass)", fontSize: 13 }}>Thanks — you're in.</p> : (
          <form onSubmit={subscribe}>
            <input required type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            <button>Subscribe Free</button>
          </form>
        )}
      </div>
      <div className="as-sbox">
        <h4>Trending <b>Now</b></h4>
        <div className="as-trend">
          {(trending || []).map((t, i) => (
            <Link key={t.id} to={`/post/${t.slug}`}><span className="tn">{i + 1}</span><h5>{t.title}</h5></Link>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default function AstepstairPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [authOpen, setAuthOpen] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", slug],
    queryFn: async () => {
      const { data } = await supabase.from("articles").select("*").eq("slug", slug!).maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", article?.id],
    queryFn: async () => {
      const { data } = await supabase.from("comments").select("*, profiles(display_name, avatar_url)").eq("article_id", article!.id).eq("is_hidden", false).order("created_at");
      return data || [];
    },
    enabled: !!article?.id,
  });

  const { data: liked } = useQuery({
    queryKey: ["liked", article?.id, user?.id],
    queryFn: async () => {
      if (!user || !article) return false;
      const { data } = await supabase.from("article_likes").select("id").eq("article_id", article.id).eq("user_id", user.id).maybeSingle();
      return !!data;
    },
    enabled: !!article?.id && !!user,
  });

  const { data: prevNext } = useQuery({
    queryKey: ["prevnext", article?.id],
    queryFn: async () => {
      if (!article) return { prev: null, next: null };
      const [{ data: prev }, { data: next }] = await Promise.all([
        supabase.from("articles").select("slug,title").eq("published", true).lt("published_at", article.published_at).order("published_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("articles").select("slug,title").eq("published", true).gt("published_at", article.published_at).order("published_at").limit(1).maybeSingle(),
      ]);
      return { prev, next };
    },
    enabled: !!article,
  });

  useEffect(() => {
    if (!slug || !article) return;
    const key = `viewed_${slug}`;
    if (!sessionStorage.getItem(key)) {
      supabase.rpc("increment_article_views", { _slug: slug }).then(() => sessionStorage.setItem(key, "1"));
    }
  }, [slug, article]);

  if (isLoading) return <AstepstairLayout><div className="as-wrap" style={{ padding: 80, textAlign: "center" }}>Loading…</div></AstepstairLayout>;
  if (!article) return <AstepstairLayout><div className="as-wrap" style={{ padding: 80, textAlign: "center" }}>Article not found.</div></AstepstairLayout>;

  const toggleLike = async () => {
    if (!user) { setAuthOpen(true); return; }
    if (liked) {
      await supabase.from("article_likes").delete().eq("article_id", article.id).eq("user_id", user.id);
    } else {
      await supabase.from("article_likes").insert({ article_id: article.id, user_id: user.id });
    }
    qc.invalidateQueries({ queryKey: ["liked", article.id, user.id] });
    qc.invalidateQueries({ queryKey: ["article", slug] });
  };

  const postComment = async (parentId: string | null, body: string) => {
    if (!user) { setAuthOpen(true); return; }
    if (!body.trim()) return;
    const { error } = await supabase.from("comments").insert({ article_id: article.id, user_id: user.id, parent_id: parentId, body });
    if (error) { toast.error(error.message); return; }
    if (parentId) { setReplyBody(""); setReplyTo(null); } else setCommentBody("");
    qc.invalidateQueries({ queryKey: ["comments", article.id] });
    toast.success("Comment posted");
  };

  const share = (net: string) => {
    const url = window.location.href;
    const t = encodeURIComponent(article.title);
    const u = encodeURIComponent(url);
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      whatsapp: `https://wa.me/?text=${t}%20${u}`,
      telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    };
    if (net === "link") { navigator.clipboard.writeText(url); toast.success("Link copied"); return; }
    window.open(urls[net], "_blank");
  };

  const rootComments = comments.filter((c: any) => !c.parent_id);
  const repliesOf = (id: string) => comments.filter((c: any) => c.parent_id === id);

  return (
    <AstepstairLayout>
      <div className="as-social-float">
        {["twitter","facebook","linkedin","whatsapp"].map(k => <a key={k} onClick={() => share(k)}><i className={SOCIAL_ICONS[k]} /></a>)}
        <a onClick={() => share("link")}><i className="fa-solid fa-link" /></a>
      </div>

      <div className="as-wrap">
        <div className="as-post-layout">
          <main>
            <a className="as-back" onClick={() => navigate("/")}><i className="fa-solid fa-arrow-left" /> Back to Home</a>
            <div className="as-post-head">
              <span className="as-eyebrow">{article.category} · {article.read_minutes} min read</span>
              <h1>{article.title}</h1>
              {article.lead && <p className="lead">{article.lead}</p>}
            </div>
            {article.hero_image && <div className="as-post-hero-img"><img src={article.hero_image} alt={article.title} /></div>}

            <div className="as-author-row">
              <div className="as-author-info">
                <img src={article.author_avatar || "https://i.pravatar.cc/96"} alt="" />
                <div><h5>{article.author_name}</h5><span>{new Date(article.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>
              </div>
              <div className="as-share-row">
                {["twitter","facebook","linkedin","whatsapp"].map(k => <a key={k} onClick={() => share(k)}><i className={SOCIAL_ICONS[k]} /></a>)}
                <a onClick={() => share("link")}><i className="fa-solid fa-link" /></a>
              </div>
            </div>

            <article className="as-content" dangerouslySetInnerHTML={{ __html: article.body_html || "" }} />

            <div className="as-post-actions">
              <button className={`as-like-btn ${liked ? "liked" : ""}`} onClick={toggleLike}>
                <i className="fa-solid fa-heart" /> <span>{article.like_count}</span> Likes
              </button>
              <div className="as-post-share">
                <span>Share:</span>
                {["twitter","facebook","linkedin","whatsapp","telegram"].map(k => <a key={k} onClick={() => share(k)}><i className={SOCIAL_ICONS[k]} /></a>)}
                <a onClick={() => share("link")}><i className="fa-solid fa-link" /></a>
              </div>
            </div>

            <div className="as-next-prev">
              {prevNext?.prev ? (
                <Link to={`/post/${prevNext.prev.slug}`} className="as-np-card">
                  <div className="dir"><i className="fa-solid fa-arrow-left" /> Previous</div>
                  <h4>{prevNext.prev.title}</h4>
                </Link>
              ) : <div />}
              {prevNext?.next ? (
                <Link to={`/post/${prevNext.next.slug}`} className="as-np-card">
                  <div className="dir" style={{ justifyContent: "flex-end" }}>Next <i className="fa-solid fa-arrow-right" /></div>
                  <h4 style={{ textAlign: "right" }}>{prevNext.next.title}</h4>
                </Link>
              ) : <div />}
            </div>

            <section className="as-comments">
              <h3>Comments ({rootComments.length})</h3>
              <div className="as-comment-form">
                <img src={user ? (user.user_metadata?.avatar_url || `https://i.pravatar.cc/96?u=${user.id}`) : "https://i.pravatar.cc/96"} alt="" />
                <div className="as-cf-right">
                  <textarea placeholder={user ? "Share your thoughts..." : "Sign in to comment"} value={commentBody} onChange={e => setCommentBody(e.target.value)} disabled={!user} />
                  <div className="as-cf-actions">
                    {user ? <button onClick={() => postComment(null, commentBody)}>Post Comment</button> : <button onClick={() => setAuthOpen(true)}>Sign in</button>}
                  </div>
                </div>
              </div>
              <div>
                {rootComments.map((c: any) => (
                  <div key={c.id}>
                    <div className="as-comment">
                      <img src={c.profiles?.avatar_url || `https://i.pravatar.cc/96?u=${c.user_id}`} alt="" />
                      <div style={{ flex: 1 }}>
                        <div className="as-c-meta"><span className="name">{c.profiles?.display_name || "Reader"}</span><span className="time">{timeAgo(c.created_at)}</span></div>
                        <div className="as-c-body">{c.body}</div>
                        <div className="as-c-actions">
                          <button><i className="fa-regular fa-heart" /> {c.like_count}</button>
                          <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}><i className="fa-regular fa-comment" /> Reply</button>
                          <button onClick={() => share("link")}><i className="fa-solid fa-share-nodes" /> Share</button>
                        </div>
                        {replyTo === c.id && (
                          <div className="as-comment-form" style={{ marginTop: 12 }}>
                            <div className="as-cf-right">
                              <textarea placeholder="Reply…" value={replyBody} onChange={e => setReplyBody(e.target.value)} />
                              <div className="as-cf-actions">
                                <button className="ghost" onClick={() => setReplyTo(null)}>Cancel</button>
                                <button onClick={() => postComment(c.id, replyBody)}>Reply</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {repliesOf(c.id).map((r: any) => (
                      <div key={r.id} className="as-comment reply">
                        <img src={r.profiles?.avatar_url || `https://i.pravatar.cc/96?u=${r.user_id}`} alt="" />
                        <div>
                          <div className="as-c-meta"><span className="name">{r.profiles?.display_name || "Reader"}</span><span className="time">{timeAgo(r.created_at)}</span></div>
                          <div className="as-c-body">{r.body}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </main>
          <Sidebar />
        </div>
      </div>

      {authOpen && <AuthDialog open onClose={() => setAuthOpen(false)} />}
    </AstepstairLayout>
  );
}
