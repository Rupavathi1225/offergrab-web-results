import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Search, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { initSession, trackClick, getOrCreateSessionId } from "@/lib/tracking";
import { generateRandomToken } from "@/lib/linkGenerator";
import { getUserCountryCode, isCountryAllowed } from "@/lib/countryAccess";
import { hasUserInteracted, markUserInteraction, clearUserInteraction } from "@/lib/interactionTracker";

interface WebResultItem {
  id: string;
  name: string;
  title: string;
  description: string | null;
  link: string;
  logo_url: string | null;
  is_sponsored: boolean;
  serial_number: number;
  allowed_countries: string[] | null;
  fallback_link: string | null;
}

interface LandingContent {
  site_name: string;
  redirect_enabled?: boolean;
}

interface Prelanding {
  id: string;
  is_active: boolean;
}

// FallbackUrl interface removed - no auto-redirect on this page
// Generate unique random names for masked URLs
const generateUniqueMaskedNames = (count: number): string[] => {
  const names: string[] = [];
  const usedNames = new Set<string>();
  
  const prefixes = ['deal', 'offer', 'promo', 'save', 'get', 'win', 'try', 'find', 'best', 'top', 'hot', 'new', 'vip', 'pro', 'plus'];
  const suffixes = ['zone', 'hub', 'spot', 'site', 'now', 'go', 'link', 'click', 'web', 'net', 'io', 'app', 'page', 'box', 'max'];
  
  for (let i = 0; i < count; i++) {
    let name = '';
    let attempts = 0;
    
    while (attempts < 100) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      const randomNum = Math.floor(Math.random() * 999) + 1;
      name = `${prefix}${suffix}${randomNum}`;
      
      if (!usedNames.has(name)) {
        usedNames.add(name);
        break;
      }
      attempts++;
    }
    
    // Fallback to fully random if we couldn't generate a unique name
    if (usedNames.has(name)) {
      name = generateRandomToken(10);
      usedNames.add(name);
    }
    
    names.push(name);
  }
  
  return names;
};

const WebResult = () => {
  const { page } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const wrPage = parseInt(page || '1');
  
  const [results, setResults] = useState<WebResultItem[]>([]);
  const [content, setContent] = useState<LandingContent | null>(null);
  const [prelandings, setPrelandings] = useState<Record<string, Prelanding>>({});
  const [loading, setLoading] = useState(true);
  const [maskedNames, setMaskedNames] = useState<string[]>([]);
  const [userCountryCode, setUserCountryCode] = useState<string>('XX');
  
  // On WebResult page, auto-redirect is ALWAYS disabled
  // User has already navigated here (either directly or via Related Search)
  // No redirect logic needed on this page

  // Get blog context from navigation state
  const fromBlog = location.state?.fromBlog;
  const blogSlug = location.state?.blogSlug;

  // Separate sponsored and organic results, with sponsored first
  const sponsoredResults = results.filter(r => r.is_sponsored);
  const organicResults = results.filter(r => !r.is_sponsored);

  // Generate masked URL with unique random name
  const getMaskedUrl = (index: number) => {
    const name = maskedNames[index] || generateRandomToken(8);
    return `https://offergrab.${name}/`;
  };

  useEffect(() => {
    document.title = `Web Results - Page ${wrPage}`;
    initSession();
    fetchData();
    // Get user's country code for access checking
    getUserCountryCode().then(code => setUserCountryCode(code));
    
    // Mark user interaction when they reach this page
    // This ensures no redirects happen since they navigated here intentionally
    markUserInteraction();
  }, [wrPage]);

  // Generate unique masked names when results change
  useEffect(() => {
    if (results.length > 0) {
      setMaskedNames(generateUniqueMaskedNames(results.length));
    }
  }, [results]);

  // NO AUTO-REDIRECT on WebResult page
  // The user has already navigated here, so we respect their intent
  // All redirect logic has been removed from this page

  const fetchData = async () => {
    try {
      // If user came from a blog, scope results to that blog only
      if (fromBlog && blogSlug) {
        const { data: blog, error: blogErr } = await supabase
          .from("blogs")
          .select("id")
          .eq("slug", blogSlug)
          .maybeSingle();
        if (blogErr) throw blogErr;

        if (!blog?.id) {
          setResults([]);
        } else {
          const { data: search, error: searchErr } = await supabase
            .from("related_searches")
            .select("id")
            .eq("blog_id", blog.id)
            .eq("target_wr", wrPage)
            .maybeSingle();
          if (searchErr) throw searchErr;

          if (!search?.id) {
            setResults([]);
          } else {
            const [resultsRes, contentRes, prelandingsRes] = await Promise.all([
              supabase
                .from("web_results")
                .select("*")
                .eq("related_search_id", search.id)
                .eq("is_active", true)
                .order("serial_number", { ascending: true }),
              supabase
                .from("landing_content")
                .select("site_name, redirect_enabled")
                .limit(1)
                .maybeSingle(),
              supabase.from("prelandings").select("id, web_result_id, is_active").eq("is_active", true),
            ]);

            if (resultsRes.data) setResults(resultsRes.data);
            if (contentRes.data) setContent(contentRes.data);

            if (prelandingsRes.data) {
              const prelandingMap: Record<string, Prelanding> = {};
              prelandingsRes.data.forEach((p: any) => {
                if (p.web_result_id) {
                  prelandingMap[p.web_result_id] = { id: p.id, is_active: p.is_active };
                }
              });
              setPrelandings(prelandingMap);
            }
          }
        }
        return;
      }

      // Default (no blog context): show global results by page
      const [resultsRes, contentRes, prelandingsRes] = await Promise.all([
        supabase
          .from('web_results')
          .select('*')
          .eq('wr_page', wrPage)
          .eq('is_active', true)
          .order('serial_number', { ascending: true }),
        supabase.from('landing_content').select('site_name, redirect_enabled').limit(1).maybeSingle(),
        supabase.from('prelandings').select('id, web_result_id, is_active').eq('is_active', true),
      ]);

      if (resultsRes.data) setResults(resultsRes.data);
      if (contentRes.data) setContent(contentRes.data);

      if (prelandingsRes.data) {
        const prelandingMap: Record<string, Prelanding> = {};
        prelandingsRes.data.forEach((p: any) => {
          if (p.web_result_id) {
            prelandingMap[p.web_result_id] = { id: p.id, is_active: p.is_active };
          }
        });
        setPrelandings(prelandingMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = async (result: WebResultItem, index: number) => {
    const lid = index + 1;

    // Track click (don't await to avoid delay)
    trackClick('web_result', result.id, result.title, `/webresult/${wrPage}`, lid, result.link);

    // If admin redirect toggle is ON: navigate to /landing2 (which handles the 5s timer & fallback redirect)
    // If admin redirect toggle is OFF: go directly to the web result's actual URL
    if (content?.redirect_enabled) {
      // Clear interaction flag so /landing2 can start its timer fresh
      clearUserInteraction();
      // Navigate to /landing2 page - it will handle the 5s timer and fallback redirect
      const randomId = Math.random().toString(36).substring(2, 10);
      navigate(`/q?q=${randomId}&wrId=${result.id}`);
    } else {
      // Toggle OFF: Go directly to the actual web result URL
      // Check if prelanding exists and is active
      const prelanding = prelandings[result.id];
      
      if (prelanding && prelanding.is_active) {
        // Navigate to prelanding page - pass blog context if coming from blog
        navigate(`/prelanding/${prelanding.id}`, {
          state: { 
            fromBlog,
            blogSlug,
            webResultLink: result.link
          }
        });
      } else {
        // Open link directly
        window.open(result.link, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleBack = () => {
    if (fromBlog && blogSlug) {
      // Return to the specific blog page
      navigate(`/blog/${blogSlug}`);
    } else {
      navigate('/landing');
    }
  };

  const getLogoDisplay = (result: WebResultItem) => {
    if (result.logo_url) {
      return (
        <img 
          src={result.logo_url} 
          alt={result.name} 
          className="w-10 h-10 rounded-lg object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
      );
    }
    return null;
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
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
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBack}
              className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h1 
              className="text-xl font-display font-bold text-primary glow-text cursor-pointer"
              onClick={() => navigate('/landing')}
            >
              {content?.site_name || 'OfferGrab'}
            </h1>
          </div>
          <button className="p-2 hover:bg-secondary/50 rounded-lg transition-colors">
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Sponsored Results Section */}
      {sponsoredResults.length > 0 && (
        <section className="bg-[#1a1f35] border-b border-border/30">
          <div className="container mx-auto px-4 py-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {sponsoredResults.map((result, index) => (
                <div
                  key={result.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="text-sm text-muted-foreground mb-1">
                    <span className="text-xs">Sponsored</span>
                  </div>
                  <h3 
                    className="text-primary hover:underline cursor-pointer font-serif text-lg mb-1 tracking-wide underline"
                    onClick={() => handleResultClick(result, index)}
                  >
                    {result.title}
                  </h3>
                  <p 
                    className="text-muted-foreground text-xs mb-2 cursor-pointer hover:underline hover:text-primary"
                    onClick={() => handleResultClick(result, index)}
                  >
                    {getMaskedUrl(index + 1)}
                  </p>
                  {result.description && (
                    <p className="text-muted-foreground/80 text-sm italic mb-3">
                      {result.description}
                    </p>
                  )}
                  <button
                    onClick={() => handleResultClick(result, index)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded font-medium text-sm flex items-center gap-2 transition-colors"
                  >
                    <span>➤</span> Visit Website
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Organic Results Section */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {organicResults.length > 0 && (
            <p className="text-muted-foreground text-sm mb-6">Web Results</p>
          )}

          <div className="space-y-6">
            {organicResults.map((result, index) => (
              <div
                key={result.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <p 
                  className="text-muted-foreground text-xs mb-1 cursor-pointer hover:underline"
                  onClick={() => handleResultClick(result, sponsoredResults.length + index)}
                >
                  {getMaskedUrl(sponsoredResults.length + index + 1)}
                </p>
                <h3 
                  className="text-primary hover:underline cursor-pointer text-lg mb-1"
                  onClick={() => handleResultClick(result, sponsoredResults.length + index)}
                >
                  {result.title}
                </h3>
                {result.description && (
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {result.description}
                  </p>
                )}
              </div>
            ))}

            {results.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No results found for this page.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default WebResult;
