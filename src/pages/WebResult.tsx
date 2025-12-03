import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const wrPage = parseInt(searchParams.get('wr') || '1');
  
  const [results, setResults] = useState<WebResultItem[]>([]);
  const [content, setContent] = useState<LandingContent | null>(null);
  const [prelandings, setPrelandings] = useState<Record<string, Prelanding>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    await trackClick('web_result', result.id, result.title, `/webresult?wr=${wrPage}`, lid, result.link);
    
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

      {/* Results */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-muted-foreground text-sm mb-6">
            Web Results - Page {wrPage}
          </p>

          <div className="space-y-1">
            {results.map((result, index) => (
              <div
                key={result.id}
                className="result-item animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start gap-4">
                  {/* Logo */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                    {result.logo_url ? (
                      <>
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
                              span.className = 'text-lg font-bold text-primary';
                              span.textContent = getInitial(result.name);
                              parent.appendChild(span);
                            }
                          }}
                        />
                      </>
                    ) : (
                      <span className="text-lg font-bold text-primary">
                        {getInitial(result.name)}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-muted-foreground text-sm truncate">
                        {result.name}
                      </span>
                      {result.is_sponsored && (
                        <span className="badge-warning text-[10px]">Sponsored</span>
                      )}
                    </div>
                    <h3 
                      className="text-primary hover:underline cursor-pointer font-medium text-lg mb-1"
                      onClick={() => handleResultClick(result, index)}
                    >
                      {result.title}
                    </h3>
                    {result.description && (
                      <p className="text-muted-foreground text-sm line-clamp-2">
                        {result.description}
                      </p>
                    )}
                  </div>
                </div>
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
