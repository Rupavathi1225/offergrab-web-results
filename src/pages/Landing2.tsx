import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { getUserCountryCode } from "@/lib/countryAccess";
import { trackClick, getOrCreateSessionId, initSession } from "@/lib/tracking";

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
  const [clicked, setClicked] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [userCountry, setUserCountry] = useState<string>("XX");
  const qParam = searchParams.get("q") || "unknown";

  // Initialize session and track page view on mount
  useEffect(() => {
    const trackPageView = async () => {
      console.log('Landing2: Initializing session...');
      await initSession();
      console.log('Landing2: Session initialized, tracking page view...');
      await trackClick('landing2_view', undefined, `q=${qParam}`, '/landing2');
      console.log('Landing2: Page view tracked');
    };
    trackPageView();
  }, [qParam]);

  // Fetch user's country code (robust fallback chain)
  useEffect(() => {
    getUserCountryCode().then(setUserCountry);
  }, []);

  useEffect(() => {
    const fetchTopBlogs = async () => {
      try {
        const { data, error } = await supabase
          .from("blogs")
          .select("id, title, slug")
          .eq("status", "published")
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(5);

        if (error) throw error;
        setBlogs(data || []);
      } catch (error) {
        console.error("Error fetching blogs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopBlogs();
  }, []);

  // Fetch fallback URL for auto-redirect (country-filtered)
  useEffect(() => {
    const fetchNextUrl = async () => {
      // If country lookup fails and stays "XX", we only allow "worldwide" URLs (safe default)
      const effectiveCountry = userCountry === "XX" ? "WORLDWIDE_ONLY" : userCountry.toUpperCase();
      
      try {
        const { data: allUrls, error: urlsError } = await supabase
          .from("fallback_urls")
          .select("*")
          .eq("is_active", true)
          .order("sequence_order", { ascending: true });

        if (urlsError || !allUrls || allUrls.length === 0) {
          console.error("No fallback URLs configured");
          return;
        }

        const isSheetsUrl = (u: string) => u.includes("docs.google.com/spreadsheets");
        
        // Check if URL is allowed for user's country
        const isAllowedForUser = (url: FallbackUrl) => {
          const countries = url.allowed_countries || ["worldwide"];

          // If we couldn't detect country, only allow worldwide URLs
          if (effectiveCountry === "WORLDWIDE_ONLY") {
            return countries.some((c) => c.toLowerCase() === "worldwide");
          }

          return countries.some((c) => {
            const countryLower = c.toLowerCase();
            const countryUpper = c.toUpperCase();
            // Allow if "worldwide" or exact country match
            return countryLower === "worldwide" || countryUpper === effectiveCountry;
          });
        };

        // Filter to only URLs allowed for this user's country (excluding sheets)
        const allowedUrls = allUrls.filter((url: FallbackUrl) => 
          !isSheetsUrl(url.url) && isAllowedForUser(url)
        );

        if (allowedUrls.length === 0) {
          console.error("No fallback URL available for country:", userCountry);
          return;
        }

        // Use country-specific storage key for cycling through allowed URLs only
        const storageKey = `fallback_allowed_index_${effectiveCountry === "WORLDWIDE_ONLY" ? "XX" : effectiveCountry}`;
        let currentIndex = parseInt(localStorage.getItem(storageKey) || "0", 10);
        
        // Ensure index is within bounds of allowed URLs
        currentIndex = currentIndex % allowedUrls.length;
        
        const selectedUrl = allowedUrls[currentIndex] as FallbackUrl;
        setRedirectUrl(selectedUrl.url);

        // Move to next allowed URL for next visit
        const nextIndex = (currentIndex + 1) % allowedUrls.length;
        localStorage.setItem(storageKey, nextIndex.toString());

        console.log("User country:", userCountry);
        console.log("Allowed URLs count:", allowedUrls.length);
        console.log("Selected index:", currentIndex);
        console.log("Redirecting to:", selectedUrl.url);
      } catch (error) {
        console.error("Error fetching fallback URL:", error);
      }
    };

    fetchNextUrl();
  }, [userCountry]);

  // Auto-redirect after 5 seconds to fallback URL
  useEffect(() => {
    if (loading || clicked || !redirectUrl) return;

    const timer = setTimeout(async () => {
      // Track fallback redirect with the URL
      console.log('Landing2: Tracking fallback redirect to:', redirectUrl);
      await trackClick('fallback_redirect', undefined, redirectUrl, '/landing2', undefined, redirectUrl);
      console.log('Landing2: Redirecting now...');
      window.location.href = redirectUrl;
    }, 5000);

    return () => clearTimeout(timer);
  }, [loading, clicked, redirectUrl]);

  const handleSearchClick = async (blog: Blog) => {
    setClicked(true);
    // Track click on related search from landing2
    console.log('Landing2: Tracking click on:', blog.title);
    await trackClick('landing2_click', blog.id, blog.title, '/landing2');
    console.log('Landing2: Click tracked, navigating...');
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
  );
};

export default Landing2;