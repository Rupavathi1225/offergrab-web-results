import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Save, Palette } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Content {
  id: string;
  site_name: string;
  headline: string;
  description: string;
  redirect_enabled: boolean;
  redirect_delay_seconds: number;
  active_theme: "black" | "white";
  white_homepage_blogs: boolean;
}

const LandingContent = () => {
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRedirect, setSavingRedirect] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from("landing_content")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setContent({
          ...data,
          active_theme: (data.active_theme as "black" | "white") || "black",
        });
      }
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoading(false);
    }
  };

  const persistRedirectEnabled = async (nextEnabled: boolean) => {
    if (!content) return;

    const prev = content.redirect_enabled;
    setContent({ ...content, redirect_enabled: nextEnabled });

    setSavingRedirect(true);
    try {
      const { data, error } = await supabase
        .from("landing_content")
        .update({ redirect_enabled: nextEnabled })
        .eq("id", content.id)
        .select("redirect_enabled, updated_at")
        .single();

      if (error) throw error;

      setContent((c) =>
        c
          ? {
              ...c,
              redirect_enabled: data.redirect_enabled,
            }
          : c,
      );

      toast({
        title: "Redirect setting saved",
        description: data.redirect_enabled ? "Auto-redirect is ON." : "Auto-redirect is OFF.",
      });
    } catch (error) {
      console.error("Error saving redirect_enabled:", error);
      setContent((c) => (c ? { ...c, redirect_enabled: prev } : c));
      toast({
        title: "Error",
        description: "Couldn't save redirect setting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingRedirect(false);
    }
  };

  const persistTheme = async (theme: "black" | "white") => {
    if (!content) return;

    const prev = content.active_theme;
    setContent({ ...content, active_theme: theme });

    setSavingTheme(true);
    try {
      const { error } = await supabase
        .from("landing_content")
        .update({ active_theme: theme })
        .eq("id", content.id);

      if (error) throw error;

      toast({
        title: "Theme updated",
        description: `Active theme set to ${theme.charAt(0).toUpperCase() + theme.slice(1)}.`,
      });
    } catch (error) {
      console.error("Error saving theme:", error);
      setContent((c) => (c ? { ...c, active_theme: prev } : c));
      toast({
        title: "Error",
        description: "Couldn't save theme. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingTheme(false);
    }
  };

  const persistWhiteHomepageBlogs = async (enabled: boolean) => {
    if (!content) return;

    const prev = content.white_homepage_blogs;
    setContent({ ...content, white_homepage_blogs: enabled });

    try {
      const { error } = await supabase
        .from("landing_content")
        .update({ white_homepage_blogs: enabled })
        .eq("id", content.id);

      if (error) throw error;

      toast({
        title: "Setting saved",
        description: enabled
          ? "White theme homepage will show blog cards."
          : "White theme homepage will show default content.",
      });
    } catch (error) {
      console.error("Error saving white_homepage_blogs:", error);
      setContent((c) => (c ? { ...c, white_homepage_blogs: prev } : c));
      toast({
        title: "Error",
        description: "Couldn't save setting. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!content) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("landing_content")
        .update({
          site_name: content.site_name,
          headline: content.headline,
          description: content.description,
          redirect_enabled: content.redirect_enabled,
          redirect_delay_seconds: content.redirect_delay_seconds,
        })
        .eq("id", content.id);

      if (error) throw error;

      toast({
        title: "Saved!",
        description: "Landing content has been updated.",
      });
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Error",
        description: "Failed to save changes.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No content found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">
          Landing Content
        </h1>
        <p className="text-muted-foreground">Edit your landing page content</p>
      </div>

      {/* Global Website Settings - Theme Section */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Global Website Settings</h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="theme-select" className="text-foreground font-medium mb-2 block">
              Active Theme
            </Label>
            <Select
              value={content.active_theme}
              onValueChange={(value: "black" | "white") => persistTheme(value)}
              disabled={savingTheme}
            >
              <SelectTrigger id="theme-select" className="w-48">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="black">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-foreground border border-muted"></span>
                    Black (Dark)
                  </span>
                </SelectItem>
                <SelectItem value="white">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-background border border-border"></span>
                    White (Light)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              Switch between dark and light theme for the entire website.
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="white-blogs-toggle" className="text-foreground font-medium">
                Show Blogs on White Homepage
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, the white theme homepage displays blog cards
              </p>
            </div>
            <Switch
              id="white-blogs-toggle"
              checked={content.white_homepage_blogs}
              onCheckedChange={persistWhiteHomepageBlogs}
            />
          </div>
        </div>
      </div>

      {/* Content Settings */}
      <div className="glass-card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Headline
          </label>
          <Input
            value={content.headline}
            onChange={(e) => setContent({ ...content, headline: e.target.value })}
            className="admin-input"
            placeholder="Your main headline..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description
          </label>
          <Textarea
            value={content.description}
            onChange={(e) =>
              setContent({ ...content, description: e.target.value })
            }
            className="admin-input min-h-[100px]"
            placeholder="Describe your site..."
          />
        </div>

        <div className="border-t border-border pt-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Redirect Settings</h3>

          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="redirect-toggle" className="text-foreground font-medium">
                Enable Auto-Redirect
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, users will be redirected after the timer expires
              </p>
            </div>
            <Switch
              id="redirect-toggle"
              checked={content.redirect_enabled}
              disabled={savingRedirect}
              onCheckedChange={persistRedirectEnabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Redirect Delay (seconds)
            </label>
            <Input
              type="number"
              min={1}
              max={60}
              value={content.redirect_delay_seconds}
              onChange={(e) =>
                setContent({
                  ...content,
                  redirect_delay_seconds: parseInt(e.target.value) || 5,
                })
              }
              className="admin-input w-32"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default LandingContent;
