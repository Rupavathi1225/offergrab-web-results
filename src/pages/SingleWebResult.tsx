import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { initSession, trackClick } from "@/lib/tracking";
import { getUserCountryCode, isCountryAllowed } from "@/lib/countryAccess";

interface WebResultItem {
  id: string;
  name: string;
  title: string;
  description: string | null;
  link: string;
  logo_url: string | null;
  is_sponsored: boolean;
  serial_number: number;
  wr_page: number;
  allowed_countries: string[] | null;
  fallback_link: string | null;
}

interface LandingContent {
  site_name: string;
}

interface Prelanding {
  id: string;
  is_active: boolean;
}

const SingleWebResult = () => {
  const { wrId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [result, setResult] = useState<WebResultItem | null>(null);
  const [content, setContent] = useState<LandingContent | null>(null);
  const [prelanding, setPrelanding] = useState<Prelanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userCountryCode, setUserCountryCode] = useState<string>('XX');

  useEffect(() => {
    initSession();
    fetchData();
    getUserCountryCode().then(code => setUserCountryCode(code));
  }, [wrId]);

  const fetchData = async () => {
    if (!wrId) {
      setError(true);
      setLoading(false);
      return;
    }

    try {
      // Fetch the specific web result by ID
      const [resultRes, contentRes, prelandingRes] = await Promise.all([
        supabase
          .from('web_results')
          .select('*')
          .eq('id', wrId)
          .eq('is_active', true)
          .maybeSingle(),
        supabase.from('landing_content').select('site_name').limit(1).maybeSingle(),
        supabase
          .from('prelandings')
          .select('id, is_active')
          .eq('web_result_id', wrId)
          .eq('is_active', true)
          .maybeSingle(),
      ]);

      if (resultRes.data) {
        setResult(resultRes.data);
        document.title = resultRes.data.title;
      } else {
        setError(true);
      }
      
      if (contentRes.data) setContent(contentRes.data);
      if (prelandingRes.data) setPrelanding(prelandingRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVisitClick = async () => {
    if (!result) return;
    
    // Track click
    trackClick('web_result', result.id, result.title, `/r/${wrId}`, 1, result.link);
    
    // Check country access
    const allowed = isCountryAllowed(result.allowed_countries, userCountryCode);
    
    if (!allowed) {
      // User's country is not allowed - redirect to black page
      navigate('/go?id=' + result.id);
      return;
    }
    
    if (prelanding && prelanding.is_active) {
      navigate(`/prelanding/${prelanding.id}`, {
        state: { webResultLink: result.link }
      });
    } else {
      window.open(result.link, '_blank', 'noopener,noreferrer');
    }
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

  if (error || !result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Result Not Found</h1>
          <p className="text-muted-foreground mb-6">The result you're looking for doesn't exist or is no longer available.</p>
          <button 
            onClick={() => navigate('/landing')}
            className="text-primary hover:underline"
          >
            Return to Home
          </button>
        </div>
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
        </div>
      </header>

      {/* Single Result Display */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="glass-card p-6 rounded-xl animate-fade-in">
            {/* Logo and Name */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
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
                        span.className = 'text-lg font-bold text-primary';
                        span.textContent = getInitial(result.name);
                        parent.appendChild(span);
                      }
                    }}
                  />
                ) : (
                  <span className="text-lg font-bold text-primary">
                    {getInitial(result.name)}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{result.name}</h2>
                {result.is_sponsored && (
                  <span className="text-xs text-muted-foreground">Sponsored</span>
                )}
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl text-primary font-medium mb-3">
              {result.title}
            </h3>

            {/* Description */}
            {result.description && (
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {result.description}
              </p>
            )}

            {/* Visit Button */}
            <button
              onClick={handleVisitClick}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Visit Website
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SingleWebResult;
