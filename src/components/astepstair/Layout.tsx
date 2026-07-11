import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AuthDialog from "./AuthDialog";

const SOCIAL_ICONS: Record<string, string> = {
  twitter: "fa-brands fa-x-twitter",
  facebook: "fa-brands fa-facebook-f",
  instagram: "fa-brands fa-instagram",
  youtube: "fa-brands fa-youtube",
  linkedin: "fa-brands fa-linkedin-in",
  telegram: "fa-brands fa-telegram",
  whatsapp: "fa-brands fa-whatsapp",
};

export function useSiteSettings() {
  return useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      return data;
    },
  });
}

function BrandLogo({ dark = false }: { dark?: boolean }) {
  return (
    <Link to="/" className="as-brand" style={dark ? { color: "var(--ivory)" } : undefined}>
      <span><span className="a">A</span>stepstair</span>
      <span className="steps"><i /><i /><i /></span>
    </Link>
  );
}

export function AstepstairHeader() {
  const { data: settings } = useSiteSettings();
  const { user, isAdmin, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState<null | "signin" | "signup">(null);
  const [notifDismissed, setNotifDismissed] = useState(() => sessionStorage.getItem("as_notif_dismissed") === "1");
  const social = (settings?.social_urls as any) || {};
  const tickers = (settings?.ticker_items as any[]) || [];
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  const navigate = useNavigate();

  return (
    <>
      {settings?.notif_enabled && !notifDismissed && (
        <div className="as-notif">
          <i className="fa-solid fa-bell bell" />
          <span>{settings.notif_text} {settings.notif_link && settings.notif_link !== "#" && <a href={settings.notif_link}>Read →</a>}</span>
          <button className="close-n" onClick={() => { sessionStorage.setItem("as_notif_dismissed", "1"); setNotifDismissed(true); }}>×</button>
        </div>
      )}
      <div className="as-topbar">
        <span>{date}</span>
        <span className="as-tickers">
          {tickers.map((t, i) => (
            <span key={i}>{t.label} <b className={t.dir}>{t.value}</b></span>
          ))}
        </span>
      </div>
      <header className="as-header">
        <div className="as-wrap as-head">
          <BrandLogo />
          <nav className="as-nav">
            <ul>
              <li><a onClick={() => navigate("/")}>Finance</a></li>
              <li><a onClick={() => navigate("/")}>Tax</a></li>
              <li><a onClick={() => navigate("/")}>Technology</a></li>
              <li><a onClick={() => navigate("/")}>Business</a></li>
              <li><a onClick={() => navigate("/")}>Tools</a></li>
            </ul>
          </nav>
          <div className="as-head-right">
            <div className="as-social-sm">
              {["twitter", "instagram", "youtube"].map(k => (
                <a key={k} href={social[k] || "#"}><i className={SOCIAL_ICONS[k]} /></a>
              ))}
            </div>
            <div className="as-auth">
              {user ? (
                <>
                  {isAdmin && <a className="sign" onClick={() => navigate("/adm")} style={{ cursor: "pointer" }}>Admin</a>}
                  <button className="get" onClick={signOut}>Sign Out</button>
                </>
              ) : (
                <>
                  <a className="sign" onClick={() => setAuthOpen("signin")} style={{ cursor: "pointer" }}>Sign In</a>
                  <a className="get" onClick={() => setAuthOpen("signup")} style={{ cursor: "pointer" }}>Sign Up</a>
                </>
              )}
            </div>
          </div>
          <button className="as-burger" aria-label="Menu">☰</button>
        </div>
      </header>
      {authOpen && <AuthDialog open={true} onClose={() => setAuthOpen(null)} initialMode={authOpen} />}
    </>
  );
}

export function AstepstairFooter() {
  const { data: settings } = useSiteSettings();
  const social = (settings?.social_urls as any) || {};
  return (
    <footer className="as-footer">
      <div className="as-wrap as-fmain">
        <div>
          <BrandLogo dark />
          <p className="about">Independent reporting on finance, tax, and technology — for people who'd rather understand their money than guess at it.</p>
          <div className="as-foot-social">
            {Object.keys(SOCIAL_ICONS).map(k => (
              <a key={k} href={social[k] || "#"}><i className={SOCIAL_ICONS[k]} /></a>
            ))}
          </div>
        </div>
        <div className="as-fcol"><h5>Sections</h5><a>Finance</a><a>Tax</a><a>Technology</a><a>Business</a></div>
        <div className="as-fcol"><h5>Company</h5><Link to="/about-us">About</Link><a>Contact</a><a>Advertise</a><a>Careers</a></div>
        <div className="as-fcol"><h5>Legal</h5><Link to="/privacy-policy">Privacy</Link><a>Terms</a><a>Disclaimer</a></div>
      </div>
      <div className="as-wrap as-fbot">
        <span>© 2026 Astepstair Media. All rights reserved.</span>
        <span>Editorial content, not financial advice.</span>
      </div>
    </footer>
  );
}

export function NewsletterPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("as_popup_seen") === "1") return;
    const t = setTimeout(() => setOpen(true), 60000);
    return () => clearTimeout(t);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from("newsletter_subscribers").insert({ email, source: "popup" });
    setDone(true);
    setTimeout(close, 1500);
  };
  const close = () => { sessionStorage.setItem("as_popup_seen", "1"); setOpen(false); };
  if (!open) return null;
  return (
    <div className="as-popup-overlay" onClick={close}>
      <div className="as-popup" onClick={e => e.stopPropagation()}>
        <button className="close-pop" onClick={close}>×</button>
        <h2>Don't miss the good stuff.</h2>
        <p>Join 240,000+ readers who get one sharp email every morning — finance, tax, and tech in under 5 minutes.</p>
        {done ? <p style={{ color: "var(--brass)" }}>Thanks — you're in.</p> : (
          <form onSubmit={submit}>
            <div className="as-nform"><input required type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} /><button>Subscribe Free</button></div>
            <small>No spam, ever. Unsubscribe anytime.</small>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AstepstairLayout({ children }: { children: ReactNode }) {
  return (
    <div className="astepstair">
      <AstepstairHeader />
      {children}
      <AstepstairFooter />
      <NewsletterPopup />
    </div>
  );
}

export { SOCIAL_ICONS };
