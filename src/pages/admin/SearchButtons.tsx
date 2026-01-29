import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, GripVertical, Pencil, X, Search, FileSpreadsheet } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import BulkActionToolbar from "@/components/admin/BulkActionToolbar";
import { generateRandomToken } from "@/lib/linkGenerator";
import { convertToCSV, downloadCSV } from "@/lib/csvExport";
import BulkSearchTitleEditor from "@/components/admin/BulkSearchTitleEditor";
import { BlogMultiSelectPopover, BlogMultiSelectItem } from "@/components/admin/BlogMultiSelectPopover";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Check } from "lucide-react";

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
  const [showBulkEditor, setShowBulkEditor] = useState(false);
  
  // Multi-select filters
  const [filterBlogIds, setFilterBlogIds] = useState<string[]>([]);
  const [filterSearchIds, setFilterSearchIds] = useState<string[]>([]);
  const [blogFilterOpen, setBlogFilterOpen] = useState(false);
  const [searchFilterOpen, setSearchFilterOpen] = useState(false);

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
    // Tab-separated format: Title \t Link (for spreadsheet pasting)
    const header = "Title\tLink";
    const rows = selected.map(b => `${b.title}\t${window.location.origin}/wr/${b.target_wr}/${generateRandomToken(8)}`);
    const text = [header, ...rows].join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${selected.length} related searches (title + link) copied to clipboard.` });
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

  // Get related searches filtered by selected blogs for the search filter dropdown
  const availableSearchesForFilter = useMemo(() => {
    if (filterBlogIds.length === 0) {
      // If no blogs selected, show all related searches
      return buttons;
    }
    // Only show related searches that belong to the selected blogs
    return buttons.filter(b => b.blog_id && filterBlogIds.includes(b.blog_id));
  }, [buttons, filterBlogIds]);

  // Filter buttons based on search query and selected filters
  const filteredButtons = useMemo(() => {
    return buttons.filter(b => {
      // Blog filter
      if (filterBlogIds.length > 0 && (!b.blog_id || !filterBlogIds.includes(b.blog_id))) {
        return false;
      }
      
      // Related search filter
      if (filterSearchIds.length > 0 && !filterSearchIds.includes(b.id)) {
        return false;
      }
      
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const blogTitle = getBlogTitle(b.blog_id).toLowerCase();
        if (!b.title.toLowerCase().includes(query) && !blogTitle.includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }, [buttons, filterBlogIds, filterSearchIds, searchQuery, blogs]);

  const toggleFilterBlog = (blogId: string) => {
    setFilterBlogIds(prev => {
      const newIds = prev.includes(blogId)
        ? prev.filter(id => id !== blogId)
        : [...prev, blogId];
      
      // When blogs change, reset search filter to only include valid searches
      if (filterSearchIds.length > 0) {
        const validSearchIds = buttons
          .filter(b => newIds.length === 0 || (b.blog_id && newIds.includes(b.blog_id)))
          .map(b => b.id);
        setFilterSearchIds(prev => prev.filter(id => validSearchIds.includes(id)));
      }
      
      return newIds;
    });
  };

  const toggleFilterSearch = (searchId: string) => {
    setFilterSearchIds(prev => 
      prev.includes(searchId)
        ? prev.filter(id => id !== searchId)
        : [...prev, searchId]
    );
  };

  const clearBlogFilter = () => {
    setFilterBlogIds([]);
    setFilterSearchIds([]);
  };

  const clearSearchFilter = () => {
    setFilterSearchIds([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  // Show bulk editor if toggled
  if (showBulkEditor) {
    return (
      <BulkSearchTitleEditor
        onClose={() => setShowBulkEditor(false)}
        onSuccess={() => {
          fetchButtons();
          setShowBulkEditor(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Search Buttons</h1>
          <p className="text-muted-foreground">Manage related search buttons on landing page</p>
        </div>
        <Button onClick={() => setShowBulkEditor(true)} variant="outline" className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Bulk Title Editor
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Text Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or blog name..."
            className="pl-10"
          />
        </div>

        {/* Blog Multi-Select Filter */}
        <BlogMultiSelectPopover
          open={blogFilterOpen}
          onOpenChange={setBlogFilterOpen}
          blogs={blogs.map(b => ({ id: b.id, title: b.title }))}
          selectedBlogIds={filterBlogIds}
          onToggleBlog={toggleFilterBlog}
          onClear={clearBlogFilter}
          triggerClassName="min-w-[160px] justify-between"
          contentClassName="w-[280px] p-0"
        />

        {/* Related Search Multi-Select Filter */}
        <Popover open={searchFilterOpen} onOpenChange={setSearchFilterOpen} modal={false}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="min-w-[180px] justify-between"
              aria-expanded={searchFilterOpen}
              data-search-filter-trigger
            >
              <span className="truncate">
                {filterSearchIds.length === 0
                  ? "All Related Searches"
                  : `${filterSearchIds.length} search${filterSearchIds.length === 1 ? "" : "es"} selected`}
              </span>
              <ChevronDown className={`h-4 w-4 opacity-60 transition-transform ${searchFilterOpen ? "rotate-180" : ""}`} />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[320px] p-0"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest("[data-search-filter-trigger]")) e.preventDefault();
            }}
          >
            <div className="max-h-[300px] overflow-y-auto p-1">
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  clearSearchFilter();
                  setSearchFilterOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    clearSearchFilter();
                    setSearchFilterOpen(false);
                  }
                }}
                className="flex items-center justify-between px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
              >
                <span>All Related Searches</span>
                {filterSearchIds.length === 0 ? <Check className="h-4 w-4" /> : null}
              </div>

              {availableSearchesForFilter.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                  {filterBlogIds.length > 0 ? "No related searches for selected blogs" : "No related searches available"}
                </div>
              ) : (
                availableSearchesForFilter.map((search) => {
                  const checked = filterSearchIds.includes(search.id);
                  const blogTitle = getBlogTitle(search.blog_id);
                  return (
                    <div
                      key={search.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleFilterSearch(search.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleFilterSearch(search.id);
                        }
                      }}
                      className="flex items-center justify-between px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                    >
                      <div className="flex flex-col min-w-0 flex-1 pr-2">
                        <span className="truncate text-sm">{search.title}</span>
                        <span className="truncate text-xs text-muted-foreground">{blogTitle}</span>
                      </div>
                      <Checkbox checked={checked} className="pointer-events-none shrink-0" />
                    </div>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear All Filters */}
        {(filterBlogIds.length > 0 || filterSearchIds.length > 0 || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterBlogIds([]);
              setFilterSearchIds([]);
              setSearchQuery("");
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear filters
          </Button>
        )}
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
