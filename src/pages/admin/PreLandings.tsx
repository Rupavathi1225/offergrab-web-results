import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, Edit2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface Prelanding {
  id: string;
  web_result_id: string | null;
  logo_url: string | null;
  main_image_url: string | null;
  headline: string;
  description: string | null;
  email_placeholder: string;
  cta_button_text: string;
  background_color: string;
  background_image_url: string | null;
  is_active: boolean;
}

interface WebResult {
  id: string;
  name: string;
  title: string;
}

const PreLandings = () => {
  const [prelandings, setPrelandings] = useState<Prelanding[]>([]);
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPrelanding, setEditingPrelanding] = useState<Prelanding | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const emptyPrelanding: Omit<Prelanding, 'id'> = {
    web_result_id: null,
    logo_url: '',
    main_image_url: '',
    headline: '',
    description: '',
    email_placeholder: 'Enter your email',
    cta_button_text: 'Get Started',
    background_color: '#1a1a2e',
    background_image_url: '',
    is_active: false,
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prelandingsRes, resultsRes] = await Promise.all([
        supabase.from('prelandings').select('*').order('created_at', { ascending: false }),
        supabase.from('web_results').select('id, name, title').eq('is_active', true),
      ]);

      if (prelandingsRes.data) setPrelandings(prelandingsRes.data);
      if (resultsRes.data) setWebResults(resultsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingPrelanding) return;
    
    if (!editingPrelanding.headline.trim()) {
      toast({ title: "Error", description: "Headline is required", variant: "destructive" });
      return;
    }

    try {
      if (isNew) {
        const { id, ...data } = editingPrelanding;
        const { error } = await supabase.from('prelandings').insert(data);
        if (error) throw error;
        toast({ title: "Created!", description: "Pre-landing page created." });
      } else {
        const { error } = await supabase
          .from('prelandings')
          .update({
            web_result_id: editingPrelanding.web_result_id,
            logo_url: editingPrelanding.logo_url,
            main_image_url: editingPrelanding.main_image_url,
            headline: editingPrelanding.headline,
            description: editingPrelanding.description,
            email_placeholder: editingPrelanding.email_placeholder,
            cta_button_text: editingPrelanding.cta_button_text,
            background_color: editingPrelanding.background_color,
            background_image_url: editingPrelanding.background_image_url,
            is_active: editingPrelanding.is_active,
          })
          .eq('id', editingPrelanding.id);
        if (error) throw error;
        toast({ title: "Saved!", description: "Pre-landing updated." });
      }

      setShowDialog(false);
      setEditingPrelanding(null);
      fetchData();
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this pre-landing?')) return;

    try {
      const { error } = await supabase.from('prelandings').delete().eq('id', id);
      if (error) throw error;

      setPrelandings(prelandings.filter(p => p.id !== id));
      toast({ title: "Deleted!", description: "Pre-landing removed." });
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const openNew = () => {
    setEditingPrelanding({ ...emptyPrelanding, id: '' } as Prelanding);
    setIsNew(true);
    setShowDialog(true);
  };

  const openEdit = (prelanding: Prelanding) => {
    setEditingPrelanding(prelanding);
    setIsNew(false);
    setShowDialog(true);
  };

  const getWebResultName = (id: string | null) => {
    if (!id) return 'Not linked';
    const result = webResults.find(r => r.id === id);
    return result?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Pre-Landing Pages</h1>
          <p className="text-muted-foreground">Create and manage pre-landing pages with email capture</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> New Pre-Landing
        </Button>
      </div>

      {/* Existing Prelandings */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Existing Pre-Landings ({prelandings.length})</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {prelandings.map((prelanding) => (
            <div 
              key={prelanding.id} 
              className="p-4 rounded-lg border border-border/50"
              style={{ backgroundColor: prelanding.background_color + '20' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-foreground truncate">{prelanding.headline}</h4>
                  <p className="text-xs text-muted-foreground">
                    Linked to: {getWebResultName(prelanding.web_result_id)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {prelanding.is_active ? (
                    <span className="badge-success">Active</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Inactive</span>
                  )}
                </div>
              </div>
              
              {prelanding.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {prelanding.description}
                </p>
              )}

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(prelanding)}>
                  <Edit2 className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`/prelanding/${prelanding.id}`, '_blank')}
                >
                  <Eye className="w-3 h-3 mr-1" /> Preview
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(prelanding.id)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {prelandings.length === 0 && (
            <p className="text-center text-muted-foreground py-8 col-span-full">
              No pre-landings yet. Create one above!
            </p>
          )}
        </div>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Create Pre-Landing' : 'Edit Pre-Landing'}</DialogTitle>
          </DialogHeader>
          
          {editingPrelanding && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Select Web Result</label>
                <Select 
                  value={editingPrelanding.web_result_id || 'none'} 
                  onValueChange={(v) => setEditingPrelanding({ 
                    ...editingPrelanding, 
                    web_result_id: v === 'none' ? null : v 
                  })}
                >
                  <SelectTrigger className="admin-input">
                    <SelectValue placeholder="Select a web result..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {webResults.map(result => (
                      <SelectItem key={result.id} value={result.id}>
                        {result.name} - {result.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Logo URL</label>
                  <Input
                    value={editingPrelanding.logo_url || ''}
                    onChange={(e) => setEditingPrelanding({ ...editingPrelanding, logo_url: e.target.value })}
                    className="admin-input"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Main Image URL</label>
                  <Input
                    value={editingPrelanding.main_image_url || ''}
                    onChange={(e) => setEditingPrelanding({ ...editingPrelanding, main_image_url: e.target.value })}
                    className="admin-input"
                    placeholder="https://example.com/main-image.jpg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">Headline *</label>
                <Input
                  value={editingPrelanding.headline}
                  onChange={(e) => setEditingPrelanding({ ...editingPrelanding, headline: e.target.value })}
                  className="admin-input"
                  placeholder="Get Exclusive Access!"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">Description</label>
                <Textarea
                  value={editingPrelanding.description || ''}
                  onChange={(e) => setEditingPrelanding({ ...editingPrelanding, description: e.target.value })}
                  className="admin-input"
                  placeholder="Describe what users will get..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Email Placeholder</label>
                  <Input
                    value={editingPrelanding.email_placeholder}
                    onChange={(e) => setEditingPrelanding({ ...editingPrelanding, email_placeholder: e.target.value })}
                    className="admin-input"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">CTA Button Text</label>
                  <Input
                    value={editingPrelanding.cta_button_text}
                    onChange={(e) => setEditingPrelanding({ ...editingPrelanding, cta_button_text: e.target.value })}
                    className="admin-input"
                    placeholder="Get Started"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Background Color</label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={editingPrelanding.background_color}
                      onChange={(e) => setEditingPrelanding({ ...editingPrelanding, background_color: e.target.value })}
                      className="w-12 h-10 p-1 rounded"
                    />
                    <Input
                      value={editingPrelanding.background_color}
                      onChange={(e) => setEditingPrelanding({ ...editingPrelanding, background_color: e.target.value })}
                      className="admin-input flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Background Image URL (optional)</label>
                  <Input
                    value={editingPrelanding.background_image_url || ''}
                    onChange={(e) => setEditingPrelanding({ ...editingPrelanding, background_image_url: e.target.value })}
                    className="admin-input"
                    placeholder="https://example.com/background.jpg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={editingPrelanding.is_active}
                  onCheckedChange={(checked) => setEditingPrelanding({ ...editingPrelanding, is_active: checked })}
                />
                <label className="text-sm">Active (when active, users will see this before reaching the link)</label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" /> {isNew ? 'Create' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PreLandings;
