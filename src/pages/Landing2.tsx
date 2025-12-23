import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

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
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [clicked, setClicked] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [userCountry, setUserCountry] = useState<string>("XX");

  // Fetch user's country code
  useEffect(() => {
    const fetchCountry = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (response.ok) {
          const data = await response.json();
          setUserCountry(data.country_code || "XX");
        }
      } catch {
        console.log("Could not fetch country info");
      }
    };
    fetchCountry();
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
    if (userCountry === "XX") return; // Wait for country to load

    const fetchNextUrl = async () => {
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

        // Filter URLs that are accessible to user's country
        // URL is accessible if: has "worldwide" OR has user's country code
        const accessibleUrls = allUrls.filter((url: FallbackUrl) => {
          const countries = url.allowed_countries || ["worldwide"];
          return countries.includes("worldwide") || countries.includes(userCountry);
        });

        if (accessibleUrls.length === 0) {
          console.error("No fallback URLs available for country:", userCountry);
          return;
        }

        const { data: tracker, error: trackerError } = await supabase
          .from("fallback_sequence_tracker")
          .select("*")
          .limit(1)
          .single();

        let currentIndex = 0;
        if (!trackerError && tracker) {
          currentIndex = tracker.current_index;
        }

        // Find the next accessible URL based on sequence
        const nextIndex = currentIndex % accessibleUrls.length;
        const nextUrl = accessibleUrls[nextIndex].url;
        setRedirectUrl(nextUrl);

        // Update tracker for next visit
        const newIndex = (nextIndex + 1) % accessibleUrls.length;
        if (tracker) {
          await supabase
            .from("fallback_sequence_tracker")
            .update({ current_index: newIndex, updated_at: new Date().toISOString() })
            .eq("id", tracker.id);
        }
      } catch (error) {
        console.error("Error fetching fallback URL:", error);
      }
    };

    fetchNextUrl();
  }, [userCountry]);

  // Auto-redirect after 5 seconds to fallback URL
  useEffect(() => {
    if (loading || clicked || !redirectUrl) return;

    const timer = setTimeout(() => {
      window.location.href = redirectUrl;
    }, 5000);

    return () => clearTimeout(timer);
  }, [loading, clicked, redirectUrl]);

  const handleSearchClick = (blog: Blog) => {
    setClicked(true);
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Related Searches</h1>
        </div>

        {/* Related Searches */}
        <div className="space-y-3">
          {blogs.map((blog, index) => (
            <button
              key={blog.id}
              onClick={() => handleSearchClick(blog)}
              className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:bg-accent hover:border-primary/50 transition-all duration-200 text-left group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-medium truncate">{blog.title}</p>
                <p className="text-xs text-muted-foreground">
                  {index === 0 ? "Top Result" : "Related"}
                </p>
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Landing2;