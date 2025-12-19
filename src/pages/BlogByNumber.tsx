import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { trackClick } from "@/lib/tracking";

const BlogByNumber = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get the blog number from p parameter
  const blogNumber = parseInt(searchParams.get('p') || '1', 10);
  const token = searchParams.get('n'); // Random token for obfuscation

  const { data: blog, isLoading, error } = useQuery({
    queryKey: ["blog-by-number", blogNumber],
    queryFn: async () => {
      // Fetch blogs ordered by created_at and get the one at position blogNumber
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("status", "published")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .range(blogNumber - 1, blogNumber - 1);

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!blogNumber,
  });

  // Fetch related searches for this specific blog only
  const { data: relatedSearches } = useQuery({
    queryKey: ["related-searches", blog?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("related_searches")
        .select("*")
        .eq("blog_id", blog!.id)
        .eq("is_active", true)
        .order("serial_number", { ascending: true })
        .limit(4);

      if (error) throw error;
      return data;
    },
    enabled: !!blog,
  });

  const handleSearchClick = (search: any) => {
    trackClick('related_search', search.id, search.title, `/p=${blogNumber}`);
    navigate(`/webresult/${search.target_wr}`, { 
      state: { 
        fromBlog: true, 
        blogNumber: blogNumber,
        blogId: blog?.id 
      } 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Blog Not Found</h1>
          <p className="text-muted-foreground">The blog you're looking for doesn't exist or is not published.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 py-4">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <button 
            onClick={() => navigate('/landing')}
            className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-primary">OfferGrab</h1>
        </div>
      </header>

      {/* Featured Image */}
      {blog.featured_image_url && (
        <div className="w-full h-64 md:h-96 overflow-hidden">
          <img
            src={blog.featured_image_url}
            alt={blog.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <article className="max-w-3xl mx-auto">
          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8 font-display">
            {blog.title}
          </h1>

          {/* Content */}
          {blog.content && (
            <div className="prose prose-invert max-w-none">
              {blog.content.split('\n').map((paragraph, index) => (
                <p key={index} className="text-foreground/90 mb-4 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </article>

        {/* Related Searches */}
        {relatedSearches && relatedSearches.length > 0 && (
          <div className="max-w-xl mx-auto mt-12 pt-8 border-t border-border/50">
            <h3 className="text-sm font-medium text-muted-foreground mb-4 text-center uppercase tracking-wider">
              Related Searches
            </h3>
            <div className="space-y-3">
              {relatedSearches.map((search, index) => (
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
      </div>
    </div>
  );
};

export default BlogByNumber;
