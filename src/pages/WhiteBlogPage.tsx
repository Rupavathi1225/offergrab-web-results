import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { trackClick } from "@/lib/tracking";
import { trackInboundClick } from "@/lib/pixelTracking";
import { generateRandomToken } from "@/lib/linkGenerator";
import UrgencyBox from "@/components/blog/UrgencyBox";

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
  urgency_enabled?: boolean;
  urgency_hours?: number;
  urgency_text?: string | null;
  urgency_action?: string | null;
}

interface RelatedSearch {
  id: string;
  title: string;
  target_wr: number;
  serial_number: number;
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
      return data as RelatedSearch[];
    },
    enabled: !!blog,
  });

  // Fetch web results count for each related search
  const { data: webResultsCounts } = useQuery({
    queryKey: ["web-results-counts", relatedSearches?.map(s => s.id)],
    queryFn: async () => {
      if (!relatedSearches) return {};
      
      const counts: Record<string, number> = {};
      for (const search of relatedSearches) {
        const { count } = await supabase
          .from("web_results")
          .select("*", { count: "exact", head: true })
          .eq("related_search_id", search.id)
          .eq("is_active", true);
        counts[search.id] = count || 0;
      }
      return counts;
    },
    enabled: !!relatedSearches && relatedSearches.length > 0,
  });

  // Fetch 2 other blogs for sidebar (excluding current)
  const { data: otherBlogs } = useQuery({
    queryKey: ["other-blogs", blog?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("id, title, slug, featured_image_url, created_at, category")
        .eq("status", "published")
        .eq("is_active", true)
        .neq("id", blog!.id)
        .order("created_at", { ascending: false })
        .limit(2);

      if (error) throw error;
      return data;
    },
    enabled: !!blog,
  });

  const handleSearchClick = (search: RelatedSearch) => {
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
    const tenPercent = Math.ceil(limitedWords.length * 0.10);
    const firstPart = limitedWords.slice(0, tenPercent).join(' ');
    const secondPart = limitedWords.slice(tenPercent).join(' ');
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

        {/* Main Content with Sidebar */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Sidebar - Author & Other Blogs */}
            <aside className="lg:col-span-3 order-2 lg:order-1">
              <div className="sticky top-8 space-y-6">
                {/* Author Info Card */}
                <div className="bg-muted/30 rounded-xl p-6 border border-border">
                  <div className="flex flex-col items-center text-center mb-4">
                    <img
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
                      alt={blog.author || "Editorial Team"}
                      className="w-20 h-20 rounded-full object-cover mb-3"
                    />
                    <p className="font-semibold text-foreground">{blog.author || "Editorial Team"}</p>
                    <p className="text-xs text-muted-foreground">Author</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <time dateTime={blog.created_at}>
                      {format(new Date(blog.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </time>
                  </div>
                </div>

                {/* Other Blogs */}
                {otherBlogs && otherBlogs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                      More Articles
                    </h3>
                    <div className="space-y-4">
                      {otherBlogs.map((otherBlog) => (
                        <a
                          key={otherBlog.id}
                          href={`/${otherBlog.slug}`}
                          className="block group"
                        >
                          <div className="bg-muted/20 rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors">
                            <img
                              src={otherBlog.featured_image_url || "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=200&fit=crop"}
                              alt={otherBlog.title}
                              className="w-full h-24 object-cover"
                            />
                            <div className="p-3">
                              {otherBlog.category && (
                                <span className="text-xs text-primary font-medium">{otherBlog.category}</span>
                              )}
                              <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 mt-1">
                                {otherBlog.title}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(otherBlog.created_at), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* Main Article Content */}
            <article className="lg:col-span-9 order-1 lg:order-2 relative">
              {/* Category */}
              {blog.category && (
                <span className="inline-block px-3 py-1 text-sm font-medium text-primary bg-primary/10 rounded-full mb-4">
                  {blog.category}
                </span>
              )}

              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6 pr-0 lg:pr-80">
                {blog.title}
              </h1>

              {/* Urgency Box - Fixed to top-right corner on large screens, inline on mobile */}
              {blog.urgency_enabled && (
                <div className="my-10 lg:my-0 lg:absolute lg:top-0 lg:right-0 lg:w-72">
                  <div className="sticky lg:static top-24">
                    <UrgencyBox
                      blogSlug={blog.slug}
                      urgencyHours={blog.urgency_hours || 3}
                      urgencyText={blog.urgency_text}
                      urgencyAction={blog.urgency_action}
                    />
                  </div>
                </div>
              )}

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
                    prose-headings:text-foreground
                    prose-h2:text-2xl prose-h2:!font-bold prose-h2:mt-8 prose-h2:mb-4
                    prose-h3:text-lg prose-h3:!font-bold prose-h3:mt-6 prose-h3:mb-3
                    prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-5 prose-p:text-base
                    prose-a:text-primary prose-a:hover:underline
                    prose-strong:text-foreground prose-strong:font-semibold
                    prose-ul:list-disc prose-ul:pl-6 prose-ul:my-5
                    prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-5
                    prose-li:text-foreground/90 prose-li:mb-2
                    prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: firstPart }}
                />
              )}

              {/* Related Searches - After 15% content */}
              {relatedSearches && relatedSearches.length > 0 && (
                <div className="my-12 py-10 border-y-2 border-border">
                  <h3 className="text-base font-semibold text-muted-foreground mb-6 text-center uppercase tracking-wider">
                    Related Searches
                  </h3>
                  <div className="max-w-2xl mx-auto space-y-4">
                    {relatedSearches.map((search) => (
                      <div
                        key={search.id}
                        onClick={() => handleSearchClick(search)}
                        className="group cursor-pointer border-2 border-border rounded-xl px-6 py-5 flex items-center justify-between hover:border-primary hover:bg-primary/10 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        <span className="text-primary font-semibold text-lg">{search.title}</span>
                        <span className="text-muted-foreground group-hover:text-primary transition-colors text-2xl font-bold">
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
                    prose-headings:text-foreground
                    prose-h2:text-2xl prose-h2:!font-bold prose-h2:mt-8 prose-h2:mb-4
                    prose-h3:text-lg prose-h3:!font-bold prose-h3:mt-6 prose-h3:mb-3
                    prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-5 prose-p:text-base
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
          </div>
        </div>

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