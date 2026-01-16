import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { trackClick } from "@/lib/tracking";
import { generateRandomToken } from "@/lib/linkGenerator";

const BlogByNumber = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Blog number
  const blogNumber = parseInt(searchParams.get("p") || "1", 10);
  const token = searchParams.get("n");

  // Fetch blog
  const { data: blog, isLoading, error } = useQuery({
    queryKey: ["blog-by-number", blogNumber],
    queryFn: async () => {
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

  // Fetch related searches
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
    trackClick("related_search", search.id, search.title, `/p=${blogNumber}`);
    navigate(`/wr/${search.target_wr}/${generateRandomToken(8)}`, {
      state: {
        fromBlog: true,
        blogNumber,
        blogId: blog?.id,
      },
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
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Blog Not Found
          </h1>
          <p className="text-muted-foreground">
            The blog you're looking for doesn't exist or is not published.
          </p>
        </div>
      </div>
    );
  }

  // 🔹 Split content by paragraphs and find middle insertion point by word count
  const fullContent = blog.content || "";
  const paragraphs = fullContent.split("\n").filter((p) => p.trim());
  
  // Calculate total words and find where to insert related searches
  const allWords = fullContent.split(/\s+/).filter((w) => w.length > 0);
  const totalWords = allWords.length;
  const targetWordCount = Math.floor(totalWords / 2);
  
  // Find paragraph index where we reach the middle word count
  let currentWordCount = 0;
  let insertionIndex = Math.floor(paragraphs.length / 2); // Default to middle paragraph
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraphWords = paragraphs[i].split(/\s+/).filter((w) => w.length > 0).length;
    currentWordCount += paragraphWords;
    if (currentWordCount >= targetWordCount) {
      insertionIndex = i;
      break;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 py-4">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/landing")}
            className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-xl font-display font-bold text-primary">
            Astepstair
          </h1>
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

          {/* Content + Middle Related Searches (by word count) */}
          <div className="prose prose-invert max-w-none">
            {paragraphs.map((paragraph, index) => (
              <div key={index}>
                <p className="text-foreground/90 mb-4 leading-relaxed">
                  {paragraph}
                </p>

                {/* Inject Related Searches at the middle word count position */}
                {index === insertionIndex &&
                  relatedSearches &&
                  relatedSearches.length > 0 && (
                    <div className="my-12 not-prose">
                      <div className="bg-card/90 border border-border/40 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider text-center">
                          Related Searches
                        </h3>

                        <div className="space-y-3">
                          {relatedSearches.map((search) => (
                            <div
                              key={search.id}
                              onClick={() => handleSearchClick(search)}
                              className="cursor-pointer bg-background border border-border/30 rounded-lg px-4 py-3 flex items-center justify-between hover:bg-primary/20 hover:border-primary/50 transition-all"
                            >
                              <span className="text-primary text-sm font-medium">
                                {search.title}
                              </span>
                              <span className="text-muted-foreground">→</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
};

export default BlogByNumber;
