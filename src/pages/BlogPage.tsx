import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { trackClick } from "@/lib/tracking";
import { generateRandomToken } from "@/lib/linkGenerator";

const BlogPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: blog, isLoading, error } = useQuery({
    queryKey: ["blog", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
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
    trackClick('related_search', search.id, search.title, `/blog/${slug}`);
    // Pass blog context via state so we can return to this blog
    navigate(`/wr/${search.target_wr}/${generateRandomToken(8)}`, {
      state: {
        fromBlog: true,
        blogSlug: slug,
        blogId: blog?.id
      }
    });
  };

  const splitContentAtWordCount = (content: string, wordCount: number) => {
    const words = content.split(/\s+/);
    // Limit total words to exactly the selected word count
    const limitedWords = words.slice(0, wordCount);
    // Split limited content into 30% and 70%
    const thirtyPercent = Math.ceil(limitedWords.length * 0.3);
    const firstPart = limitedWords.slice(0, thirtyPercent).join(' ');
    const secondPart = limitedWords.slice(thirtyPercent).join(' ');
    return { firstPart, secondPart };
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

  const { firstPart, secondPart } = blog.content && blog.total_words 
    ? splitContentAtWordCount(blog.content, blog.total_words) 
    : { firstPart: '', secondPart: '' };

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
          <h1 className="text-xl font-display font-bold text-primary">Astepstair</h1>
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

          {/* Content - First 30% */}
          {firstPart && (
            <div 
              className="prose prose-lg max-w-none
                prose-headings:text-foreground prose-headings:font-display
                prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4
                prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3
                prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-4
                prose-a:text-primary prose-a:hover:underline
                prose-strong:text-foreground prose-strong:font-semibold
                prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4
                prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-4
                prose-li:text-foreground/90 prose-li:mb-2"
              dangerouslySetInnerHTML={{ __html: firstPart }}
            />
          )}

          {/* Related Searches - Middle */}
          {relatedSearches && relatedSearches.length > 0 && (
            <div className="my-12 py-8 border-y border-border/50">
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

          {/* Content - Remaining 70% */}
          {secondPart && (
            <div 
              className="prose prose-lg max-w-none
                prose-headings:text-foreground prose-headings:font-display
                prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4
                prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3
                prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-4
                prose-a:text-primary prose-a:hover:underline
                prose-strong:text-foreground prose-strong:font-semibold
                prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4
                prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-4
                prose-li:text-foreground/90 prose-li:mb-2"
              dangerouslySetInnerHTML={{ __html: secondPart }}
            />
          )}
        </article>
      </div>
    </div>
  );
};

export default BlogPage;
