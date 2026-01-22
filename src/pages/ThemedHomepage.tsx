import { useThemeSettings } from "@/contexts/ThemeContext";
import Landing from "./Landing";
import WhiteHomepage from "./WhiteHomepage";
import { Loader2 } from "lucide-react";

const ThemedHomepage = () => {
  const { activeTheme, isLoading } = useThemeSettings();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return activeTheme === "white" ? <WhiteHomepage /> : <Landing />;
};

export default ThemedHomepage;
