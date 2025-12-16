import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { initSession, trackClick } from "@/lib/tracking";

interface LandingContent {
  site_name: string;
  headline: string;
  description: string;
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

  useEffect(() => {
    initSession();
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [contentRes, searchesRes] = await Promise.all([
        supabase.from('landing_content').select('*').limit(1).maybeSingle(),
        supabase
          .from('related_searches')
          .select('*')
          .eq('is_active', true)
          .order('serial_number', { ascending: true })
          .limit(4),
      ]);

      if (contentRes.data) setContent(contentRes.data);
      if (searchesRes.data) setSearches(searchesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchClick = (search: RelatedSearch) => {
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
