import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteTheme = "black" | "white";

interface ThemeSettings {
  activeTheme: SiteTheme;
  whiteHomepageBlogs: boolean;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeSettings>({
  activeTheme: "black",
  whiteHomepageBlogs: true,
  isLoading: true,
});

export const useThemeSettings = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [settings, setSettings] = useState<ThemeSettings>({
    activeTheme: "black",
    whiteHomepageBlogs: true,
    isLoading: true,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("landing_content")
          .select("active_theme, white_homepage_blogs")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          // Normalize theme value from DB (can come in as 'White', 'BLACK', etc.)
          const normalizedTheme: SiteTheme =
            (data.active_theme || "")
              .toString()
              .trim()
              .toLowerCase() === "white"
              ? "white"
              : "black";

          setSettings({
            activeTheme: normalizedTheme,
            whiteHomepageBlogs: data.white_homepage_blogs ?? true,
            isLoading: false,
          });

          // Apply theme class to document
          if (normalizedTheme === "white") {
            document.documentElement.classList.add("light-theme");
            document.documentElement.classList.remove("dark-theme");
          } else {
            document.documentElement.classList.add("dark-theme");
            document.documentElement.classList.remove("light-theme");
          }
        } else {
          setSettings((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error("Error fetching theme settings:", error);
        setSettings((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchSettings();
  }, []);

  return (
    <ThemeContext.Provider value={settings}>{children}</ThemeContext.Provider>
  );
};
