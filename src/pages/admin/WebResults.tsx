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
import { Plus, Save, Trash2, Edit2, X, Globe, Sparkles, Loader2, Search, Copy, ClipboardList } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { countries } from "@/lib/countries";
import BulkActionToolbar from "@/components/admin/BulkActionToolbar";
import { convertToCSV, downloadCSV } from "@/lib/csvExport";
import { generateMaskedLink, formatDate, formatWebResultForCopy, generateRandomToken } from "@/lib/linkGenerator";

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
  created_at?: string;
}

interface Blog {
  id: string;
  title: string;
  slug: string;
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
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingResult, setEditingResult] = useState<WebResult | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyTarget, setCopyTarget] = useState<WebResult | null>(null);
  const [selectedWr, setSelectedWr] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  
  // Blog and Related Search filtering
  const [selectedBlogId, setSelectedBlogId] = useState<string>("");
  const [selectedRelatedSearchId, setSelectedRelatedSearchId] = useState<string>("");
  
  // AI Generator state
  const [selectedRelatedSearch, setSelectedRelatedSearch] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<GeneratedWebResult[]>([]);
  
  // Copy fields selection
  const [copyFields, setCopyFields] = useState({
    name: true,
    title: true,
    description: true,
    blogName: true,
    relatedSearch: true,
    originalLink: true,
    date: true,
  });

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
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resultsRes, blogsRes, searchesRes] = await Promise.all([
        supabase.from('web_results').select('*').order('wr_page', { ascending: true }).order('serial_number', { ascending: true }),
        supabase.from('blogs').select('id, title, slug').order('title', { ascending: true }),
        supabase.from('related_searches').select('*').eq('is_active', true).order('target_wr', { ascending: true }),
      ]);

      if (resultsRes.data) setResults(resultsRes.data);
      if (blogsRes.data) setBlogs(blogsRes.data);
      if (searchesRes.data) setRelatedSearches(searchesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter related searches based on selected blog
  const filteredRelatedSearches = selectedBlogId 
    ? relatedSearches.filter(s => s.blog_id === selectedBlogId)
    : relatedSearches;

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

  const updateGeneratedResult = (index: number, field: keyof GeneratedWebResult, value: string) => {
    setGeneratedResults(prev => 
      prev.map((r, i) => 
        i === index ? { ...r, [field]: value } : r
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
      fetchData();
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
      fetchData();
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
      fetchData();
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

  // Get blog and related search info for a web result
  const getWebResultContext = (result: WebResult) => {
    const search = relatedSearches.find(s => s.target_wr === result.wr_page);
    const blog = search?.blog_id ? blogs.find(b => b.id === search.blog_id) : null;
    return { search, blog };
  };

  // Copy single web result with all details
  const openCopyDialog = (result: WebResult) => {
    setCopyTarget(result);
    setShowCopyDialog(true);
  };

  const handleCopyWithOptions = () => {
    if (!copyTarget) return;
    
    const { search, blog } = getWebResultContext(copyTarget);
    
    const selectedFieldsList: (keyof typeof copyFields)[] = [];
    Object.entries(copyFields).forEach(([key, value]) => {
      if (value) selectedFieldsList.push(key as keyof typeof copyFields);
    });
    
    const copyText = formatWebResultForCopy({
      name: copyTarget.name,
      title: true,
      description: true,
      blogName: blog?.title || 'N/A',
      relatedSearch: search?.title || 'N/A',
      originalLink: copyTarget.link,
      date: copyTarget.created_at ? formatDate(copyTarget.created_at) : formatDate(new Date().toISOString()),
    }, selectedFieldsList);
    
    navigator.clipboard.writeText(copyText);
    toast({ title: "Copied!", description: "Web result details copied to clipboard." });
    setShowCopyDialog(false);
  };

  // Generate masked link for a web result
  const generateAndCopyMaskedLink = (result: WebResult) => {
    const { search, blog } = getWebResultContext(result);
    const maskedLink = generateMaskedLink({
      blogId: blog?.id,
      relatedSearchId: search?.id,
      webResultId: result.id,
      targetWr: result.wr_page,
    });
    navigator.clipboard.writeText(maskedLink);
    toast({ title: "Copied!", description: "Masked link copied to clipboard." });
  };

  // Filter results based on search query and selected filters
  const searchFiltered = results.filter(r => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(query) ||
      r.title.toLowerCase().includes(query) ||
      (r.description?.toLowerCase().includes(query)) ||
      r.link.toLowerCase().includes(query)
    );
  });

  // Apply blog and related search filters
  let filteredResults = searchFiltered;
  if (selectedBlogId) {
    const blogSearchIds = relatedSearches.filter(s => s.blog_id === selectedBlogId).map(s => s.target_wr);
    filteredResults = filteredResults.filter(r => blogSearchIds.includes(r.wr_page));
  }
  if (selectedRelatedSearchId) {
    const search = relatedSearches.find(s => s.id === selectedRelatedSearchId);
    if (search) {
      filteredResults = filteredResults.filter(r => r.wr_page === search.target_wr);
    }
  }
  if (selectedWr !== 0 && !selectedRelatedSearchId) {
    filteredResults = filteredResults.filter(r => r.wr_page === selectedWr);
  }

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
    const text = selected.map(r => {
      const { search, blog } = getWebResultContext(r);
      return generateMaskedLink({
        blogId: blog?.id,
        relatedSearchId: search?.id,
        webResultId: r.id,
        targetWr: r.wr_page,
      });
    }).join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${selected.length} masked links copied to clipboard.` });
  };

  const bulkActivate = async () => {
    try {
      const { error } = await supabase
        .from('web_results')
        .update({ is_active: true })
        .in('id', Array.from(selectedIds));
      if (error) throw error;
      fetchData();
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
      fetchData();
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
      fetchData();
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

      {/* Blog and Related Search Filters */}
      <div className="glass-card p-4">
        <h3 className="font-semibold text-foreground mb-3">Filter by Blog & Related Search</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-1 block">Select Blog</Label>
            <Select value={selectedBlogId} onValueChange={(v) => { setSelectedBlogId(v === 'all' ? '' : v); setSelectedRelatedSearchId(''); }}>
              <SelectTrigger className="admin-input">
                <SelectValue placeholder="All Blogs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Blogs</SelectItem>
                {blogs.map(blog => (
                  <SelectItem key={blog.id} value={blog.id}>{blog.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-1 block">Select Related Search</Label>
            <Select 
              value={selectedRelatedSearchId} 
              onValueChange={(v) => {
                const newValue = v === 'all' ? '' : v;
                setSelectedRelatedSearchId(newValue);
                // Sync with AI generator
                setSelectedRelatedSearch(newValue);
                const search = relatedSearches.find(s => s.id === v);
                if (search) setSelectedWr(search.target_wr);
              }}
              disabled={!selectedBlogId}
            >
              <SelectTrigger className={`admin-input ${selectedRelatedSearchId ? 'border-primary bg-primary/10' : ''}`}>
                <SelectValue placeholder={selectedBlogId ? "Select Related Search" : "Select Blog First"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Related Searches</SelectItem>
                {filteredRelatedSearches.map(search => (
                  <SelectItem key={search.id} value={search.id}>
                    {search.title} (wr={search.target_wr})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground mb-1 block">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, title, description..."
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI Web Results Generator */}
      <div className="glass-card p-6 border-2 border-primary/30">
        <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI Web Results Generator
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">1. Select Blog (Optional)</Label>
              <Select 
                value={selectedBlogId || 'all'} 
                onValueChange={(v) => { 
                  setSelectedBlogId(v === 'all' ? '' : v); 
                  setSelectedRelatedSearch('');
                }}
              >
                <SelectTrigger className="admin-input">
                  <SelectValue placeholder="Filter by blog" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Blogs</SelectItem>
                  {blogs.map(blog => (
                    <SelectItem key={blog.id} value={blog.id}>{blog.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">2. Select Related Search</Label>
              <div className="flex gap-4">
                <Select 
                  value={selectedRelatedSearch} 
                  onValueChange={(value) => {
                    setSelectedRelatedSearch(value);
                    // Sync with filter
                    setSelectedRelatedSearchId(value);
                    const search = relatedSearches.find(s => s.id === value);
                    if (search) setSelectedWr(search.target_wr);
                  }}
                >
                  <SelectTrigger className={`admin-input flex-1 ${selectedRelatedSearch ? 'border-primary bg-primary/10' : ''}`}>
                    <SelectValue placeholder="Choose a related search" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRelatedSearches.map(search => {
                      const blog = blogs.find(b => b.id === search.blog_id);
                      return (
                        <SelectItem key={search.id} value={search.id}>
                          {search.title} (wr={search.target_wr}) {blog ? `[${blog.title}]` : ''}
                        </SelectItem>
                      );
                    })}
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
          </div>

          {/* Generated Results Selection */}
          {generatedResults.length > 0 && (
            <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
              <Label className="text-sm font-medium">
                Edit & Select Web Results (max 4) - You can edit before saving
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
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Name</Label>
                            <Input
                              value={result.name}
                              onChange={(e) => updateGeneratedResult(index, 'name', e.target.value)}
                              className="admin-input h-8 text-sm"
                              placeholder="Site name"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Title</Label>
                            <Input
                              value={result.title}
                              onChange={(e) => updateGeneratedResult(index, 'title', e.target.value)}
                              className="admin-input h-8 text-sm"
                              placeholder="Display title"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Description</Label>
                          <Textarea
                            value={result.description}
                            onChange={(e) => updateGeneratedResult(index, 'description', e.target.value)}
                            className="admin-input text-sm min-h-[60px]"
                            placeholder="Description"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Link</Label>
                          <Input
                            value={result.link}
                            onChange={(e) => updateGeneratedResult(index, 'link', e.target.value)}
                            className="admin-input h-8 text-sm"
                            placeholder="https://..."
                          />
                        </div>
                        {result.isSponsored && (
                          <span className="inline-block text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded w-fit">
                            Sponsored
                          </span>
                        )}
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
            <Select 
              value={newResult.wr_page.toString()} 
              onValueChange={(v) => setNewResult({ ...newResult, wr_page: parseInt(v) })}
            >
              <SelectTrigger className="admin-input">
                <SelectValue placeholder="Select related search" />
              </SelectTrigger>
              <SelectContent>
                {filteredRelatedSearches.map(search => {
                  const blog = blogs.find(b => b.id === search.blog_id);
                  return (
                    <SelectItem key={search.id} value={search.target_wr.toString()}>
                      {search.title} (wr={search.target_wr}) {blog ? `[${blog.title}]` : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
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
        <h3 className="font-semibold text-foreground mb-4">Existing Web Results ({filteredResults.length})</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>#</th>
                <th>Name</th>
                <th>Title</th>
                <th>Blog</th>
                <th>Related Search</th>
                <th>Page</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result) => {
                const { search, blog } = getWebResultContext(result);
                return (
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
                    <td className="text-xs text-muted-foreground">{blog?.title || 'N/A'}</td>
                    <td className="text-xs text-muted-foreground max-w-[120px] truncate">{search?.title || 'N/A'}</td>
                    <td><span className="badge-primary">wr={result.wr_page}</span></td>
                    <td className="text-xs text-muted-foreground">
                      {result.created_at ? formatDate(result.created_at) : 'N/A'}
                    </td>
                    <td>
                      {result.is_active ? (
                        <span className="badge-success">Active</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Hidden</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openCopyDialog(result)}
                          title="Copy Details"
                        >
                          <ClipboardList className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => generateAndCopyMaskedLink(result)}
                          title="Copy Masked Link"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
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
                );
              })}
            </tbody>
          </table>

          {filteredResults.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No results yet.</p>
          )}
        </div>
      </div>

      {/* Copy Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Web Result Details</DialogTitle>
          </DialogHeader>
          
          {copyTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Select fields to copy:</p>
              
              <div className="space-y-2">
                {Object.entries(copyFields).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      checked={value}
                      onCheckedChange={(checked) => setCopyFields(prev => ({ ...prev, [key]: !!checked }))}
                    />
                    <Label className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCopyDialog(false)}>Cancel</Button>
                <Button onClick={handleCopyWithOptions}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Selected
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                <label className="block text-sm text-muted-foreground mb-2">Allowed Countries</label>
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    checked={editingResult.allowed_countries?.includes('worldwide')}
                    onCheckedChange={() => toggleCountry('worldwide', editingResult, setEditingResult)}
                  />
                  <span className="flex items-center gap-1 text-sm">
                    <Globe className="w-4 h-4" /> Worldwide
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 border border-border rounded">
                  {countries.map(country => (
                    <div key={country.code} className="flex items-center gap-1">
                      <Checkbox
                        checked={editingResult.allowed_countries?.includes(country.code)}
                        onCheckedChange={() => toggleCountry(country.code, editingResult, setEditingResult)}
                      />
                      <span className="text-xs">{country.code}</span>
                    </div>
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
