import { useEffect } from "react";
import { useThemeSettings } from "@/contexts/ThemeContext";
import BlogPage from "./BlogPage";
import WhiteBlogPage from "./WhiteBlogPage";
import { Loader2 } from "lucide-react";

const UniversalBlogPage = () => {
  const { activeTheme, isLoading } = useThemeSettings();

  // Force *blog pages* to always use the Black theme, regardless of global site theme.
  // Restore the previous theme when leaving the blog page.
  useEffect(() => {
    const root = document.documentElement;
    const prev = {
      hadLight: root.classList.contains("light-theme"),
      hadDark: root.classList.contains("dark-theme"),
    };

    const enforceDark = () => {
      root.classList.add("dark-theme");
      root.classList.remove("light-theme");
    };

    enforceDark();

    const observer = new MutationObserver(() => {
      if (root.classList.contains("light-theme")) enforceDark();
    });

    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();

      if (prev.hadLight) root.classList.add("light-theme");
      else root.classList.remove("light-theme");

      if (prev.hadDark) root.classList.add("dark-theme");
      else root.classList.remove("dark-theme");
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return activeTheme === "white" ? <WhiteBlogPage /> : <BlogPage />;
};

export default UniversalBlogPage;
