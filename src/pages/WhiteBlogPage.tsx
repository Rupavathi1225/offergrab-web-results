import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { trackClick } from "@/lib/tracking";
import { trackInboundClick } from "@/lib/pixelTracking";
import { generateRandomToken } from "@/lib/linkGenerator";

interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  featured_image_url: string | null;
  created_at: string;
  category: string | null;
  author: string | null;
  excerpt: string | null;
  total_words?: number;
}

const WhiteBlogPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: blog, isLoading, error } = useQuery({
    queryKey: ["blog-white", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as Blog;
    },
    enabled: !!slug,
  });

  // Fetch related searches for this specific blog only
  const { data: relatedSearches } = useQuery({
    queryKey: ["related-searches-white", blog?.id],
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
    trackClick('related_search', search.id, search.title, `/${slug}`);
    trackInboundClick(search.title, `/wr/${search.target_wr}`, search.id);
    navigate(`/wr/${search.target_wr}/${generateRandomToken(8)}`, {
      state: {
        fromBlog: true,
        blogSlug: slug,
        blogId: blog?.id
      }
    });
  };

  const splitContentAtWordCount = (content: string, wordCount: number): { firstPart: string; secondPart: string } => {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const limitedWords = words.slice(0, wordCount);
    const thirtyPercent = Math.ceil(limitedWords.length * 0.3);
    const firstPart = limitedWords.slice(0, thirtyPercent).join(' ');
    const secondPart = limitedWords.slice(thirtyPercent).join(' ');
    return { firstPart, secondPart };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Article Not Found</h1>
          <p className="text-muted-foreground mb-4">The article you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate("/")}
            className="text-primary hover:underline"
          >
            Go back home
          </button>
        </div>
      </div>
    );
  }

  const { firstPart, secondPart } = blog.content && blog.total_words 
    ? splitContentAtWordCount(blog.content, blog.total_words) 
    : { firstPart: blog.content || '', secondPart: '' };

  const canonicalUrl = `https://astepstair.com/${blog.slug}`;

  return (
    <>
      {/* SEO Meta Tags */}
      <title>{blog.title} | Astepstair</title>
      <link rel="canonical" href={canonicalUrl} />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border py-4">
          <div className="container mx-auto px-4 flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <a href="/" className="text-xl font-bold text-foreground">
              Astepstair
            </a>
          </div>
        </header>

        {/* Article */}
        <article className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Category */}
          {blog.category && (
            <span className="inline-block px-3 py-1 text-sm font-medium text-primary bg-primary/10 rounded-full mb-4">
              {blog.category}
            </span>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6">
            {blog.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm mb-8 pb-8 border-b border-border">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <time dateTime={blog.created_at}>
                {format(new Date(blog.created_at), "MMMM d, yyyy")}
              </time>
            </div>
            {blog.author && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{blog.author}</span>
              </div>
            )}
          </div>

          {/* Featured Image */}
          {blog.featured_image_url && (
            <div className="mb-10 rounded-xl overflow-hidden">
              <img
                src={blog.featured_image_url}
                alt={blog.title}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          {/* Content - First 30% */}
          {firstPart && (
            <div
              className="prose prose-lg max-w-none
                prose-headings:text-foreground prose-headings:font-bold
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-5
                prose-a:text-primary prose-a:hover:underline
                prose-strong:text-foreground prose-strong:font-semibold
                prose-ul:list-disc prose-ul:pl-6 prose-ul:my-5
                prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-5
                prose-li:text-foreground/90 prose-li:mb-2
                prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: firstPart }}
            />
          )}

          {/* Related Searches - After 30% content */}
          {relatedSearches && relatedSearches.length > 0 && (
            <div className="my-12 py-8 border-y border-border">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 text-center uppercase tracking-wider">
                Related Searches
              </h3>
              <div className="space-y-3">
                {relatedSearches.map((search, index) => (
                  <div
                    key={search.id}
                    onClick={() => handleSearchClick(search)}
                    className="group cursor-pointer bg-muted/50 border border-border rounded-lg px-4 py-3 flex items-center justify-between hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
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
                prose-headings:text-foreground prose-headings:font-bold
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-5
                prose-a:text-primary prose-a:hover:underline
                prose-strong:text-foreground prose-strong:font-semibold
                prose-ul:list-disc prose-ul:pl-6 prose-ul:my-5
                prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-5
                prose-li:text-foreground/90 prose-li:mb-2
                prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: secondPart }}
            />
          )}
        </article>

        {/* Footer */}
        <footer className="border-t border-border py-8 mt-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-muted-foreground text-sm">
                © {new Date().getFullYear()} Astepstair. All rights reserved.
              </p>
              <div className="flex gap-6">
                <a href="/privacy-policy" className="text-muted-foreground hover:text-foreground text-sm">
                  Privacy Policy
                </a>
                <a href="/about-us" className="text-muted-foreground hover:text-foreground text-sm">
                  About Us
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default WhiteBlogPage;
