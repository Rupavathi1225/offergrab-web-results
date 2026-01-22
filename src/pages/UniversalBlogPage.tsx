import { useThemeSettings } from "@/contexts/ThemeContext";
import BlogPage from "./BlogPage";
import WhiteBlogPage from "./WhiteBlogPage";
import { Loader2 } from "lucide-react";

const UniversalBlogPage = () => {
  const { activeTheme, isLoading } = useThemeSettings();

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
