import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { initSession, trackClick } from "@/lib/tracking";
import { getUserCountryCode } from "@/lib/countryAccess";
import { generateRandomToken } from "@/lib/linkGenerator";

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
      const [contentRes, wr1, wr2, wr3, wr4] = await Promise.all([
        supabase.from("landing_content").select("*").limit(1).maybeSingle(),
        supabase
          .from("related_searches")
          .select("*")
          .eq("is_active", true)
          .eq("target_wr", 1)
          .order("serial_number", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("related_searches")
          .select("*")
          .eq("is_active", true)
          .eq("target_wr", 2)
          .order("serial_number", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("related_searches")
          .select("*")
          .eq("is_active", true)
          .eq("target_wr", 3)
          .order("serial_number", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("related_searches")
          .select("*")
          .eq("is_active", true)
          .eq("target_wr", 4)
          .order("serial_number", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      if (contentRes.data) setContent(contentRes.data);

      const allSearches: RelatedSearch[] = [];
      if (wr1.data) allSearches.push(wr1.data);
      if (wr2.data) allSearches.push(wr2.data);
      if (wr3.data) allSearches.push(wr3.data);
      if (wr4.data) allSearches.push(wr4.data);
      setSearches(allSearches);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Redirect only when: admin enabled + country mismatch
  // IMPORTANT: prevent the async flow from scheduling a timer after the user navigates away.
  useEffect(() => {
    if (!content?.redirect_enabled || loading || clicked) return;

    let timer: number | undefined;
    let cancelled = false;

    const run = async () => {
      try {
        const effectiveCountry = userCountry.toUpperCase();

        const { data: webResults, error: webResultsError } = await supabase
          .from("web_results")
          .select("allowed_countries")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        if (webResultsError || !webResults) return;

        const allowedCountries = webResults.allowed_countries || ["worldwide"];

        const isAllowed = allowedCountries.some((c: string) => {
          const countryLower = c.toLowerCase();
          const countryUpper = c.toUpperCase();
          return countryLower === "worldwide" || countryUpper === effectiveCountry;
        });

        if (isAllowed) return;

        const { data: allUrls, error: urlsError } = await supabase
          .from("fallback_urls")
          .select("*")
          .eq("is_active", true)
          .order("sequence_order", { ascending: true });

        if (cancelled) return;
        if (urlsError || !allUrls || allUrls.length === 0) return;

        const isSheetsUrl = (u: string) => u.includes("docs.google.com/spreadsheets");
        const isUrlAllowed = (url: { allowed_countries: string[] | null }) => {
          const countries = url.allowed_countries || ["worldwide"];
          return countries.some((c) => {
            const cl = c.toLowerCase();
            const cu = c.toUpperCase();
            return cl === "worldwide" || cu === effectiveCountry;
          });
        };

        const allowedUrls = allUrls.filter(
          (url: { url: string; allowed_countries: string[] | null }) =>
            !isSheetsUrl(url.url) && isUrlAllowed(url)
        );
        if (allowedUrls.length === 0) return;

        const storageKey = `fallback_index_landing_${effectiveCountry}`;
        let currentIndex = parseInt(localStorage.getItem(storageKey) || "0", 10);
        currentIndex = currentIndex % allowedUrls.length;
        const selectedUrl = allowedUrls[currentIndex];
        localStorage.setItem(storageKey, ((currentIndex + 1) % allowedUrls.length).toString());

        if (cancelled) return;
        timer = window.setTimeout(() => {
          // In previews the app runs in an iframe; use top-level navigation (not a popup).
          if (window.self !== window.top) {
            window.top.location.href = selectedUrl.url;
          } else {
            window.location.href = selectedUrl.url;
          }
        }, content.redirect_delay_seconds * 1000);
      } catch (error) {
        if (!cancelled) console.error("Error checking country redirect:", error);
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [content?.redirect_enabled, content?.redirect_delay_seconds, loading, clicked, userCountry]);

  const handleSearchClick = (search: RelatedSearch) => {
    setClicked(true);
    trackClick("related_search", search.id, search.title, "/landing");
    navigate(`/wr/${search.target_wr}/${generateRandomToken(8)}`);
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
      <header className="border-b border-border/50 py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <h1 className="text-xl font-display font-bold text-primary glow-text">
            TopUniversity
          </h1>

          <button className="p-2 hover:bg-secondary/50 rounded-lg transition-colors" aria-label="Search">
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 md:py-24">
        <section className="max-w-3xl mx-auto text-center animate-fade-in">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground mb-6 leading-tight">
            {content?.headline || "Grab Hot Deals Faster"}
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl mb-12 leading-relaxed">
            {content?.description ||
              "Finding great educational resources is all TopUniversity helps users discover trending programs, hidden opportunities, and limited-time offers before they disappear."}
          </p>
        </section>

        {searches.length > 0 && (
          <section className="max-w-xl mx-auto">
            <p className="text-center text-muted-foreground text-sm mb-6">Related Searches</p>

            <div className="space-y-3">
              {searches.map((search, index) => (
                <article
                  key={search.id}
                  onClick={() => handleSearchClick(search)}
                  className="group cursor-pointer bg-card/80 border border-border/30 rounded-lg px-4 py-3 flex items-center justify-between hover:bg-primary/20 hover:border-primary/50 transition-all duration-200"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <span className="text-primary text-sm font-medium">{search.title}</span>
                  <span className="text-muted-foreground group-hover:text-primary transition-colors text-sm">
                    →
                  </span>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border/50 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <div className="flex items-center justify-center gap-4 mb-2">
            <a
              href="/about-us"
              className="hover:text-primary transition-colors"
            >
              About Us
            </a>
            <span className="text-border">•</span>
            <a
              href="/privacy-policy"
              className="hover:text-primary transition-colors"
            >
              Privacy Policy
            </a>
          </div>
          © {new Date().getFullYear()} Astepstair.com". All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Landing;

