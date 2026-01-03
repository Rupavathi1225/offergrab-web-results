import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { getUserCountryCode, isCountryAllowed } from "@/lib/countryAccess";
import { trackClick, initSession } from "@/lib/tracking";

interface Blog {
  id: string;
  title: string;
  slug: string;
}

interface FallbackUrl {
  id: string;
  url: string;
  sequence_order: number;
  allowed_countries: string[] | null;
}

type RedirectAction =
  | { kind: "external"; url: string }
  | { kind: "internal"; path: string };

const Landing2 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [clicked, setClicked] = useState(false);
  const [redirectAction, setRedirectAction] = useState<RedirectAction | null>(null);
  const [userCountry, setUserCountry] = useState<string>("XX");
  const [adminRedirectEnabled, setAdminRedirectEnabled] = useState(false);
  const [redirectDelay, setRedirectDelay] = useState(5);
  const qParam = searchParams.get("q") || "unknown";
  const wrId = searchParams.get("wrId");

  const fromBlog = (location.state as any)?.fromBlog;
  const blogSlug = (location.state as any)?.blogSlug;

  const effectiveRedirectEnabled = useMemo(() => {
    // Requirement: route via Landing2 on click and redirect after delay.
    // We still read admin settings for delay, but don't block the redirect.
    return true;
  }, []);

  useEffect(() => {
    const trackPageView = async () => {
      await initSession();
      await trackClick("landing2_view", undefined, `q=${qParam}`, "/landing2");
    };
    trackPageView();
  }, [qParam]);

  useEffect(() => {
    getUserCountryCode().then(setUserCountry);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [blogsRes, settingsRes] = await Promise.all([
          supabase
            .from("blogs")
            .select("id, title, slug")
            .eq("status", "published")
            .eq("is_active", true)
            .order("created_at", { ascending: true })
            .limit(5),
          supabase
            .from("landing_content")
            .select("redirect_enabled, redirect_delay_seconds")
            .limit(1)
            .maybeSingle(),
        ]);

        if (blogsRes.error) throw blogsRes.error;
        setBlogs(blogsRes.data || []);

        if (settingsRes.data) {
          setAdminRedirectEnabled(settingsRes.data.redirect_enabled);
          setRedirectDelay(settingsRes.data.redirect_delay_seconds);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Decide where to redirect after the delay:
  // - If the clicked web result is allowed for the user's country: go to prelanding (if active) else to the web result link.
  // - If not allowed: go to a country-allowed fallback URL.
  useEffect(() => {
    const computeRedirect = async () => {
      if (!wrId) return;

      try {
        const effectiveCountry = (userCountry || "XX").trim().toUpperCase();

        const { data: wr, error: wrErr } = await supabase
          .from("web_results")
          .select("id, link, allowed_countries")
          .eq("id", wrId)
          .maybeSingle();

        if (wrErr || !wr) return;

        const allowed = isCountryAllowed(wr.allowed_countries, effectiveCountry);

        if (allowed) {
          // Prefer prelanding if configured
          const { data: pre, error: preErr } = await supabase
            .from("prelandings")
            .select("id")
            .eq("web_result_id", wr.id)
            .eq("is_active", true)
            .maybeSingle();

          if (!preErr && pre?.id) {
            setRedirectAction({ kind: "internal", path: `/prelanding/${pre.id}` });
          } else {
            setRedirectAction({ kind: "external", url: wr.link });
          }

          return;
        }

        // Not allowed -> find fallback for this country
        const { data: allUrls, error: urlsError } = await supabase
          .from("fallback_urls")
          .select("*")
          .eq("is_active", true)
          .order("sequence_order", { ascending: true });

        if (urlsError || !allUrls || allUrls.length === 0) return;

        const isSheetsUrl = (u: string) => u.includes("docs.google.com/spreadsheets");

        const allowedFallbacks = (allUrls as FallbackUrl[]).filter((u) => {
          if (isSheetsUrl(u.url)) return false;
          return isCountryAllowed(u.allowed_countries, effectiveCountry);
        });

        if (allowedFallbacks.length === 0) return;

        const storageKey = `fallback_allowed_index_${effectiveCountry}`;
        let currentIndex = parseInt(localStorage.getItem(storageKey) || "0", 10);
        currentIndex = ((currentIndex % allowedFallbacks.length) + allowedFallbacks.length) % allowedFallbacks.length;

        const selectedUrl = allowedFallbacks[currentIndex];
        setRedirectAction({ kind: "external", url: selectedUrl.url });

        localStorage.setItem(storageKey, ((currentIndex + 1) % allowedFallbacks.length).toString());
      } catch (error) {
        console.error("Error computing redirect:", error);
      }
    };

    void computeRedirect();
  }, [userCountry, wrId]);

  // Auto-redirect after delay
  useEffect(() => {
    if (!effectiveRedirectEnabled || loading || clicked || !redirectAction) return;

    const timer = window.setTimeout(() => {
      const target = redirectAction.kind === "external" ? redirectAction.url : redirectAction.path;
      void trackClick("fallback_redirect", undefined, target, "/landing2");

      if (redirectAction.kind === "internal") {
        navigate(redirectAction.path, { state: { fromBlog, blogSlug } });
      } else {
        window.location.href = redirectAction.url;
      }
    }, redirectDelay * 1000);

    return () => window.clearTimeout(timer);
  }, [effectiveRedirectEnabled, loading, clicked, redirectAction, redirectDelay, navigate, fromBlog, blogSlug]);

  const handleSearchClick = async (blog: Blog) => {
    setClicked(true);
    await trackClick("landing2_click", blog.id, blog.title, "/landing2");
    navigate(`/blog/${blog.slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (blogs.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No content available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-purple-950" />

      <div className="absolute inset-0 opacity-60">
        {[...Array(40)].map((_, i) => (
          <div
            key={`yellow-${i}`}
            className="absolute rounded-full bg-yellow-400"
            style={{
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 8 + 4}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `pulse ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="absolute top-0 left-0 w-64 h-64 bg-black/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-black/30 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />

      <div className="absolute top-1/4 right-10 w-32 h-32 bg-red-600/30 rounded-full blur-2xl" />
      <div className="absolute bottom-1/3 left-16 w-24 h-24 bg-red-500/25 rounded-full blur-2xl" />

      <main className="relative z-10 w-full max-w-xl space-y-4">
        <section className="space-y-3">
          {blogs.map((blog) => (
            <button
              key={blog.id}
              onClick={() => handleSearchClick(blog)}
              className="w-full flex items-center gap-3 p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 hover:border-yellow-400/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 text-left group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate group-hover:text-yellow-300 transition-colors">
                  {blog.title}
                </p>
              </div>
              <div className="w-2 h-2 rounded-full bg-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Landing2;

