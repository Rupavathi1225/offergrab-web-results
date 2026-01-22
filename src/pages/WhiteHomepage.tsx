import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search } from "lucide-react";
import { format } from "date-fns";

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  created_at: string;
  category: string | null;
  author: string | null;
}

const WhiteHomepage = () => {
  const navigate = useNavigate();

  const { data: blogs, isLoading } = useQuery({
    queryKey: ["published-blogs-white"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("id, title, slug, excerpt, featured_image_url, created_at, category, author")
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

  // Get unique categories from blogs
  const categories = blogs
    ? [...new Set(blogs.map((b) => b.category).filter(Boolean))]
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  // Split blogs for layout: first one is featured (center), rest go to sides
  const featuredBlog = blogs?.[0];
  const leftBlogs = blogs?.slice(1, 3) || [];
  const rightBlogs = blogs?.slice(3, 5) || [];
  const remainingBlogs = blogs?.slice(5) || [];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 py-4 sticky top-0 bg-white z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                <span className="text-amber-600">Astep</span>stair
              </h1>
              
              {/* Category Navigation */}
              <nav className="hidden md:flex items-center gap-6">
                {categories.slice(0, 6).map((cat) => (
                  <button
                    key={cat}
                    className="text-sm font-medium text-gray-600 hover:text-amber-600 transition-colors"
                  >
                    {cat}
                  </button>
                ))}
              </nav>
            </div>

            {/* Search */}
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
              <Search className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">Search</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {blogs && blogs.length > 0 ? (
          <>
            {/* Masonry Grid - Featured Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
              {/* Left Column */}
              <div className="space-y-6">
                {leftBlogs.map((blog) => (
                  <BlogCard
                    key={blog.id}
                    blog={blog}
                    onClick={() => handleBlogClick(blog.slug)}
                    variant="small"
                  />
                ))}
              </div>

              {/* Center - Featured Post */}
              <div className="lg:col-span-2">
                {featuredBlog && (
                  <BlogCard
                    blog={featuredBlog}
                    onClick={() => handleBlogClick(featuredBlog.slug)}
                    variant="featured"
                  />
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {rightBlogs.map((blog) => (
                  <BlogCard
                    key={blog.id}
                    blog={blog}
                    onClick={() => handleBlogClick(blog.slug)}
                    variant="small"
                  />
                ))}
              </div>
            </div>

            {/* Remaining Posts Grid */}
            {remainingBlogs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {remainingBlogs.map((blog) => (
                  <BlogCard
                    key={blog.id}
                    blog={blog}
                    onClick={() => handleBlogClick(blog.slug)}
                    variant="standard"
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No articles available yet.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 mt-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Astepstair. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="/privacy-policy" className="text-gray-500 hover:text-amber-600 text-sm transition-colors">
                Privacy Policy
              </a>
              <a href="/about-us" className="text-gray-500 hover:text-amber-600 text-sm transition-colors">
                About Us
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Blog Card Component
interface BlogCardProps {
  blog: Blog;
  onClick: () => void;
  variant: "featured" | "standard" | "small";
}

const BlogCard = ({ blog, onClick, variant }: BlogCardProps) => {
  const imageHeight = variant === "featured" ? "h-96" : variant === "small" ? "h-48" : "h-56";

  return (
    <article
      onClick={onClick}
      className="group cursor-pointer"
    >
      {/* Image */}
      <div className={`${imageHeight} rounded-lg overflow-hidden bg-gray-100 mb-4`}>
        {blog.featured_image_url ? (
          <img
            src={blog.featured_image_url}
            alt={blog.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100">
            <span className="text-5xl">📄</span>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 mb-2">
        {blog.category && (
          <span className="inline-block px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full">
            {blog.category}
          </span>
        )}
        <span className="text-xs text-gray-400">•</span>
        <time className="text-xs text-gray-500 uppercase tracking-wide">
          {format(new Date(blog.created_at), "MMM d, yyyy")}
        </time>
      </div>

      {/* Title */}
      <h3
        className={`font-bold text-gray-900 group-hover:text-amber-600 transition-colors leading-snug mb-2 ${
          variant === "featured" ? "text-2xl md:text-3xl" : variant === "small" ? "text-base" : "text-xl"
        }`}
      >
        {blog.title}
      </h3>

      {/* Excerpt - only for featured and standard */}
      {(variant === "featured" || variant === "standard") && blog.excerpt && (
        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
          {blog.excerpt}
        </p>
      )}

      {/* Author */}
      {blog.author && (
        <p className="text-sm text-gray-500">
          By <span className="text-gray-700 font-medium">{blog.author}</span>
        </p>
      )}
    </article>
  );
};

export default WhiteHomepage;
