import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, GripVertical, Pencil, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface SearchButton {
  id: string;
  title: string;
  serial_number: number;
  target_wr: number;
  is_active: boolean;
}

const SearchButtons = () => {
  const [buttons, setButtons] = useState<SearchButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [newButton, setNewButton] = useState({ title: '', serial_number: 1, target_wr: 1 });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchButtons();
  }, []);

  const fetchButtons = async () => {
    try {
      const { data, error } = await supabase
        .from('related_searches')
        .select('*')
        .order('serial_number', { ascending: true });

      if (error) throw error;
      if (data) setButtons(data);
    } catch (error) {
      console.error('Error fetching buttons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newButton.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from('related_searches')
        .insert({
          title: newButton.title,
          serial_number: newButton.serial_number,
          target_wr: newButton.target_wr,
        });

      if (error) throw error;

      setNewButton({ title: '', serial_number: buttons.length + 1, target_wr: 1 });
      fetchButtons();
      toast({ title: "Added!", description: "Search button has been added." });
    } catch (error) {
      console.error('Error adding:', error);
      toast({ title: "Error", description: "Failed to add button.", variant: "destructive" });
    }
  };

  const handleUpdate = async (button: SearchButton) => {
    try {
      const { error } = await supabase
        .from('related_searches')
        .update({
          title: button.title,
          serial_number: button.serial_number,
          target_wr: button.target_wr,
          is_active: button.is_active,
        })
        .eq('id', button.id);

      if (error) throw error;

      setEditingId(null);
      toast({ title: "Saved!", description: "Button updated." });
    } catch (error) {
      console.error('Error updating:', error);
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this button?')) return;

    try {
      const { error } = await supabase
        .from('related_searches')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setButtons(buttons.filter(b => b.id !== id));
      toast({ title: "Deleted!", description: "Button removed." });
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    fetchButtons(); // Reset to original values
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
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Search Buttons</h1>
        <p className="text-muted-foreground">Manage related search buttons on landing page</p>
      </div>

      {/* Add New */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Add New Button</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-muted-foreground mb-1">Title</label>
            <Input
              value={newButton.title}
              onChange={(e) => setNewButton({ ...newButton, title: e.target.value })}
              className="admin-input"
              placeholder="e.g., Best Deals"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Serial #</label>
            <Input
              type="number"
              value={newButton.serial_number}
              onChange={(e) => setNewButton({ ...newButton, serial_number: parseInt(e.target.value) || 1 })}
              className="admin-input"
              min={1}
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Target WR</label>
            <Select 
              value={String(newButton.target_wr)} 
              onValueChange={(v) => setNewButton({ ...newButton, target_wr: parseInt(v) })}
            >
              <SelectTrigger className="admin-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map(n => (
                  <SelectItem key={n} value={String(n)}>wr={n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleAdd} className="mt-4">
          <Plus className="w-4 h-4 mr-2" /> Add Button
        </Button>
      </div>

      {/* Existing Buttons */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Existing Buttons</h3>
        <div className="space-y-4">
          {buttons.map((button) => {
            const isEditing = editingId === button.id;
            
            return (
              <div key={button.id} className="flex items-center gap-4 p-4 bg-secondary/30 rounded-lg">
                <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    {isEditing ? (
                      <Input
                        value={button.title}
                        onChange={(e) => setButtons(buttons.map(b => 
                          b.id === button.id ? { ...b, title: e.target.value } : b
                        ))}
                        className="admin-input"
                      />
                    ) : (
                      <div className="flex items-center h-10 px-3 text-foreground">
                        {button.title}
                      </div>
                    )}
                  </div>
                  <div>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={button.serial_number}
                        onChange={(e) => setButtons(buttons.map(b => 
                          b.id === button.id ? { ...b, serial_number: parseInt(e.target.value) || 1 } : b
                        ))}
                        className="admin-input"
                        min={1}
                      />
                    ) : (
                      <div className="flex items-center h-10 px-3 text-muted-foreground">
                        #{button.serial_number}
                      </div>
                    )}
                  </div>
                  <div>
                    {isEditing ? (
                      <Select 
                        value={String(button.target_wr)}
                        onValueChange={(v) => setButtons(buttons.map(b => 
                          b.id === button.id ? { ...b, target_wr: parseInt(v) } : b
                        ))}
                      >
                        <SelectTrigger className="admin-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map(n => (
                            <SelectItem key={n} value={String(n)}>wr={n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center h-10 px-3 text-muted-foreground">
                        wr={button.target_wr}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={button.is_active}
                    disabled={!isEditing}
                    onCheckedChange={(checked) => {
                      setButtons(buttons.map(b => 
                        b.id === button.id ? { ...b, is_active: checked } : b
                      ));
                    }}
                  />
                  <span className="text-xs text-muted-foreground w-12">
                    {button.is_active ? 'Active' : 'Hidden'}
                  </span>
                </div>

                {isEditing ? (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleUpdate(button)}>
                      <Save className="w-4 h-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
                      <X className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => setEditingId(button.id)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(button.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}

          {buttons.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No buttons yet. Add one above!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchButtons;
