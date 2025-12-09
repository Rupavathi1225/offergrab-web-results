import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, User, Tag } from "lucide-react";
import { format } from "date-fns";

const BlogPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: blog, isLoading, error } = useQuery({
    queryKey: ["blog", slug],
    queryFn: async () => {
      // Query by slug only - published and active blogs are accessible via direct URL
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

  // Fetch related searches for this blog
  const { data: relatedSearches } = useQuery({
    queryKey: ["related-searches", blog?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("related_searches")
        .select("*")
        .eq("is_active", true)
        .order("serial_number", { ascending: true })
        .limit(6);

      if (error) throw error;
      return data;
    },
    enabled: !!blog,
  });

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
          {/* Category Badge */}
          {blog.category && (
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">{blog.category}</span>
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-display">
            {blog.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm mb-8 pb-8 border-b border-border">
            {blog.author && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{blog.author}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(blog.created_at), "MMMM d, yyyy")}</span>
            </div>
          </div>

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
          <div className="max-w-3xl mx-auto mt-12 pt-8 border-t border-border">
            <h3 className="text-xl font-semibold text-foreground mb-4">Related Searches</h3>
            <div className="flex flex-wrap gap-2">
              {relatedSearches.map((search) => (
                <a
                  key={search.id}
                  href={`/webresult/${search.target_wr}`}
                  className="px-4 py-2 bg-muted rounded-full text-sm text-foreground hover:bg-muted/80 transition-colors"
                >
                  {search.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogPage;
