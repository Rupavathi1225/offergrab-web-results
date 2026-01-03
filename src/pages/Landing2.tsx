import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { getUserCountryCode } from "@/lib/countryAccess";
import { trackClick, initSession } from "@/lib/tracking";
import { hasUserInteracted, markUserInteraction } from "@/lib/interactionTracker";

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

const Landing2 = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [clicked, setClicked] = useState(() => hasUserInteracted());
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [userCountry, setUserCountry] = useState<string>("XX");
  const [adminRedirectEnabled, setAdminRedirectEnabled] = useState(false);
  const [redirectDelay, setRedirectDelay] = useState(5);
  const redirectTimerRef = useRef<number | undefined>(undefined);
  const qParam = searchParams.get("q") || "unknown";
  const wrId = searchParams.get("wrId");

  // Cancel redirect immediately when clicked changes
  useEffect(() => {
    if (clicked && redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = undefined;
    }
  }, [clicked]);

  const effectiveRedirectEnabled = useMemo(() => {
    return adminRedirectEnabled;
  }, [adminRedirectEnabled]);

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

  // Always fetch fallback URL for country-based redirect (no mismatch check needed)
  useEffect(() => {
    const fetchFallbackUrl = async () => {
      const effectiveCountry = userCountry.toUpperCase();

      try {
        const { data: allUrls, error: urlsError } = await supabase
          .from("fallback_urls")
          .select("*")
          .eq("is_active", true)
          .order("sequence_order", { ascending: true });

        if (urlsError || !allUrls || allUrls.length === 0) return;

        const isSheetsUrl = (u: string) => u.includes("docs.google.com/spreadsheets");

        const isAllowedForUser = (url: FallbackUrl) => {
          const countries = url.allowed_countries || ["worldwide"];
          return countries.some((c) => {
            const countryLower = (c || "").toLowerCase();
            const countryUpper = (c || "").toUpperCase();
            return countryLower === "worldwide" || countryLower === "ww" || countryUpper === effectiveCountry;
          });
        };

        const allowedUrls = allUrls.filter(
          (url: FallbackUrl) => !isSheetsUrl(url.url) && isAllowedForUser(url)
        );

        if (allowedUrls.length === 0) return;

        const storageKey = `fallback_allowed_index_${effectiveCountry}`;
        let currentIndex = parseInt(localStorage.getItem(storageKey) || "0", 10);
        currentIndex = currentIndex % allowedUrls.length;

        const selectedUrl = allowedUrls[currentIndex] as FallbackUrl;
        setRedirectUrl(selectedUrl.url);

        localStorage.setItem(storageKey, ((currentIndex + 1) % allowedUrls.length).toString());
      } catch (error) {
        console.error("Error fetching fallback URL:", error);
      }
    };

    fetchFallbackUrl();
  }, [userCountry]);

  // Auto-redirect after delay ONLY if admin enabled + mismatch (redirectUrl present) + no user interaction
  useEffect(() => {
    // Check session-based interaction flag
    if (hasUserInteracted()) {
      setClicked(true);
      return;
    }

    if (!effectiveRedirectEnabled || loading || clicked || !redirectUrl) return;

    redirectTimerRef.current = window.setTimeout(() => {
      // Final check before redirect
      if (hasUserInteracted()) return;
      
      // Fire-and-forget tracking; don't block redirect.
      void trackClick("fallback_redirect", undefined, redirectUrl, "/landing2", undefined, redirectUrl);

      // In previews the app runs in an iframe; use top-level navigation (not a popup).
      if (window.self !== window.top) {
        window.top.location.href = redirectUrl;
      } else {
        window.location.href = redirectUrl;
      }
    }, redirectDelay * 1000);

    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = undefined;
      }
    };
  }, [effectiveRedirectEnabled, loading, clicked, redirectUrl, redirectDelay]);

  const handleSearchClick = async (blog: Blog) => {
    // Mark interaction in session storage - this persists across page navigations
    markUserInteraction();
    setClicked(true);
    
    // Clear any pending redirect timer immediately
    if (redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = undefined;
    }
    
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

