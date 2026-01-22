import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  created_at: string;
  category: string | null;
}

const WhiteHomepage = () => {
  const navigate = useNavigate();

  const { data: blogs, isLoading } = useQuery({
    queryKey: ["published-blogs-white"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("id, title, slug, excerpt, featured_image_url, created_at, category")
        .eq("status", "published")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Blog[];
    },
  });

  const handleBlogClick = (slug: string) => {
    navigate(`/${slug}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Astepstair
          </h1>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 bg-secondary/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Discover Insights & Stories
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore our collection of articles covering the latest trends, insights, and expert advice.
          </p>
        </div>
      </section>

      {/* Blog Grid */}
      <main className="container mx-auto px-4 py-12">
        {blogs && blogs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <article
                key={blog.id}
                onClick={() => handleBlogClick(blog.slug)}
                className="group cursor-pointer bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
              >
                {/* Image */}
                <div className="aspect-video overflow-hidden bg-muted">
                  {blog.featured_image_url ? (
                    <img
                      src={blog.featured_image_url}
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <span className="text-4xl">📄</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  {blog.category && (
                    <span className="inline-block px-3 py-1 text-xs font-medium text-primary bg-primary/10 rounded-full mb-3">
                      {blog.category}
                    </span>
                  )}
                  <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {blog.title}
                  </h3>
                  {blog.excerpt && (
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {blog.excerpt}
                    </p>
                  )}
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2" />
                    <time dateTime={blog.created_at}>
                      {format(new Date(blog.created_at), "MMM d, yyyy")}
                    </time>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No articles available yet.</p>
          </div>
        )}
      </main>

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
  );
};

export default WhiteHomepage;
