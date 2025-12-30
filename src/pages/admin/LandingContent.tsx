import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Content {
  id: string;
  site_name: string;
  headline: string;
  description: string;
  redirect_enabled: boolean;
  redirect_delay_seconds: number;
}

const LandingContent = () => {
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRedirect, setSavingRedirect] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from("landing_content")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) setContent(data);
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoading(false);
    }
  };

  const persistRedirectEnabled = async (nextEnabled: boolean) => {
    if (!content) return;

    // Optimistic UI (so the switch changes instantly)
    const prev = content.redirect_enabled;
    setContent({ ...content, redirect_enabled: nextEnabled });

    setSavingRedirect(true);
    try {
      const { error } = await supabase
        .from("landing_content")
        .update({ redirect_enabled: nextEnabled })
        .eq("id", content.id);

      if (error) throw error;

      toast({
        title: "Redirect setting saved",
        description: nextEnabled ? "Auto-redirect is ON." : "Auto-redirect is OFF.",
      });
    } catch (error) {
      console.error("Error saving redirect_enabled:", error);

      // Revert if saving failed
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

