import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useThemeSettings } from "@/contexts/ThemeContext";

const tabs = [
  { label: 'Landing Content', path: '/adm/landing' },
  { label: 'Search Buttons', path: '/adm/searches' },
  { label: 'Web Results', path: '/adm/results' },
  { label: 'Pre-Landings', path: '/adm/prelandings' },
  { label: 'Blogs', path: '/adm/blogs' },
  { label: 'Analytics', path: '/adm/analytics' },
  { label: 'Bulk Editor', path: '/adm/bulk-web-result-editor' },
  { label: 'Fallback URLs', path: '/adm/fallback-urls' },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { activeTheme, isLoading: themeIsLoading } = useThemeSettings();
  const [isTogglingTheme, setIsTogglingTheme] = useState(false);

  const getCurrentTab = () => {
    const currentTab = tabs.find(tab => location.pathname === tab.path);
    return currentTab?.path || '/adm/landing';
  };

  const applyThemeClass = (theme: "black" | "white") => {
    if (theme === "white") {
      document.documentElement.classList.add("light-theme");
      document.documentElement.classList.remove("dark-theme");
    } else {
      document.documentElement.classList.add("dark-theme");
      document.documentElement.classList.remove("light-theme");
    }
  };

  const handleToggleTheme = async () => {
    if (themeIsLoading || isTogglingTheme) return;

    const nextTheme: "black" | "white" = activeTheme === "white" ? "black" : "white";
    setIsTogglingTheme(true);
    try {
      const { data: row, error: rowErr } = await supabase
        .from("landing_content")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rowErr) throw rowErr;
      if (!row?.id) throw new Error("No landing_content row found.");

      const { error: updateErr } = await supabase
        .from("landing_content")
        .update({ active_theme: nextTheme })
        .eq("id", row.id);

      if (updateErr) throw updateErr;

      applyThemeClass(nextTheme);
      toast({
        title: "Theme updated",
        description: `Switched to ${nextTheme === "white" ? "White" : "Black"} theme.`,
      });
    } catch (e: any) {
      console.error("Theme toggle failed:", e);
      toast({
        title: "Could not change theme",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTogglingTheme(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-display font-bold text-foreground">Admin Panel</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleTheme}
                disabled={themeIsLoading || isTogglingTheme}
                title={activeTheme === "white" ? "Switch to Black theme" : "Switch to White theme"}
              >
                {activeTheme === "white" ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/landing', '_blank')}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View Site
              </Button>
              <Button variant="ghost" size="sm" className="gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={getCurrentTab()} className="w-full">
          <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto flex-wrap">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.path}
                value={tab.path}
                onClick={() => navigate(tab.path)}
                className="px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Page Content */}
        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
