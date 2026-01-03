import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { getUserCountryCode, isCountryAllowed } from "@/lib/countryAccess";
import { trackClick, initSession } from "@/lib/tracking";
import { markUserInteraction } from "@/lib/interactionTracker";

interface RelatedSearch {
  id: string;
  title: string;
  serial_number: number;
  target_wr: number;
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
  const [searches, setSearches] = useState<RelatedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [clicked, setClicked] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [userCountry, setUserCountry] = useState<string>("XX");
  const [adminRedirectEnabled, setAdminRedirectEnabled] = useState(false);
  const [redirectDelay, setRedirectDelay] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const redirectTimerRef = useRef<number | undefined>(undefined);
  const redirectIntervalRef = useRef<number | undefined>(undefined);
  const qParam = searchParams.get("q") || "unknown";
  const wrId = searchParams.get("wrId");

  // Cancel redirect immediately when user clicks
  useEffect(() => {
    if (clicked) {
      setSecondsLeft(null);
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = undefined;
      }
      if (redirectIntervalRef.current) {
        window.clearInterval(redirectIntervalRef.current);
        redirectIntervalRef.current = undefined;
      }
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
        // Fetch related searches (like Landing.tsx does) - one for each target_wr 1-4
        const [wr1, wr2, wr3, wr4, settingsRes] = await Promise.all([
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
          supabase
            .from("landing_content")
            .select("redirect_enabled, redirect_delay_seconds")
            .limit(1)
            .maybeSingle(),
        ]);

        const allSearches: RelatedSearch[] = [];
        if (wr1.data) allSearches.push(wr1.data);
        if (wr2.data) allSearches.push(wr2.data);
        if (wr3.data) allSearches.push(wr3.data);
        if (wr4.data) allSearches.push(wr4.data);
        setSearches(allSearches);

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

  // Fetch fallback URL for country-based redirect
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

        const allowedUrls = (allUrls as FallbackUrl[]).filter((url) => {
          if (isSheetsUrl(url.url)) return false;
          // Rule: user can visit ONLY their own country links + WORLDWIDE
          return isCountryAllowed(url.allowed_countries || ["worldwide"], effectiveCountry);
        });

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

  // Auto-redirect after delay: open fallback URL in NEW TAB
  useEffect(() => {
    if (!effectiveRedirectEnabled || loading || clicked || !redirectUrl) return;

    // Start visible countdown
    const startedAt = Date.now();
    const totalMs = redirectDelay * 1000;
    setSecondsLeft(redirectDelay);

    if (redirectIntervalRef.current) {
      window.clearInterval(redirectIntervalRef.current);
      redirectIntervalRef.current = undefined;
    }

    redirectIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0 && redirectIntervalRef.current) {
        window.clearInterval(redirectIntervalRef.current);
        redirectIntervalRef.current = undefined;
      }
    }, 250);

    redirectTimerRef.current = window.setTimeout(() => {
      if (clicked) return;

      void trackClick(
        "fallback_redirect",
        undefined,
        redirectUrl,
        "/landing2",
        undefined,
        redirectUrl
      );

      // Try to use the pre-opened tab (created when user clicked the web result)
      const tabName = sessionStorage.getItem("fallback_tab_name");
      if (tabName) {
        try {
          const existingTab = window.open(redirectUrl, tabName);
          if (existingTab) {
            sessionStorage.removeItem("fallback_tab_name");
            existingTab.focus?.();
            return;
          }
        } catch (e) {
          console.log("Could not use pre-opened tab:", e);
        }
      }

      // Try opening a new tab
      try {
        const newTab = window.open(redirectUrl, "_blank", "noopener,noreferrer");
        if (newTab) {
          newTab.focus?.();
          return;
        }
      } catch (e) {
        console.log("Could not open new tab:", e);
      }

      // If in iframe and both methods failed, create a link and click it
      const link = document.createElement("a");
      link.href = redirectUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, totalMs);

    return () => {
      setSecondsLeft(null);
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = undefined;
      }
      if (redirectIntervalRef.current) {
        window.clearInterval(redirectIntervalRef.current);
        redirectIntervalRef.current = undefined;
      }
    };
  }, [effectiveRedirectEnabled, loading, clicked, redirectUrl, redirectDelay]);

  // Handle related search click - navigate back to WebResults page
  const handleSearchClick = async (search: RelatedSearch) => {
    // Mark interaction in session storage
    markUserInteraction();
    setClicked(true);
    
    // Clear any pending redirect timer immediately
    if (redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = undefined;
    }
    
    await trackClick("landing2_click", search.id, search.title, "/landing2");
    // Navigate to WebResults page with the target_wr
    navigate(`/webresult/${search.target_wr}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (searches.length === 0) {
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
        {/* Countdown display */}
        {effectiveRedirectEnabled && !clicked && redirectUrl && secondsLeft !== null ? (
          <aside className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-md px-4 py-3">
            <p className="text-white/90 text-sm">
              Redirecting in <span className="font-semibold">{secondsLeft}</span>s…
            </p>
            <p className="text-white/60 text-xs mt-1">
              Click any search below to cancel
            </p>
          </aside>
        ) : null}

        {/* Related Searches header */}
        <p className="text-center text-white/70 text-sm">Related Searches</p>

        {/* Related Searches list */}
        <section className="space-y-3">
          {searches.map((search) => (
            <button
              key={search.id}
              onClick={() => handleSearchClick(search)}
              className="w-full flex items-center gap-3 p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl hover:bg-white/20 hover:border-yellow-400/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 text-left group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate group-hover:text-yellow-300 transition-colors">
                  {search.title}
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
