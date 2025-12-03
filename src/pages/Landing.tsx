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
        supabase.from('related_searches').select('*').eq('is_active', true).order('serial_number', { ascending: true }),
      ]);

      if (contentRes.data) setContent(contentRes.data);
      if (searchesRes.data) setSearches(searchesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchClick = async (search: RelatedSearch) => {
    trackClick('related_search', search.id, search.title, '/landing');
    navigate(`/webresult?wr=${search.target_wr}`, { replace: false });
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
            {content?.headline || 'OfferGrab - Discover Amazing Deals & Offers'}
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl mb-12 leading-relaxed">
            {content?.description || 'Find the best deals and offers.'}
          </p>
        </div>

        {/* Related Categories */}
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-muted-foreground text-sm uppercase tracking-wider mb-6">
            Related Categories
          </p>
          
          <div className="space-y-3">
            {searches.map((search, index) => (
              <div
                key={search.id}
                onClick={() => handleSearchClick(search)}
                className="search-box flex items-center justify-between group animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className="text-foreground font-medium">{search.title}</span>
                <span className="text-muted-foreground group-hover:text-primary transition-colors">
                  →
                </span>
              </div>
            ))}
          </div>
        </div>
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
