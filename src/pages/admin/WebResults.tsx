import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, Edit2, X, Globe, Sparkles, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { countries } from "@/lib/countries";
import BulkActionToolbar from "@/components/admin/BulkActionToolbar";
import { convertToCSV, downloadCSV } from "@/lib/csvExport";

interface WebResult {
  id: string;
  name: string;
  title: string;
  description: string | null;
  link: string;
  logo_url: string | null;
  wr_page: number;
  is_sponsored: boolean;
  serial_number: number;
  allowed_countries: string[];
  fallback_link: string | null;
  is_active: boolean;
}

interface RelatedSearch {
  id: string;
  title: string;
  target_wr: number;
  blog_id: string | null;
}

interface GeneratedWebResult {
  name: string;
  title: string;
  description: string;
  link: string;
  isSelected: boolean;
  isSponsored: boolean;
}

const WebResults = () => {
  const [results, setResults] = useState<WebResult[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingResult, setEditingResult] = useState<WebResult | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedWr, setSelectedWr] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // AI Generator state
  const [selectedRelatedSearch, setSelectedRelatedSearch] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<GeneratedWebResult[]>([]);

  const emptyResult: Omit<WebResult, 'id'> = {
    name: '',
    title: '',
    description: '',
    link: '',
    logo_url: '',
    wr_page: 1,
    is_sponsored: false,
    serial_number: 1,
    allowed_countries: ['worldwide'],
    fallback_link: '',
    is_active: true,
  };

  const [newResult, setNewResult] = useState(emptyResult);

  useEffect(() => {
    fetchResults();
    fetchRelatedSearches();
  }, []);

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('web_results')
        .select('*')
        .order('wr_page', { ascending: true })
        .order('serial_number', { ascending: true });

      if (error) throw error;
      if (data) setResults(data);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedSearches = async () => {
    try {
      const { data, error } = await supabase
        .from('related_searches')
        .select('*')
        .eq('is_active', true)
        .order('target_wr', { ascending: true });

      if (error) throw error;
      if (data) setRelatedSearches(data);
    } catch (error) {
      console.error('Error fetching related searches:', error);
    }
  };

  const generateWebResults = async () => {
    if (!selectedRelatedSearch) {
      toast({ title: "Error", description: "Please select a related search first", variant: "destructive" });
      return;
    }

    const search = relatedSearches.find(s => s.id === selectedRelatedSearch);
    if (!search) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-web-results", {
        body: { relatedSearchTitle: search.title },
      });

      if (error) throw error;

      if (data.webResults && data.webResults.length > 0) {
        setGeneratedResults(data.webResults.map((r: any) => ({
          ...r,
          isSelected: false,
          isSponsored: false,
        })));
        toast({ title: "Success", description: "6 web results generated! Select up to 4." });
      } else {
        throw new Error(data.error || "Failed to generate web results");
      }
    } catch (error) {
      console.error("Error generating web results:", error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to generate web results", 
        variant: "destructive" 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleGeneratedResultSelection = (index: number) => {
    setGeneratedResults(prev => {
      const selected = prev.filter(r => r.isSelected).length;
      const result = prev[index];
      
      if (!result.isSelected && selected >= 4) {
        toast({ title: "Error", description: "Maximum 4 web results allowed", variant: "destructive" });
        return prev;
      }
      
      return prev.map((r, i) => 
        i === index ? { ...r, isSelected: !r.isSelected } : r
      );
    });
  };

  const toggleGeneratedResultSponsored = (index: number) => {
    setGeneratedResults(prev => 
      prev.map((r, i) => 
        i === index ? { ...r, isSponsored: !r.isSponsored } : r
      )
    );
  };

  const saveGeneratedResults = async () => {
    const selectedResults = generatedResults.filter(r => r.isSelected);
    if (selectedResults.length === 0) {
      toast({ title: "Error", description: "Please select at least one web result", variant: "destructive" });
      return;
    }

    const search = relatedSearches.find(s => s.id === selectedRelatedSearch);
    if (!search) return;

    try {
      const resultsToInsert = selectedResults.map((r, idx) => ({
        name: r.name,
        title: r.title,
        description: r.description,
        link: r.link,
        wr_page: search.target_wr,
        is_sponsored: r.isSponsored,
        serial_number: idx + 1,
        is_active: true,
        allowed_countries: ['worldwide'],
      }));

      const { error } = await supabase.from('web_results').insert(resultsToInsert);
      if (error) throw error;

      setGeneratedResults([]);
      setSelectedRelatedSearch("");
      fetchResults();
      toast({ title: "Success", description: `${selectedResults.length} web results added to wr=${search.target_wr}` });
    } catch (error) {
      console.error('Error saving web results:', error);
      toast({ title: "Error", description: "Failed to save web results", variant: "destructive" });
    }
  };

  const handleAdd = async () => {
    if (!newResult.name.trim() || !newResult.title.trim() || !newResult.link.trim()) {
      toast({ title: "Error", description: "Name, title and link are required", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.from('web_results').insert(newResult);
      if (error) throw error;

      setNewResult(emptyResult);
      fetchResults();
      toast({ title: "Added!", description: "Web result has been added." });
    } catch (error) {
      console.error('Error adding:', error);
      toast({ title: "Error", description: "Failed to add result.", variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!editingResult) return;

    try {
      const { error } = await supabase
        .from('web_results')
        .update({
          name: editingResult.name,
          title: editingResult.title,
          description: editingResult.description,
          link: editingResult.link,
          logo_url: editingResult.logo_url,
          wr_page: editingResult.wr_page,
          is_sponsored: editingResult.is_sponsored,
          serial_number: editingResult.serial_number,
          allowed_countries: editingResult.allowed_countries,
          fallback_link: editingResult.fallback_link,
          is_active: editingResult.is_active,
        })
        .eq('id', editingResult.id);

      if (error) throw error;

      setShowDialog(false);
      setEditingResult(null);
      fetchResults();
      toast({ title: "Saved!", description: "Result updated." });
    } catch (error) {
      console.error('Error updating:', error);
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this result?')) return;

    try {
      const { error } = await supabase.from('web_results').delete().eq('id', id);
      if (error) throw error;

      setResults(results.filter(r => r.id !== id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      toast({ title: "Deleted!", description: "Result removed." });
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  const toggleCountry = (countryCode: string, result: typeof newResult | WebResult, setResult: (r: any) => void) => {
    const current = result.allowed_countries || [];
    if (current.includes(countryCode)) {
      setResult({ ...result, allowed_countries: current.filter(c => c !== countryCode) });
    } else {
      setResult({ ...result, allowed_countries: [...current, countryCode] });
    }
  };

  const filteredResults = selectedWr === 0 
    ? results 
    : results.filter(r => r.wr_page === selectedWr);

  // Get unique wr_pages with their related search titles
  const wrPagesWithSearches = relatedSearches.reduce((acc, search) => {
    if (!acc[search.target_wr]) {
      acc[search.target_wr] = search.title;
    }
    return acc;
  }, {} as Record<number, string>);

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
      setSelectedIds(new Set(filteredResults.map(r => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const csvColumns = [
    { key: 'serial_number' as const, header: 'Serial #' },
    { key: 'name' as const, header: 'Name' },
    { key: 'title' as const, header: 'Title' },
    { key: 'link' as const, header: 'Link' },
    { key: 'wr_page' as const, header: 'WR Page' },
    { key: 'is_sponsored' as const, header: 'Sponsored' },
    { key: 'is_active' as const, header: 'Active' },
  ];

  const exportAll = () => {
    const csv = convertToCSV(filteredResults, csvColumns);
    downloadCSV(csv, 'web-results.csv');
    toast({ title: "Exported!", description: "All results exported to CSV." });
  };

  const exportSelected = () => {
    const selected = filteredResults.filter(r => selectedIds.has(r.id));
    const csv = convertToCSV(selected, csvColumns);
    downloadCSV(csv, 'web-results-selected.csv');
    toast({ title: "Exported!", description: `${selected.length} results exported to CSV.` });
  };

  const copySelected = () => {
    const selected = filteredResults.filter(r => selectedIds.has(r.id));
    const text = selected.map(r => `${r.name}: ${r.title} - ${r.link}`).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${selected.length} results copied to clipboard.` });
  };

  const bulkActivate = async () => {
    try {
      const { error } = await supabase
        .from('web_results')
        .update({ is_active: true })
        .in('id', Array.from(selectedIds));
      if (error) throw error;
      fetchResults();
      toast({ title: "Activated!", description: `${selectedIds.size} results activated.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to activate.", variant: "destructive" });
    }
  };

  const bulkDeactivate = async () => {
    try {
      const { error } = await supabase
        .from('web_results')
        .update({ is_active: false })
        .in('id', Array.from(selectedIds));
      if (error) throw error;
      fetchResults();
      toast({ title: "Deactivated!", description: `${selectedIds.size} results deactivated.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to deactivate.", variant: "destructive" });
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} selected results?`)) return;
    try {
      const { error } = await supabase
        .from('web_results')
        .delete()
        .in('id', Array.from(selectedIds));
      if (error) throw error;
      setSelectedIds(new Set());
      fetchResults();
      toast({ title: "Deleted!", description: `${selectedIds.size} results deleted.` });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">Web Results</h1>
        <p className="text-muted-foreground">Manage web results for each page</p>
      </div>

      {/* AI Web Results Generator */}
      <div className="glass-card p-6 border-2 border-primary/30">
        <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI Web Results Generator
        </h3>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Select Related Search</Label>
            <div className="flex gap-4">
              <Select 
                value={selectedRelatedSearch} 
                onValueChange={(value) => {
                  setSelectedRelatedSearch(value);
                  // Auto-select the page tab based on the related search
                  const search = relatedSearches.find(s => s.id === value);
                  if (search) {
                    setSelectedWr(search.target_wr);
                  }
                }}
              >
                <SelectTrigger className="admin-input flex-1">
                  <SelectValue placeholder="Choose a related search" />
                </SelectTrigger>
                <SelectContent>
                  {relatedSearches.map(search => (
                    <SelectItem key={search.id} value={search.id}>
                      {search.title} (wr={search.target_wr})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={generateWebResults} 
                disabled={!selectedRelatedSearch || isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generate 6 Web Results
              </Button>
            </div>
          </div>

          {/* Generated Results Selection */}
          {generatedResults.length > 0 && (
            <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
              <Label className="text-sm font-medium">
                Select Web Results (max 4) - Toggle Sponsored
              </Label>
              <p className="text-xs text-muted-foreground">
                Selected results will be added to wr={relatedSearches.find(s => s.id === selectedRelatedSearch)?.target_wr}
              </p>
              
              <div className="flex flex-col gap-3">
                {generatedResults.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border transition-colors ${
                      result.isSelected 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={result.isSelected}
                        onCheckedChange={() => toggleGeneratedResultSelection(index)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">{result.name}</span>
                          {result.isSponsored && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                              Sponsored
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-primary mb-1">{result.title}</p>
                        <p className="text-xs text-muted-foreground mb-2">{result.description}</p>
                        <p className="text-xs text-muted-foreground/70 truncate">{result.link}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Sponsored</Label>
                        <Switch
                          checked={result.isSponsored}
                          onCheckedChange={() => toggleGeneratedResultSponsored(index)}
                          disabled={!result.isSelected}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  {generatedResults.filter(r => r.isSelected).length}/4 selected
                </p>
                <Button onClick={saveGeneratedResults} disabled={!generatedResults.some(r => r.isSelected)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Selected Results
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Page Selection Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Select Page:</span>
        <Button
          variant={selectedWr === 0 ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedWr(0)}
        >
          All
        </Button>
        {Object.entries(wrPagesWithSearches).map(([wr, title]) => (
          <Button
            key={wr}
            variant={selectedWr === parseInt(wr) ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedWr(parseInt(wr))}
            className="flex flex-col items-center py-2 h-auto"
          >
            <span>wr={wr}</span>
            <span className="text-xs opacity-70 truncate max-w-[80px]">{title?.slice(0, 12)}...</span>
          </Button>
        ))}
        {[1, 2, 3, 4, 5].filter(n => !wrPagesWithSearches[n]).map(n => (
          <Button
            key={n}
            variant={selectedWr === n ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedWr(n)}
          >
            wr={n}
          </Button>
        ))}
      </div>

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        totalCount={filteredResults.length}
        selectedCount={selectedIds.size}
        allSelected={selectedIds.size === filteredResults.length && filteredResults.length > 0}
        onSelectAll={selectAll}
        onExportAll={exportAll}
        onExportSelected={exportSelected}
        onCopy={copySelected}
        onActivate={bulkActivate}
        onDeactivate={bulkDeactivate}
        onDelete={bulkDelete}
      />

      {/* Add New Manually */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Add Web Result Manually - Page wr={selectedWr || 1}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Title *</label>
            <Input
              value={newResult.title}
              onChange={(e) => setNewResult({ ...newResult, title: e.target.value, name: e.target.value.split(' ')[0] || '' })}
              className="admin-input"
              placeholder="e.g., Fiverr"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Related Search (determines page)</label>
            <div className="flex flex-wrap gap-1 p-2 bg-secondary/30 rounded-lg min-h-[40px] items-center">
              {relatedSearches.slice(0, 3).map(search => (
                <span 
                  key={search.id} 
                  className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
                    newResult.wr_page === search.target_wr 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={() => setNewResult({ ...newResult, wr_page: search.target_wr })}
                >
                  {search.title} (wr={search.target_wr})
                </span>
              ))}
              {relatedSearches.length > 3 && (
                <span className="text-xs text-muted-foreground">...</span>
              )}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-muted-foreground mb-1">Description</label>
            <Textarea
              value={newResult.description || ''}
              onChange={(e) => setNewResult({ ...newResult, description: e.target.value })}
              className="admin-input"
              placeholder="Enter description..."
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Original Link *</label>
            <Input
              value={newResult.link}
              onChange={(e) => setNewResult({ ...newResult, link: e.target.value })}
              className="admin-input"
              placeholder="https://www.fiverr.com"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Logo URL</label>
            <Input
              value={newResult.logo_url || ''}
              onChange={(e) => setNewResult({ ...newResult, logo_url: e.target.value })}
              className="admin-input"
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Display Order</label>
            <Input
              type="number"
              value={newResult.serial_number}
              onChange={(e) => setNewResult({ ...newResult, serial_number: parseInt(e.target.value) || 0 })}
              className="admin-input"
              min={0}
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={newResult.is_active}
                onCheckedChange={(checked) => setNewResult({ ...newResult, is_active: checked })}
              />
              <label className="text-sm text-primary">Active</label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newResult.is_sponsored}
                onCheckedChange={(checked) => setNewResult({ ...newResult, is_sponsored: checked })}
              />
              <label className="text-sm text-primary">Sponsored</label>
            </div>
          </div>
        </div>
        <Button onClick={handleAdd} className="mt-4">
          Create
        </Button>
      </div>

      {/* Existing Results */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Existing Web Results - Page wr={selectedWr || "All"}</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>#</th>
                <th>Name</th>
                <th>Title</th>
                <th>Page</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result) => (
                <tr key={result.id}>
                  <td>
                    <Checkbox
                      checked={selectedIds.has(result.id)}
                      onCheckedChange={() => toggleSelect(result.id)}
                    />
                  </td>
                  <td className="text-muted-foreground">{result.serial_number}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {result.logo_url ? (
                        <img src={result.logo_url} alt="" className="w-6 h-6 rounded" />
                      ) : (
                        <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-xs font-bold text-primary">
                          {result.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {result.name}
                      {result.is_sponsored && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Ad</span>
                      )}
                    </div>
                  </td>
                  <td className="max-w-xs truncate">{result.title}</td>
                  <td><span className="badge-primary">wr={result.wr_page}</span></td>
                  <td>
                    {result.is_active ? (
                      <span className="badge-success">Active</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Hidden</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => { setEditingResult(result); setShowDialog(true); }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(result.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredResults.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No results yet.</p>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Web Result</DialogTitle>
          </DialogHeader>
          
          {editingResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Name</label>
                  <Input
                    value={editingResult.name}
                    onChange={(e) => setEditingResult({ ...editingResult, name: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Link</label>
                  <Input
                    value={editingResult.link}
                    onChange={(e) => setEditingResult({ ...editingResult, link: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Title</label>
                  <Input
                    value={editingResult.title}
                    onChange={(e) => setEditingResult({ ...editingResult, title: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Logo URL</label>
                  <Input
                    value={editingResult.logo_url || ''}
                    onChange={(e) => setEditingResult({ ...editingResult, logo_url: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-muted-foreground mb-1">Description</label>
                  <Textarea
                    value={editingResult.description || ''}
                    onChange={(e) => setEditingResult({ ...editingResult, description: e.target.value })}
                    className="admin-input"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Page</label>
                  <Select 
                    value={String(editingResult.wr_page)} 
                    onValueChange={(v) => setEditingResult({ ...editingResult, wr_page: parseInt(v) })}
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
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Serial #</label>
                  <Input
                    type="number"
                    value={editingResult.serial_number}
                    onChange={(e) => setEditingResult({ ...editingResult, serial_number: parseInt(e.target.value) || 1 })}
                    className="admin-input"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Fallback Link</label>
                  <Input
                    value={editingResult.fallback_link || ''}
                    onChange={(e) => setEditingResult({ ...editingResult, fallback_link: e.target.value })}
                    className="admin-input"
                    placeholder="Worldwide fallback URL"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={editingResult.is_sponsored}
                      onCheckedChange={(checked) => setEditingResult({ ...editingResult, is_sponsored: !!checked })}
                    />
                    <label className="text-sm">Sponsored</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={editingResult.is_active}
                      onCheckedChange={(checked) => setEditingResult({ ...editingResult, is_active: !!checked })}
                    />
                    <label className="text-sm">Active</label>
                  </div>
                </div>
              </div>

              {/* Country Selection */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Allowed Countries
                </label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-secondary/30 rounded-lg">
                  {countries.map(country => (
                    <label key={country.code} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={editingResult.allowed_countries?.includes(country.code)}
                        onCheckedChange={() => toggleCountry(country.code, editingResult, setEditingResult)}
                      />
                      {country.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  <X className="w-4 h-4 mr-2" /> Cancel
                </Button>
                <Button onClick={handleUpdate}>
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WebResults;
