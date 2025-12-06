import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

interface Content {
  id: string;
  site_name: string;
  headline: string;
  description: string;
}

const LandingContent = () => {
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_content')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) setContent(data);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('landing_content')
        .update({
          site_name: content.site_name,
          headline: content.headline,
          description: content.description,
        })
        .eq('id', content.id);

      if (error) throw error;

      toast({
        title: "Saved!",
        description: "Landing content has been updated.",
      });
    } catch (error) {
      console.error('Error saving:', error);
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
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Landing Content</h1>
        <p className="text-muted-foreground">Edit your landing page content</p>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Headline</label>
          <Input
            value={content.headline}
            onChange={(e) => setContent({ ...content, headline: e.target.value })}
            className="admin-input"
            placeholder="Your main headline..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Description</label>
          <Textarea
            value={content.description}
            onChange={(e) => setContent({ ...content, description: e.target.value })}
            className="admin-input min-h-[100px]"
            placeholder="Describe your site..."
          />
        </div>

        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default LandingContent;
