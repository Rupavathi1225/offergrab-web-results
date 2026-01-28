import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Link, ExternalLink } from "lucide-react";

interface Sitelink {
  id?: string;
  web_result_id: string;
  title: string;
  url: string;
  position: number;
  is_active: boolean;
}

interface SitelinksEditorProps {
  webResultId: string;
  webResultTitle: string;
  onClose: () => void;
}

const SitelinksEditor = ({ webResultId, webResultTitle, onClose }: SitelinksEditorProps) => {
  const [sitelinks, setSitelinks] = useState<Sitelink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Predefined action-based sitelink suggestions
  const sitelinkSuggestions = [
    { title: "Apply Now", url: "" },
    { title: "Get Quote", url: "" },
    { title: "Contact Us", url: "" },
    { title: "Learn More", url: "" },
    { title: "Shop Deals", url: "" },
    { title: "Book Today", url: "" },
    { title: "Sign Up", url: "" },
    { title: "View Plans", url: "" },
  ];

  useEffect(() => {
    fetchSitelinks();
  }, [webResultId]);

  const fetchSitelinks = async () => {
    try {
      const { data, error } = await supabase
        .from("sitelinks")
        .select("*")
        .eq("web_result_id", webResultId)
        .order("position", { ascending: true });

      if (error) throw error;

      // Initialize with existing sitelinks or empty slots
      const existingSitelinks = data || [];
      const filledSitelinks: Sitelink[] = [];

      for (let i = 1; i <= 4; i++) {
        const existing = existingSitelinks.find((s) => s.position === i);
        if (existing) {
          filledSitelinks.push(existing);
        } else {
          filledSitelinks.push({
            web_result_id: webResultId,
            title: "",
            url: "",
            position: i,
            is_active: true,
          });
        }
      }

      setSitelinks(filledSitelinks);
    } catch (error) {
      console.error("Error fetching sitelinks:", error);
      toast({ title: "Error", description: "Failed to load sitelinks", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateSitelink = (index: number, field: keyof Sitelink, value: string | boolean) => {
    setSitelinks((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const applySuggestion = (index: number, suggestion: { title: string; url: string }) => {
    setSitelinks((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, title: suggestion.title } : s
      )
    );
  };

  const clearSitelink = (index: number) => {
    setSitelinks((prev) =>
      prev.map((s, i) =>
        i === index
          ? { ...s, title: "", url: "", id: undefined }
          : s
      )
    );
  };

  const saveSitelinks = async () => {
    setSaving(true);
    try {
      // Delete all existing sitelinks for this web result
      await supabase.from("sitelinks").delete().eq("web_result_id", webResultId);

      // Insert only non-empty sitelinks
      const toInsert = sitelinks.filter((s) => s.title.trim() && s.url.trim());

      if (toInsert.length > 0) {
        const { error } = await supabase.from("sitelinks").insert(
          toInsert.map((s) => ({
            web_result_id: s.web_result_id,
            title: s.title.trim(),
            url: s.url.trim(),
            position: s.position,
            is_active: s.is_active,
          }))
        );

        if (error) throw error;
      }

      toast({ title: "Saved!", description: `${toInsert.length} sitelinks saved successfully.` });
      onClose();
    } catch (error) {
      console.error("Error saving sitelinks:", error);
      toast({ title: "Error", description: "Failed to save sitelinks", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-muted-foreground">Loading sitelinks...</div>
      </div>
    );
  }

  const filledCount = sitelinks.filter((s) => s.title.trim() && s.url.trim()).length;

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold">Sitelinks for Sponsored Ad</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Add up to 4 sitelinks that appear below the sponsored ad. Each sitelink is an independent clickable URL.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          <strong>Web Result:</strong> {webResultTitle}
        </p>
      </div>

      {/* Quick suggestions */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">Quick Suggestions (click to apply title)</Label>
        <div className="flex flex-wrap gap-2">
          {sitelinkSuggestions.map((suggestion, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                // Apply to first empty sitelink
                const emptyIndex = sitelinks.findIndex((s) => !s.title.trim());
                if (emptyIndex !== -1) {
                  applySuggestion(emptyIndex, suggestion);
                }
              }}
            >
              {suggestion.title}
            </Button>
          ))}
        </div>
      </div>

      {/* Sitelinks form */}
      <div className="space-y-4">
        {sitelinks.map((sitelink, index) => (
          <div
            key={index}
            className="border rounded-lg p-4 space-y-3 bg-secondary/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </span>
                <Label className="font-medium">Sitelink {index + 1}</Label>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Active</Label>
                  <Switch
                    checked={sitelink.is_active}
                    onCheckedChange={(val) => updateSitelink(index, "is_active", val)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearSitelink(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Title (e.g., Apply Now)</Label>
                <Input
                  placeholder="Enter sitelink title"
                  value={sitelink.title}
                  onChange={(e) => updateSitelink(index, "title", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">URL (independent destination)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="https://example.com/page"
                    value={sitelink.url}
                    onChange={(e) => updateSitelink(index, "url", e.target.value)}
                  />
                  {sitelink.url && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(sitelink.url, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status and actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          {filledCount}/4 sitelinks configured
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveSitelinks} disabled={saving}>
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Sitelinks
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SitelinksEditor;
