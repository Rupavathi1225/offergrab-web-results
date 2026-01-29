import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, Edit2, X, Globe, Sparkles, Loader2, Search, Copy, ChevronDown, Check, Link2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { countries, getCountryName } from "@/lib/countries";
import BulkActionToolbar from "@/components/admin/BulkActionToolbar";
import { convertToCSV, downloadCSV } from "@/lib/csvExport";
import { generateMaskedLink, formatDate, formatWebResultForCopy, generateRandomToken } from "@/lib/linkGenerator";
import SitelinksEditor from "@/components/admin/SitelinksEditor";
import { BlogMultiSelectPopover } from "@/components/admin/BlogMultiSelectPopover";

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
  blog_id?: string | null;
  related_search_id?: string | null;
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

interface GeneratedSitelink {
  title: string;
  url: string;
  is_active: boolean;
}

interface GeneratedWebResult {
  name: string;
  title: string;
  description: string;
  link: string;
  isSelected: boolean;
  isSponsored: boolean;
  sitelinks: GeneratedSitelink[];
  selectedSitelinkIdx?: number; // Track which sitelink is selected for suggestion targeting
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
  const [selectedBlogIds, setSelectedBlogIds] = useState<string[]>([]);
  const [selectedRelatedSearchId, setSelectedRelatedSearchId] = useState<string>("");
  const [blogContextFilterOpen, setBlogContextFilterOpen] = useState(false);
  const [blogTableFilterOpen, setBlogTableFilterOpen] = useState(false);
  
  // AI Generator state
  const [aiSelectedBlogId, setAiSelectedBlogId] = useState<string>("");
  const [selectedRelatedSearch, setSelectedRelatedSearch] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<GeneratedWebResult[]>([]);
  const [aiResultCount, setAiResultCount] = useState<number>(6);
  
  // Copy fields selection (horizontal row for spreadsheet) - 7 fields including country
  const [copyFields, setCopyFields] = useState({
    title: true,
    description: true,
    blogName: true,
    relatedSearch: true,
    originalLink: true,
    date: true,
    country: true,
  });

  // Sitelinks editor state
  const [showSitelinksDialog, setShowSitelinksDialog] = useState(false);
  const [sitelinksTarget, setSitelinksTarget] = useState<WebResult | null>(null);

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

  const selectedBlogIdSet = useMemo(() => new Set(selectedBlogIds), [selectedBlogIds]);

  // Filter related searches based on selected blogs (if any)
  const filteredRelatedSearches = useMemo(() => {
    if (selectedBlogIds.length === 0) return relatedSearches;
    return relatedSearches.filter((s) => s.blog_id && selectedBlogIdSet.has(s.blog_id));
  }, [relatedSearches, selectedBlogIds, selectedBlogIdSet]);

  const toggleBlogFilter = (blogId: string) => {
    setSelectedBlogIds((prev) => {
      if (prev.includes(blogId)) return prev.filter((id) => id !== blogId);
      return [...prev, blogId];
    });
    // Keep filter consistency
    setSelectedRelatedSearchId("");
  };

  const clearBlogFilter = () => {
    setSelectedBlogIds([]);
    setSelectedRelatedSearchId("");
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
        body: { relatedSearchTitle: search.title, count: aiResultCount },
      });

      if (error) throw error;

      if (data.webResults && data.webResults.length > 0) {
        setGeneratedResults(data.webResults.map((r: any) => ({
          ...r,
          isSelected: false,
          isSponsored: false,
          sitelinks: [],
        })));
        toast({ title: "Success", description: `${data.webResults.length} web results generated! Select up to 4.` });
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
      prev.map((r, i) => {
        if (i !== index) return r;
        const newIsSponsored = !r.isSponsored;
        // When enabling sponsored, initialize 4 empty sitelinks with the web result's link
        if (newIsSponsored && (!r.sitelinks || r.sitelinks.length === 0)) {
          const defaultSitelinks: GeneratedSitelink[] = [
            { title: "Apply Now", url: r.link, is_active: true },
            { title: "Learn More", url: r.link, is_active: true },
            { title: "Get Quote", url: r.link, is_active: true },
            { title: "Contact Us", url: r.link, is_active: true },
          ];
          return { ...r, isSponsored: newIsSponsored, sitelinks: defaultSitelinks };
        }
        return { ...r, isSponsored: newIsSponsored };
      })
    );
  };

  const updateGeneratedSitelink = (resultIndex: number, sitelinkIndex: number, field: keyof GeneratedSitelink, value: string | boolean) => {
    setGeneratedResults(prev => 
      prev.map((r, i) => {
        if (i !== resultIndex) return r;
        const updatedSitelinks = r.sitelinks.map((s, si) => 
          si === sitelinkIndex ? { ...s, [field]: value } : s
        );
        return { ...r, sitelinks: updatedSitelinks };
      })
    );
  };

  const applyLinkToAllSitelinks = (resultIndex: number) => {
    setGeneratedResults(prev => 
      prev.map((r, i) => {
        if (i !== resultIndex) return r;
        const updatedSitelinks = r.sitelinks.map(s => ({ ...s, url: r.link }));
        return { ...r, sitelinks: updatedSitelinks };
      })
    );
    toast({ title: "Applied!", description: "Link applied to all sitelinks." });
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
        blog_id: search.blog_id,
        related_search_id: search.id,
      }));

      const { data: insertedResults, error } = await supabase
        .from('web_results')
        .insert(resultsToInsert)
        .select('id');
      if (error) throw error;

      // Insert sitelinks for sponsored results
      if (insertedResults && insertedResults.length > 0) {
        const sitelinksToInsert: { web_result_id: string; title: string; url: string; position: number; is_active: boolean }[] = [];
        
        selectedResults.forEach((r, idx) => {
          if (r.isSponsored && r.sitelinks && r.sitelinks.length > 0 && insertedResults[idx]) {
            r.sitelinks.forEach((sitelink, sitelinkIdx) => {
              if (sitelink.title.trim() && sitelink.url.trim()) {
                sitelinksToInsert.push({
                  web_result_id: insertedResults[idx].id,
                  title: sitelink.title.trim(),
                  url: sitelink.url.trim(),
                  position: sitelinkIdx + 1,
                  is_active: sitelink.is_active,
                });
              }
            });
          }
        });

        if (sitelinksToInsert.length > 0) {
          const { error: sitelinksError } = await supabase.from('sitelinks').insert(sitelinksToInsert);
          if (sitelinksError) {
            console.error('Error saving sitelinks:', sitelinksError);
            // Don't fail the whole operation, just log
          }
        }
      }

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
      // Attach ownership so future blog deletions only remove their own data
        const ctxSearch = selectedRelatedSearchId
          ? relatedSearches.find((s) => s.id === selectedRelatedSearchId)
          : aiSelectedBlogId
            ? relatedSearches.find((s) => s.blog_id === aiSelectedBlogId && s.target_wr === newResult.wr_page)
            : undefined;

      const payload: any = ctxSearch
        ? { ...newResult, blog_id: ctxSearch.blog_id, related_search_id: ctxSearch.id }
        : newResult;

      const { error } = await supabase.from('web_results').insert(payload);
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
    // Prefer explicit relation when available
    const search = result.related_search_id
      ? relatedSearches.find((s) => s.id === result.related_search_id)
      : relatedSearches.find((s) => s.target_wr === result.wr_page);

    const blogId = result.blog_id ?? search?.blog_id ?? null;
    const blog = blogId ? blogs.find((b) => b.id === blogId) : null;
    return { search, blog };
  };

  // Copy single web result with all details
  const openCopyDialog = (result: WebResult) => {
    setCopyTarget(result);
    setShowCopyDialog(true);
  };

  // Helper to get country names from allowed_countries
  const getCountryDisplayNames = (allowedCountries: string[] | null | undefined): string => {
    if (!allowedCountries || allowedCountries.length === 0) return 'N/A';
    return allowedCountries.map(code => getCountryName(code)).join(', ');
  };

  const handleCopyWithOptions = () => {
    if (!copyTarget) return;
    
    const { search, blog } = getWebResultContext(copyTarget);
    
    // Build headers and values arrays based on selected fields - 7 fields including country
    const headers: string[] = [];
    const values: string[] = [];
    
    if (copyFields.title) {
      headers.push('Web Result Title');
      values.push(copyTarget.title || '');
    }
    if (copyFields.description) {
      headers.push('Web Result Description');
      values.push(copyTarget.description || '');
    }
    if (copyFields.blogName) {
      headers.push('Blog');
      values.push(blog?.title || 'No Blog');
    }
    if (copyFields.relatedSearch) {
      headers.push('Related Search');
      values.push(search?.title || 'N/A');
    }
    if (copyFields.originalLink) {
      headers.push('Original Link');
      values.push(copyTarget.link || '');
    }
    if (copyFields.date) {
      headers.push('Date');
      values.push(copyTarget.created_at ? formatDate(copyTarget.created_at) : formatDate(new Date().toISOString()));
    }
    if (copyFields.country) {
      headers.push('Country');
      values.push(getCountryDisplayNames(copyTarget.allowed_countries));
    }
    
    // Create two rows: headers and values
    const copyText = headers.join('\t') + '\n' + values.join('\t');
    
    navigator.clipboard.writeText(copyText);
    toast({ title: "Copied!", description: "Headers and data copied to clipboard." });
    setShowCopyDialog(false);
  };

  // Quick copy single field
  const quickCopy = (result: WebResult, field: 'title' | 'description' | 'originalLink' | 'blogName' | 'relatedSearch' | 'date' | 'name' | 'country' | 'all') => {
    const { search, blog } = getWebResultContext(result);
    const maskedLink = generateMaskedLink({
      blogId: blog?.id,
      relatedSearchId: search?.id,
      webResultId: result.id,
      targetWr: result.wr_page,
    });
    let copyText = '';
    
    if (field === 'all') {
      // Fetch sitelinks for this result
      const fetchSitelinks = async () => {
        const { data: sitelinks } = await supabase
          .from('sitelinks')
          .select('url, position')
          .eq('web_result_id', result.id)
          .order('position', { ascending: true });
        
        const site1 = sitelinks?.find(s => s.position === 1)?.url || '';
        const site2 = sitelinks?.find(s => s.position === 2)?.url || '';
        const site3 = sitelinks?.find(s => s.position === 3)?.url || '';
        const site4 = sitelinks?.find(s => s.position === 4)?.url || '';
        
        // Copy headers row + data row (11 columns: Title, Description, Blog, Related Search, Original Link, Date, Country, Site1Link, Site2Link, Site3Link, Site4Link)
        const headers = ['Web Result Title', 'Web Result Description', 'Blog', 'Related Search', 'Original Link', 'Date', 'Country', 'Site1Link', 'Site2Link', 'Site3Link', 'Site4Link'];
        const values = [
          result.title || '',
          result.description || '',
          blog?.title || 'No Blog',
          search?.title || 'N/A',
          result.link || '',
          result.created_at ? formatDate(result.created_at) : formatDate(new Date().toISOString()),
          getCountryDisplayNames(result.allowed_countries),
          site1,
          site2,
          site3,
          site4,
        ];
        const text = headers.join('\t') + '\n' + values.join('\t');
        navigator.clipboard.writeText(text);
        toast({ title: "Copied!", description: "All details with sitelinks copied to clipboard." });
      };
      fetchSitelinks();
      return;
    } else if (field === 'title') {
      copyText = result.title || '';
    } else if (field === 'description') {
      copyText = result.description || '';
    } else if (field === 'originalLink') {
      copyText = result.link || '';
    } else if (field === 'blogName') {
      copyText = blog?.title || 'No Blog';
    } else if (field === 'relatedSearch') {
      copyText = search?.title || 'N/A';
    } else if (field === 'date') {
      copyText = result.created_at ? formatDate(result.created_at) : formatDate(new Date().toISOString());
    } else if (field === 'name') {
      copyText = result.name || '';
    } else if (field === 'country') {
      copyText = getCountryDisplayNames(result.allowed_countries);
    }
    
    navigator.clipboard.writeText(copyText);
    toast({ title: "Copied!", description: `${field} copied to clipboard.` });
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
    toast({ title: "Copied!", description: "Shareable link copied to clipboard." });
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
  if (selectedBlogIds.length > 0) {
    const blogWrPages = new Set(
      relatedSearches
        .filter((s) => s.blog_id && selectedBlogIdSet.has(s.blog_id))
        .map((s) => s.target_wr)
    );

    filteredResults = filteredResults.filter((r) => {
      if (r.blog_id) return selectedBlogIdSet.has(r.blog_id);
      // Legacy fallback: match by wr_page for results that aren't linked to a blog_id
      return blogWrPages.has(r.wr_page);
    });
  }
  if (selectedRelatedSearchId) {
    filteredResults = filteredResults.filter((r) => r.related_search_id === selectedRelatedSearchId);
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

  const copySelected = async () => {
    const selected = filteredResults.filter(r => selectedIds.has(r.id));
    
    // Fetch sitelinks for all selected results
    const { data: allSitelinks } = await supabase
      .from('sitelinks')
      .select('web_result_id, url, position')
      .in('web_result_id', selected.map(r => r.id))
      .order('position', { ascending: true });
    
    // Group sitelinks by web_result_id
    const sitelinksByResult = new Map<string, { url: string; position: number }[]>();
    allSitelinks?.forEach(s => {
      if (!sitelinksByResult.has(s.web_result_id)) {
        sitelinksByResult.set(s.web_result_id, []);
      }
      sitelinksByResult.get(s.web_result_id)!.push(s);
    });
    
    // Headers row - 11 fields including sitelinks
    const headers = ['Web Result Title', 'Web Result Description', 'Blog', 'Related Search', 'Original Link', 'Date', 'Country', 'Site1Link', 'Site2Link', 'Site3Link', 'Site4Link'];
    
    // Data rows for each selected result
    const dataRows = selected.map(r => {
      const { search, blog } = getWebResultContext(r);
      const sitelinks = sitelinksByResult.get(r.id) || [];
      
      const site1 = sitelinks.find(s => s.position === 1)?.url || '';
      const site2 = sitelinks.find(s => s.position === 2)?.url || '';
      const site3 = sitelinks.find(s => s.position === 3)?.url || '';
      const site4 = sitelinks.find(s => s.position === 4)?.url || '';
      
      return [
        r.title || '',
        r.description || '',
        blog?.title || '',
        search?.title || '',
        r.link || '',
        r.created_at ? formatDate(r.created_at) : formatDate(new Date().toISOString()),
        getCountryDisplayNames(r.allowed_countries),
        site1,
        site2,
        site3,
        site4,
      ].join('\t');
    });
    
    const text = headers.join('\t') + '\n' + dataRows.join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${selected.length} results with sitelinks copied to clipboard.` });
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
            <Label className="text-sm text-muted-foreground mb-1 block">Select Blogs</Label>
            <BlogMultiSelectPopover
              open={blogContextFilterOpen}
              onOpenChange={setBlogContextFilterOpen}
              blogs={blogs}
              selectedBlogIds={selectedBlogIds}
              onToggleBlog={toggleBlogFilter}
              onClear={clearBlogFilter}
              triggerClassName="admin-input justify-between w-full"
              contentClassName="z-[200] w-[320px] p-0 bg-popover text-popover-foreground border border-border shadow-lg"
            />

            {selectedBlogIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedBlogIds.slice(0, 3).map((id) => {
                  const blog = blogs.find((b) => b.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="gap-1">
                      <span className="max-w-[160px] truncate">{blog?.title ?? "Blog"}</span>
                      <button
                        type="button"
                        onClick={() => toggleBlogFilter(id)}
                        className="opacity-70 hover:opacity-100"
                        aria-label="Remove blog filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
                {selectedBlogIds.length > 3 && (
                  <Badge variant="secondary">+{selectedBlogIds.length - 3} more</Badge>
                )}
                <Button variant="ghost" size="sm" onClick={clearBlogFilter} className="h-7 px-2">
                  Clear
                </Button>
              </div>
            )}
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
            >
              <SelectTrigger className={`admin-input ${selectedRelatedSearchId ? 'border-primary bg-primary/10' : ''}`}>
                <SelectValue placeholder={"Select Related Search"} />
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
                value={aiSelectedBlogId || 'all'} 
                onValueChange={(v) => { 
                  setAiSelectedBlogId(v === 'all' ? '' : v); 
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
                <SelectTrigger className={`admin-input ${selectedRelatedSearch ? 'border-primary bg-primary/10' : ''}`}>
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
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">3. Number of Results to Generate</Label>
              <Select value={String(aiResultCount)} onValueChange={(v) => setAiResultCount(Number(v))}>
                <SelectTrigger className="admin-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[6, 8, 10, 12, 14, 16, 18, 20].map(n => (
                    <SelectItem key={n} value={String(n)}>{n} results</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={generateWebResults} 
                disabled={!selectedRelatedSearch || isGenerating}
                className="gap-2 w-full"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generate {aiResultCount} Web Results
              </Button>
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
                        {/* Sitelinks section - shown when sponsored is enabled */}
                        {result.isSponsored && result.sitelinks && result.sitelinks.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-xs font-medium text-primary flex items-center gap-1.5">
                                <Link2 className="w-3 h-3" />
                                Sitelinks (4) - Click a sitelink to select, then click suggestion
                              </Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => applyLinkToAllSitelinks(index)}
                                className="h-6 text-xs px-2"
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Use Same URL
                              </Button>
                            </div>
                            {/* Sitelink cards with title and URL fields */}
                            <div className="space-y-2">
                              {result.sitelinks.map((sitelink, sitelinkIdx) => (
                                <div 
                                  key={sitelinkIdx} 
                                  className={`p-2 rounded border text-xs transition-all cursor-pointer ${
                                    result.selectedSitelinkIdx === sitelinkIdx 
                                      ? 'border-primary bg-primary/10 ring-1 ring-primary' 
                                      : sitelink.is_active 
                                        ? 'border-primary/30 bg-primary/5 hover:border-primary/50' 
                                        : 'border-border/30 bg-muted/20 opacity-60'
                                  }`}
                                  onClick={() => {
                                    // Set this sitelink as selected
                                    setGeneratedResults(prev => prev.map((r, i) => 
                                      i === index ? { ...r, selectedSitelinkIdx: sitelinkIdx } : r
                                    ));
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                                        {sitelinkIdx + 1}
                                      </span>
                                      <span className="font-medium">Sitelink {sitelinkIdx + 1}</span>
                                      {result.selectedSitelinkIdx === sitelinkIdx && (
                                        <span className="text-[10px] text-primary font-medium">(Selected)</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Label className="text-[10px] text-muted-foreground">Active</Label>
                                      <Switch
                                        checked={sitelink.is_active}
                                        onCheckedChange={(val) => updateGeneratedSitelink(index, sitelinkIdx, 'is_active', val)}
                                        className="scale-75"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                  </div>
                                  {/* Quick suggestions - only show for selected sitelink */}
                                  {result.selectedSitelinkIdx === sitelinkIdx && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {["Apply Now", "Get Quote", "Contact Us", "Learn More", "Shop Deals", "Book Today", "Sign Up", "View Plans"].map((suggestion) => (
                                        <Button
                                          key={suggestion}
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="h-5 text-[10px] px-1.5 py-0"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateGeneratedSitelink(index, sitelinkIdx, 'title', suggestion);
                                          }}
                                        >
                                          {suggestion}
                                        </Button>
                                      ))}
                                    </div>
                                  )}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-[10px] text-muted-foreground">Title</Label>
                                      <Input
                                        value={sitelink.title}
                                        onChange={(e) => updateGeneratedSitelink(index, sitelinkIdx, 'title', e.target.value)}
                                        placeholder="e.g., Apply Now"
                                        className="h-7 text-xs mt-1"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-[10px] text-muted-foreground">URL</Label>
                                      <Input
                                        value={sitelink.url}
                                        onChange={(e) => updateGeneratedSitelink(index, sitelinkIdx, 'url', e.target.value)}
                                        placeholder="https://example.com"
                                        className="h-7 text-xs mt-1"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
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
        <Button
          variant={selectedWr === 0 && selectedBlogIds.length === 0 && !selectedRelatedSearchId && !searchQuery ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setSelectedWr(0);
            clearBlogFilter();
            setSelectedRelatedSearchId('');
            setSelectedRelatedSearch('');
            setSearchQuery('');
          }}
          className="gap-2"
        >
          <Globe className="w-4 h-4" />
          All Web Results
        </Button>
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

      {/* Filter for Existing Results */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">Filter by Blog:</Label>
          <BlogMultiSelectPopover
            open={blogTableFilterOpen}
            onOpenChange={setBlogTableFilterOpen}
            blogs={blogs}
            selectedBlogIds={selectedBlogIds}
            onToggleBlog={toggleBlogFilter}
            onClear={clearBlogFilter}
            triggerClassName="admin-input w-[220px] justify-between"
            contentClassName="z-[200] w-[320px] p-0 bg-popover text-popover-foreground border border-border shadow-lg"
          />
        </div>
        {selectedBlogIds.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              clearBlogFilter();
              setSelectedRelatedSearchId('');
              setSelectedRelatedSearch('');
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear Filter
          </Button>
        )}
      </div>

      {/* Existing Results */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">
          Existing Web Results ({filteredResults.length})
          {selectedBlogIds.length > 0 && (
            <span className="text-sm text-muted-foreground ml-2">
              - filtered by {selectedBlogIds.length} blog{selectedBlogIds.length === 1 ? "" : "s"}
            </span>
          )}
        </h3>
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
                <th>Country</th>
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
                    <td className="text-xs text-muted-foreground max-w-[150px] truncate" title={getCountryDisplayNames(result.allowed_countries)}>
                      {getCountryDisplayNames(result.allowed_countries)}
                    </td>
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title="Copy Options">
                              <Copy className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => generateAndCopyMaskedLink(result)}>
                              Copy Shareable Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => quickCopy(result, 'all')}>
                              Copy All Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => quickCopy(result, 'title')}>
                              Copy Title
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => quickCopy(result, 'description')}>
                              Copy Description
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => quickCopy(result, 'blogName')}>
                              Copy Blog Name
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => quickCopy(result, 'relatedSearch')}>
                              Copy Related Search
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => quickCopy(result, 'originalLink')}>
                              Copy Original Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => quickCopy(result, 'country')}>
                              Copy Country
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => quickCopy(result, 'date')}>
                              Copy Date
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {/* Sitelinks button - only for sponsored ads */}
                        {result.is_sponsored && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            title="Manage Sitelinks"
                            onClick={() => { setSitelinksTarget(result); setShowSitelinksDialog(true); }}
                          >
                            <Link2 className="w-4 h-4 text-primary" />
                          </Button>
                        )}
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
              <p className="text-sm text-muted-foreground">Select fields to copy (copies as horizontal row for spreadsheet):</p>
              
              <div className="space-y-2">
                {Object.entries(copyFields).map(([key, value]) => {
                  const labels: Record<string, string> = {
                    title: 'Web Result Title',
                    description: 'Web Result Description',
                    blogName: 'Blog',
                    relatedSearch: 'Related Search',
                    originalLink: 'Original Link',
                    date: 'Date',
                  };
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        checked={value}
                        onCheckedChange={(checked) => setCopyFields(prev => ({ ...prev, [key]: !!checked }))}
                      />
                      <Label className="text-sm">{labels[key] || key}</Label>
                    </div>
                  );
                })}
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

      {/* Sitelinks Editor Dialog */}
      <Dialog open={showSitelinksDialog} onOpenChange={setShowSitelinksDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {sitelinksTarget && (
            <SitelinksEditor
              webResultId={sitelinksTarget.id}
              webResultTitle={sitelinksTarget.title}
              webResultLink={sitelinksTarget.link}
              onClose={() => {
                setShowSitelinksDialog(false);
                setSitelinksTarget(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WebResults;
