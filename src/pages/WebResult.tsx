import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { initSession, trackClick, getOrCreateSessionId } from "@/lib/tracking";

interface WebResultItem {
  id: string;
  name: string;
  title: string;
  description: string | null;
  link: string;
  logo_url: string | null;
  is_sponsored: boolean;
  serial_number: number;
}

interface LandingContent {
  site_name: string;
}

interface Prelanding {
  id: string;
  is_active: boolean;
}

const WebResult = () => {
  const { page } = useParams();
  const navigate = useNavigate();
  const wrPage = parseInt(page || '1');
  
  const [results, setResults] = useState<WebResultItem[]>([]);
  const [content, setContent] = useState<LandingContent | null>(null);
  const [prelandings, setPrelandings] = useState<Record<string, Prelanding>>({});
  const [loading, setLoading] = useState(true);

  // Separate sponsored and organic results, with sponsored first
  const sponsoredResults = results.filter(r => r.is_sponsored);
  const organicResults = results.filter(r => !r.is_sponsored);

  // Generate masked URL with lid format
  const getMaskedUrl = (lid: number) => {
    return `https://offergrabzone.lid${lid}/`;
  };

  useEffect(() => {
    document.title = `Web Results - Page ${wrPage}`;
    initSession();
    fetchData();
  }, [wrPage]);

  const fetchData = async () => {
    try {
      const [resultsRes, contentRes, prelandingsRes] = await Promise.all([
        supabase
          .from('web_results')
          .select('*')
          .eq('wr_page', wrPage)
          .eq('is_active', true)
          .order('serial_number', { ascending: true }),
        supabase.from('landing_content').select('site_name').limit(1).maybeSingle(),
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
    await trackClick('web_result', result.id, result.title, `/webresult/${wrPage}`, lid, result.link);
    
    // Check if prelanding exists and is active
    const prelanding = prelandings[result.id];
    if (prelanding && prelanding.is_active) {
      navigate(`/prelanding/${prelanding.id}?redirect=${encodeURIComponent(result.link)}`);
    } else {
      // Open link directly
      window.open(result.link, '_blank', 'noopener,noreferrer');
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
              onClick={() => navigate('/landing')}
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
                  <h3 
                    className="text-primary hover:underline cursor-pointer font-serif text-lg mb-1 tracking-wide underline"
                    onClick={() => handleResultClick(result, index)}
                  >
                    {result.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span className="text-xs">Sponsored</span>
                    <span>·</span>
                    <span 
                      className="cursor-pointer hover:underline hover:text-primary"
                      onClick={() => handleResultClick(result, index)}
                    >
                      {getMaskedUrl(index + 1)}
                    </span>
                    <span className="cursor-pointer">⋮</span>
                  </div>
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
                <div className="flex items-center gap-2 mb-1">
                  {/* Logo */}
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                    {result.logo_url ? (
                      <img 
                        src={result.logo_url} 
                        alt={result.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const span = document.createElement('span');
                            span.className = 'text-xs font-bold text-primary';
                            span.textContent = getInitial(result.name);
                            parent.appendChild(span);
                          }
                        }}
                      />
                    ) : (
                      <span className="text-xs font-bold text-primary">
                        {getInitial(result.name)}
                      </span>
                    )}
                  </div>
                  <span className="text-foreground text-sm">{result.name}</span>
                </div>
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
