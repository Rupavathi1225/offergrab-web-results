import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { initSession, trackClick } from "@/lib/tracking";
import { getUserCountryCode } from "@/lib/countryAccess";

interface LandingContent {
  site_name: string;
  headline: string;
  description: string;
  redirect_enabled: boolean;
  redirect_delay_seconds: number;
}

interface RelatedSearch {
  id: string;
  title: string;
  serial_number: number;
  target_wr: number;
}

const Landing = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState<LandingContent | null>(null);
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCountry, setUserCountry] = useState<string>("XX");
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    initSession();
    fetchData();
    getUserCountryCode().then(setUserCountry);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch content and one search per target_wr page (1, 2, 3, 4)
      const [contentRes, wr1, wr2, wr3, wr4] = await Promise.all([
        supabase.from('landing_content').select('*').limit(1).maybeSingle(),
        supabase
          .from('related_searches')
          .select('*')
          .eq('is_active', true)
          .eq('target_wr', 1)
          .order('serial_number', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('related_searches')
          .select('*')
          .eq('is_active', true)
          .eq('target_wr', 2)
          .order('serial_number', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('related_searches')
          .select('*')
          .eq('is_active', true)
          .eq('target_wr', 3)
          .order('serial_number', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('related_searches')
          .select('*')
          .eq('is_active', true)
          .eq('target_wr', 4)
          .order('serial_number', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      if (contentRes.data) setContent(contentRes.data);
      
      // Combine searches from each page into array
      const allSearches: RelatedSearch[] = [];
      if (wr1.data) allSearches.push(wr1.data);
      if (wr2.data) allSearches.push(wr2.data);
      if (wr3.data) allSearches.push(wr3.data);
      if (wr4.data) allSearches.push(wr4.data);
      setSearches(allSearches);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Country-based redirect to fallback URLs ONLY if redirect is enabled (toggle ON)
  useEffect(() => {
    if (!content?.redirect_enabled || loading || clicked) return;

    // Check if user should be redirected based on country
    const checkCountryRedirect = async () => {
      try {
        // Get web results to check allowed countries
        const { data: webResults } = await supabase
          .from("web_results")
          .select("allowed_countries")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (!webResults) return;

        const allowedCountries = webResults.allowed_countries || ["worldwide"];
        const effectiveCountry = userCountry.toUpperCase();

        // Check if user's country is allowed
        const isAllowed = allowedCountries.some((c: string) => {
          const countryLower = c.toLowerCase();
          const countryUpper = c.toUpperCase();
          return countryLower === "worldwide" || countryUpper === effectiveCountry;
        });

        // If country not allowed, redirect to fallback URL
        if (!isAllowed) {
          // Fetch fallback URL
          const { data: allUrls } = await supabase
            .from("fallback_urls")
            .select("*")
            .eq("is_active", true)
            .order("sequence_order", { ascending: true });

          if (!allUrls || allUrls.length === 0) return;

          // Filter URLs allowed for user's country
          const isSheetsUrl = (u: string) => u.includes("docs.google.com/spreadsheets");
          const isUrlAllowed = (url: { allowed_countries: string[] | null }) => {
            const countries = url.allowed_countries || ["worldwide"];
            return countries.some((c) => {
              const cl = c.toLowerCase();
              const cu = c.toUpperCase();
              return cl === "worldwide" || cu === effectiveCountry;
            });
          };

          const allowedUrls = allUrls.filter((url) => !isSheetsUrl(url.url) && isUrlAllowed(url));
          if (allowedUrls.length === 0) return;

          // Get next URL in sequence
          const storageKey = `fallback_index_landing_${effectiveCountry}`;
          let currentIndex = parseInt(localStorage.getItem(storageKey) || "0", 10);
          currentIndex = currentIndex % allowedUrls.length;
          const selectedUrl = allowedUrls[currentIndex];

          // Update index for next visit
          localStorage.setItem(storageKey, ((currentIndex + 1) % allowedUrls.length).toString());

          // Redirect after delay
          const timer = setTimeout(() => {
            window.location.href = selectedUrl.url;
          }, content.redirect_delay_seconds * 1000);
          
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error("Error checking country redirect:", error);
      }
    };

    checkCountryRedirect();
  }, [content, loading, clicked, userCountry]);

  const handleSearchClick = (search: RelatedSearch) => {
    setClicked(true);
    trackClick('related_search', search.id, search.title, '/landing');
    navigate(`/webresult/${search.target_wr}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <h1 className="text-xl font-display font-bold text-primary glow-text">
            {content?.site_name || 'OfferGrab'}
          </h1>
          <button className="p-2 hover:bg-secondary/50 rounded-lg transition-colors">
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-6 leading-tight">
            {content?.headline || 'Grab Hot Deals Faster'}
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl mb-12 leading-relaxed">
            {content?.description || 'Finding great offers is all OfferGrabZone helps users spot trending deals, hidden discounts, and limited-time steals before they disappear.'}
          </p>
        </div>

        {/* Related Searches */}
        {searches.length > 0 && (
          <div className="max-w-xl mx-auto">
            <p className="text-center text-muted-foreground text-sm mb-6">
              Related Searches
            </p>
            
            <div className="space-y-3">
              {searches.map((search, index) => (
                <div
                  key={search.id}
                  onClick={() => handleSearchClick(search)}
                  className="group cursor-pointer bg-card/80 border border-border/30 rounded-lg px-4 py-3 flex items-center justify-between hover:bg-primary/20 hover:border-primary/50 transition-all duration-200"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <span className="text-primary text-sm font-medium">{search.title}</span>
                  <span className="text-muted-foreground group-hover:text-primary transition-colors text-sm">
                    →
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          © {new Date().getFullYear()} {content?.site_name || 'OfferGrab'}. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
