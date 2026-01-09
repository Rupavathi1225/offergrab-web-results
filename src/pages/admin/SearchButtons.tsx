import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, GripVertical, Pencil, X, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import BulkActionToolbar from "@/components/admin/BulkActionToolbar";
import { generateRandomToken } from "@/lib/linkGenerator";
import { convertToCSV, downloadCSV } from "@/lib/csvExport";

interface Blog {
  id: string;
  title: string;
  slug: string;
}

interface SearchButton {
  id: string;
  title: string;
  serial_number: number;
  target_wr: number;
  is_active: boolean;
  blog_id: string | null;
}

const SearchButtons = () => {
  const [buttons, setButtons] = useState<SearchButton[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [newButton, setNewButton] = useState({ title: '', serial_number: 1, target_wr: 1, blog_id: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchButtons();
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('id, title, slug')
        .order('title', { ascending: true });

      if (error) throw error;
      if (data) setBlogs(data);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    }
  };

  const fetchButtons = async () => {
    try {
      const { data, error } = await supabase
        .from('related_searches')
        .select('*')
        .order('serial_number', { ascending: true });

      if (error) throw error;
      if (data) setButtons(data as SearchButton[]);
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

    if (!newButton.blog_id) {
      toast({ title: "Error", description: "Please select a blog", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from('related_searches')
        .insert({
          title: newButton.title,
          serial_number: newButton.serial_number,
          target_wr: newButton.target_wr,
          blog_id: newButton.blog_id,
        });

      if (error) throw error;

      setNewButton({ title: '', serial_number: buttons.length + 1, target_wr: 1, blog_id: '' });
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
          blog_id: button.blog_id,
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
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      toast({ title: "Deleted!", description: "Button removed." });
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    fetchButtons();
  };

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const selectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(buttons.map(b => b.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const getBlogTitle = (blogId: string | null) => {
    if (!blogId) return 'No Blog';
    const blog = blogs.find(b => b.id === blogId);
    return blog ? blog.title : 'Unknown';
  };

  const csvColumns = [
    { key: 'serial_number' as const, header: 'Serial #' },
    { key: 'title' as const, header: 'Title' },
    { key: 'target_wr' as const, header: 'Target WR' },
    { key: 'is_active' as const, header: 'Active' },
  ];

  const exportAll = () => {
    const csv = convertToCSV(buttons, csvColumns);
    downloadCSV(csv, 'search-buttons.csv');
    toast({ title: "Exported!", description: "All buttons exported to CSV." });
  };

  const exportSelected = () => {
    const selected = buttons.filter(b => selectedIds.has(b.id));
    const csv = convertToCSV(selected, csvColumns);
    downloadCSV(csv, 'search-buttons-selected.csv');
    toast({ title: "Exported!", description: `${selected.length} buttons exported to CSV.` });
  };

  const copySelected = () => {
    const selected = buttons.filter(b => selectedIds.has(b.id));
    const text = selected.map(b => `${window.location.origin}/wr/${b.target_wr}/${generateRandomToken(8)}`).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${selected.length} related search links copied to clipboard.` });
  };

  const bulkActivate = async () => {
    try {
      const { error } = await supabase
        .from('related_searches')
        .update({ is_active: true })
        .in('id', Array.from(selectedIds));
      if (error) throw error;
      fetchButtons();
      toast({ title: "Activated!", description: `${selectedIds.size} buttons activated.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to activate.", variant: "destructive" });
    }
  };

  const bulkDeactivate = async () => {
    try {
      const { error } = await supabase
        .from('related_searches')
        .update({ is_active: false })
        .in('id', Array.from(selectedIds));
      if (error) throw error;
      fetchButtons();
      toast({ title: "Deactivated!", description: `${selectedIds.size} buttons deactivated.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to deactivate.", variant: "destructive" });
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} selected buttons?`)) return;
    try {
      const { error } = await supabase
        .from('related_searches')
        .delete()
        .in('id', Array.from(selectedIds));
      if (error) throw error;
      setSelectedIds(new Set());
      fetchButtons();
      toast({ title: "Deleted!", description: `${selectedIds.size} buttons deleted.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  // Filter buttons based on search query
  const filteredButtons = buttons.filter(b => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const blogTitle = getBlogTitle(b.blog_id).toLowerCase();
    return (
      b.title.toLowerCase().includes(query) ||
      blogTitle.includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Search Buttons</h1>
        <p className="text-muted-foreground">Manage related search buttons on landing page</p>
      </div>

      {/* Search Box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title or blog name..."
          className="pl-10"
        />
      </div>

      {/* Add New */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Add New Button</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Blog *</label>
            <Select 
              value={newButton.blog_id} 
              onValueChange={(v) => setNewButton({ ...newButton, blog_id: v })}
            >
              <SelectTrigger className="admin-input">
                <SelectValue placeholder="Select blog" />
              </SelectTrigger>
              <SelectContent>
                {blogs.map(blog => (
                  <SelectItem key={blog.id} value={blog.id}>{blog.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        totalCount={filteredButtons.length}
        selectedCount={selectedIds.size}
        allSelected={selectedIds.size === filteredButtons.length && filteredButtons.length > 0}
        onSelectAll={selectAll}
        onExportAll={exportAll}
        onExportSelected={exportSelected}
        onCopy={copySelected}
        onActivate={bulkActivate}
        onDeactivate={bulkDeactivate}
        onDelete={bulkDelete}
      />

      {/* Existing Buttons */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Existing Buttons ({filteredButtons.length})</h3>
        <div className="space-y-4">
          {filteredButtons.map((button) => {
            const isEditing = editingId === button.id;
            
            return (
              <div key={button.id} className="flex items-center gap-4 p-4 bg-secondary/30 rounded-lg">
                <Checkbox
                  checked={selectedIds.has(button.id)}
                  onCheckedChange={() => toggleSelect(button.id)}
                />
                <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    {isEditing ? (
                      <Select 
                        value={button.blog_id || ''}
                        onValueChange={(v) => setButtons(buttons.map(b => 
                          b.id === button.id ? { ...b, blog_id: v } : b
                        ))}
                      >
                        <SelectTrigger className="admin-input">
                          <SelectValue placeholder="Select blog" />
                        </SelectTrigger>
                        <SelectContent>
                          {blogs.map(blog => (
                            <SelectItem key={blog.id} value={blog.id}>{blog.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center h-10 px-3 text-primary text-sm truncate" title={getBlogTitle(button.blog_id)}>
                        {getBlogTitle(button.blog_id)}
                      </div>
                    )}
                  </div>
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

          {filteredButtons.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {searchQuery ? "No buttons match your search." : "No buttons yet. Add one above!"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchButtons;
