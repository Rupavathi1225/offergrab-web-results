import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { trackClick, initSession } from "@/lib/tracking";
import { Helmet } from "react-helmet-async";

interface Blog {
  id: string;
  title: string;
  slug: string;
}

const BlackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [clicked, setClicked] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [redirectEnabled, setRedirectEnabled] = useState(false);
  const [redirectDelay, setRedirectDelay] = useState(5);
  const qParam = searchParams.get("id") || searchParams.get("q") || "unknown";

  // Initialize session and track page view on mount
  useEffect(() => {
    const trackPageView = async () => {
      await initSession();
      await trackClick('landing2_view', undefined, `id=${qParam}`, '/go');
    };
    trackPageView();
  }, [qParam]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch blogs and redirect settings in parallel
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
            .maybeSingle()
        ]);

        if (blogsRes.error) throw blogsRes.error;
        setBlogs(blogsRes.data || []);

        if (settingsRes.data) {
          setRedirectEnabled(settingsRes.data.redirect_enabled);
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

  // Fetch fallback URL using edge function for country-aware redirect
  useEffect(() => {
    const fetchRedirectUrl = async () => {
      try {
        const response = await supabase.functions.invoke('country-redirect');
        if (response.data?.destination) {
          setRedirectUrl(response.data.destination);
        }
      } catch (error) {
        console.error("Error fetching redirect URL:", error);
      }
    };

    fetchRedirectUrl();
  }, []);

  // Auto-redirect after delay ONLY if redirect is enabled
  useEffect(() => {
    if (!redirectEnabled || loading || clicked || !redirectUrl) return;

    const timer = setTimeout(async () => {
      await trackClick('fallback_redirect', undefined, redirectUrl, '/go', undefined, redirectUrl);
      window.location.href = redirectUrl;
    }, redirectDelay * 1000);

    return () => clearTimeout(timer);
  }, [redirectEnabled, loading, clicked, redirectUrl, redirectDelay]);

  const handleSearchClick = async (blog: Blog) => {
    setClicked(true);
    await trackClick('landing2_click', blog.id, blog.title, '/go');
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
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-4">
        {/* Creative background with purple, yellow dots, black and red accents */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-purple-950" />
        
        {/* Yellow dots pattern */}
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

        {/* Black accent blobs */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-black/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-black/30 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />

        {/* Red accent glows */}
        <div className="absolute top-1/4 right-10 w-32 h-32 bg-red-600/30 rounded-full blur-2xl" />
        <div className="absolute bottom-1/3 left-16 w-24 h-24 bg-red-500/25 rounded-full blur-2xl" />

        {/* Content */}
        <div className="relative z-10 w-full max-w-xl space-y-4">
          {/* Search Results */}
          <div className="space-y-3">
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
          </div>
        </div>
      </div>
    </>
  );
};

export default BlackPage;
