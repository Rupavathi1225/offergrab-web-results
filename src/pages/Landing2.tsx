import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Blog {
  id: string;
  title: string;
  slug: string;
}

const Landing2 = () => {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    const fetchTopBlogs = async () => {
      try {
        const { data, error } = await supabase
          .from("blogs")
          .select("id, title, slug")
          .eq("status", "published")
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(2);

        if (error) throw error;
        setBlogs(data || []);
      } catch (error) {
        console.error("Error fetching blogs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopBlogs();
  }, []);

  useEffect(() => {
    if (loading || clicked || blogs.length === 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-redirect to first blog
          if (blogs[0]) {
            navigate(`/blog/${blogs[0].slug}`);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, clicked, blogs, navigate]);

  const handleSearchClick = (blog: Blog) => {
    setClicked(true);
    navigate(`/blog/${blog.slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (blogs.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No content available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Related Searches</h1>
        </div>

        {/* Related Searches */}
        <div className="space-y-3">
          {blogs.map((blog, index) => (
            <button
              key={blog.id}
              onClick={() => handleSearchClick(blog)}
              className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:bg-accent hover:border-primary/50 transition-all duration-200 text-left group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-medium truncate">{blog.title}</p>
                <p className="text-xs text-muted-foreground">
                  {index === 0 ? "Top Result" : "Related"}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${(countdown / 5) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default Landing2;
