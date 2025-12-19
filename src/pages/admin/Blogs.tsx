import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Copy, ExternalLink, Loader2, Sparkles, Search } from "lucide-react";
import { toast } from "sonner";
import BulkActionToolbar from "@/components/admin/BulkActionToolbar";
import { convertToCSV, downloadCSV } from "@/lib/csvExport";

interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  featured_image_url: string | null;
  author: string | null;
  category: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const categories = [
  "Finance",
  "Technology",
  "Lifestyle",
  "Business",
  "Health",
  "Education",
];

const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const Blogs = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generatedSearches, setGeneratedSearches] = useState<string[]>([]);
  const [selectedSearchesOrder, setSelectedSearchesOrder] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    featured_image_url: "",
    author: "",
    category: "",
    status: "published",
  });

  const { data: blogs, isLoading } = useQuery({
    queryKey: ["blogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blogs")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Blog[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Blog, "id" | "created_at" | "updated_at" | "is_active" | "excerpt">) => {
      const isActive = data.status === "published";
      const { data: insertedData, error } = await supabase.from("blogs").insert([{ ...data, is_active: isActive, excerpt: null }]).select().single();
      if (error) throw error;
      return insertedData;
    },
    onSuccess: async (data) => {
      // Save selected related searches
      if (data && selectedSearchesOrder.length > 0) {
        await saveRelatedSearches(data.id);
      }
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      toast.success("Blog created successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to create blog: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Blog> & { id: string }) => {
      const updateData = { ...data };
      if (data.status === "published") {
        updateData.is_active = true;
      }
      const { error } = await supabase.from("blogs").update(updateData).eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: async (blogId) => {
      // Save selected related searches
      if (blogId && selectedSearchesOrder.length > 0) {
        await saveRelatedSearches(blogId);
      }
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      toast.success("Blog updated successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to update blog: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete only web_results that belong to this blog (via blog_id column)
      // Prelandings will cascade delete via foreign key
      await supabase.from("web_results").delete().eq("blog_id", id);
      
      // Delete related_searches for this blog (cascade will also handle this, but explicit is clearer)
      await supabase.from("related_searches").delete().eq("blog_id", id);
      
      // Finally delete the blog - cascades will handle remaining cleanup
      const { error } = await supabase.from("blogs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      queryClient.invalidateQueries({ queryKey: ["related-searches"] });
      queryClient.invalidateQueries({ queryKey: ["web-results"] });
      queryClient.invalidateQueries({ queryKey: ["prelandings"] });
      toast.success("Blog and all related content deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete blog: " + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("blogs").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      toast.success("Blog status updated");
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  const resetForm = useCallback(() => {
    setFormData({
      title: "",
      slug: "",
      content: "",
      featured_image_url: "",
      author: "",
      category: "",
      status: "published",
    });
    setEditingBlog(null);
    setGeneratedSearches([]);
    setSelectedSearchesOrder([]);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  }, [resetForm]);

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title),
    }));
  };

  const generateImage = async () => {
    if (!formData.title) {
      toast.error("Please enter a title first");
      return;
    }

    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-image", {
        body: { title: formData.title },
      });

      if (error) throw error;

      if (data.imageUrl) {
        setFormData(prev => ({ ...prev, featured_image_url: data.imageUrl }));
        toast.success("Image generated successfully!");
      } else {
        throw new Error(data.error || "Failed to generate image");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const generateContent = async () => {
    if (!formData.title) {
      toast.error("Please enter a title first");
      return;
    }

    setIsGeneratingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-content", {
        body: { title: formData.title, slug: formData.slug },
      });

      if (error) throw error;

      if (data.content) {
        setFormData(prev => ({ ...prev, content: data.content }));
        
        // Store generated searches in state for user selection
        if (data.relatedSearches && data.relatedSearches.length > 0) {
          setGeneratedSearches(data.relatedSearches);
          setSelectedSearchesOrder([]); // Reset selections
        }
        
        toast.success("Content generated! Select related searches below.");
      } else {
        throw new Error(data.error || "Failed to generate content");
      }
    } catch (error) {
      console.error("Error generating content:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate content");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const toggleSearchSelection = (index: number) => {
    setSelectedSearchesOrder(prev => {
      const existingIndex = prev.indexOf(index);
      if (existingIndex !== -1) {
        // Remove from selection
        return prev.filter(i => i !== index);
      } else if (prev.length < 4) {
        // Add to selection order
        return [...prev, index];
      } else {
        toast.error("Maximum 4 related searches allowed");
        return prev;
      }
    });
  };

  const updateGeneratedSearch = (index: number, value: string) => {
    setGeneratedSearches(prev => 
      prev.map((s, i) => i === index ? value : s)
    );
  };

  const saveRelatedSearches = async (blogId: string) => {
    if (selectedSearchesOrder.length === 0) return;
    
    // Use the order array to maintain selection order for target_wr assignment
    const relatedSearchesToInsert = selectedSearchesOrder.map((index, orderIdx) => ({
      title: generatedSearches[index],
      blog_id: blogId,
      target_wr: orderIdx + 1, // First selected = 1, second = 2, etc.
      serial_number: orderIdx + 1,
      is_active: true,
    }));
    
    // Delete existing related searches for this blog first
    await supabase.from("related_searches").delete().eq("blog_id", blogId);
    
    // Insert selected related searches
    const { error: insertError } = await supabase.from("related_searches").insert(relatedSearchesToInsert);
    if (insertError) {
      console.error("Error saving related searches:", insertError);
    } else {
      queryClient.invalidateQueries({ queryKey: ["related-searches"] });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.slug) {
      toast.error("Title and slug are required");
      return;
    }

    if (editingBlog) {
      updateMutation.mutate({ id: editingBlog.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      content: blog.content || "",
      featured_image_url: blog.featured_image_url || "",
      author: blog.author || "",
      category: blog.category || "",
      status: blog.status,
    });
    setIsDialogOpen(true);
  };

  const copyBlogLink = (blogId: string, blogs: Blog[]) => {
    // Find blog index (1-based)
    const sortedBlogs = [...blogs].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const blogIndex = sortedBlogs.findIndex(b => b.id === blogId) + 1;
    const randomToken = Math.random().toString(36).substring(2, 10);
    const url = `${window.location.origin}/p?p=${blogIndex}&n=${randomToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Blog link copied to clipboard!");
  };

  const openBlog = (blogId: string, blogs: Blog[]) => {
    // Find blog index (1-based)
    const sortedBlogs = [...blogs].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const blogIndex = sortedBlogs.findIndex(b => b.id === blogId) + 1;
    const randomToken = Math.random().toString(36).substring(2, 10);
    window.open(`/p?p=${blogIndex}&n=${randomToken}`, "_blank");
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
    if (checked && blogs) {
      setSelectedIds(new Set(blogs.map(b => b.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const csvColumns = [
    { key: 'title' as const, header: 'Title' },
    { key: 'slug' as const, header: 'Slug' },
    { key: 'author' as const, header: 'Author' },
    { key: 'category' as const, header: 'Category' },
    { key: 'status' as const, header: 'Status' },
    { key: 'is_active' as const, header: 'Active' },
  ];

  const exportAll = () => {
    if (!blogs) return;
    const csv = convertToCSV(blogs, csvColumns);
    downloadCSV(csv, 'blogs.csv');
    toast.success("All blogs exported to CSV.");
  };

  const exportSelected = () => {
    if (!blogs) return;
    const selected = blogs.filter(b => selectedIds.has(b.id));
    const csv = convertToCSV(selected, csvColumns);
    downloadCSV(csv, 'blogs-selected.csv');
    toast.success(`${selected.length} blogs exported to CSV.`);
  };

  const copySelected = () => {
    if (!blogs) return;
    const selected = blogs.filter(b => selectedIds.has(b.id));
    const text = selected.map(b => `${window.location.origin}/blog/${b.slug}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`${selected.length} blog links copied to clipboard.`);
  };

  const bulkActivate = async () => {
    try {
      const { error } = await supabase
        .from('blogs')
        .update({ is_active: true })
        .in('id', Array.from(selectedIds));
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      toast.success(`${selectedIds.size} blogs activated.`);
    } catch (error) {
      toast.error("Failed to activate.");
    }
  };

  const bulkDeactivate = async () => {
    try {
      const { error } = await supabase
        .from('blogs')
        .update({ is_active: false })
        .in('id', Array.from(selectedIds));
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      toast.success(`${selectedIds.size} blogs deactivated.`);
    } catch (error) {
      toast.error("Failed to deactivate.");
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} selected blogs? This will also delete all related searches, web results, and prelandings.`)) return;
    try {
      const blogIds = Array.from(selectedIds);
      
      for (const blogId of blogIds) {
        // Delete only web_results that belong to this blog (via blog_id column)
        await supabase.from("web_results").delete().eq("blog_id", blogId);
        
        // Delete related_searches for this blog
        await supabase.from("related_searches").delete().eq("blog_id", blogId);
        
        // Delete the blog - cascades will handle remaining cleanup
        await supabase.from("blogs").delete().eq("id", blogId);
      }
      
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      queryClient.invalidateQueries({ queryKey: ["related-searches"] });
      queryClient.invalidateQueries({ queryKey: ["web-results"] });
      queryClient.invalidateQueries({ queryKey: ["prelandings"] });
      toast.success(`${blogIds.length} blogs and related content deleted.`);
    } catch (error) {
      toast.error("Failed to delete.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  // Filter blogs based on search query
  const filteredBlogs = blogs?.filter(blog => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      blog.title.toLowerCase().includes(query) ||
      blog.slug.toLowerCase().includes(query) ||
      (blog.author?.toLowerCase().includes(query)) ||
      (blog.category?.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Blogs</h2>
        <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Blog
        </Button>
      </div>

      {/* Search Box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title, slug, author, or category..."
          className="pl-10"
        />
      </div>

      {isDialogOpen && (
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBlog ? "Edit Blog" : "Create New Blog"}</DialogTitle>
              <DialogDescription>
                {editingBlog ? "Update your blog post details below." : "Fill in the details to create a new blog post."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter blog title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="auto-generated-from-title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="Author name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category || undefined}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Featured Image</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateImage}
                    disabled={isGeneratingImage || !formData.title}
                    className="gap-2"
                  >
                    {isGeneratingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Generate AI Image
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={formData.featured_image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, featured_image_url: e.target.value }))}
                    placeholder="Or paste image URL here..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, featured_image_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80' }))}
                  >
                    Default
                  </Button>
                </div>
                {formData.featured_image_url && (
                  <img 
                    src={formData.featured_image_url} 
                    alt="Preview" 
                    className="w-full max-h-48 object-cover rounded-md mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => generateContent()}
                    disabled={isGeneratingContent || !formData.title}
                    className="gap-2"
                  >
                    {isGeneratingContent ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Generate AI Content
                  </Button>
                </div>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Blog content..."
                  rows={6}
                />
              </div>

              {/* Related Searches Selection - Editable */}
              {generatedSearches.length > 0 && (
                <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
                  <Label className="text-sm font-medium">
                    Edit & Select Related Searches for Landing Page (max 4)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    You can edit the search text before saving. Selected searches will appear on landing page.
                  </p>
                  <div className="flex flex-col gap-2">
                    {generatedSearches.map((search, index) => {
                      const selectionOrder = selectedSearchesOrder.indexOf(index);
                      const isSelected = selectionOrder !== -1;
                      return (
                        <div 
                          key={index} 
                          className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                            isSelected 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div 
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer flex-shrink-0 ${
                              isSelected 
                                ? 'bg-primary border-primary' 
                                : 'border-muted-foreground'
                            }`}
                            onClick={() => toggleSearchSelection(index)}
                          >
                            {isSelected && (
                              <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <Input
                            value={search}
                            onChange={(e) => updateGeneratedSearch(index, e.target.value)}
                            className="flex-1 h-8 text-sm"
                            placeholder="Enter search text..."
                          />
                          {isSelected && (
                            <span className="text-xs text-primary font-medium flex-shrink-0">
                              → /wr={selectionOrder + 1}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedSearchesOrder.length}/4 selected
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {editingBlog ? "Update" : "Create"} Blog
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        totalCount={blogs?.length || 0}
        selectedCount={selectedIds.size}
        allSelected={selectedIds.size === (blogs?.length || 0) && (blogs?.length || 0) > 0}
        onSelectAll={selectAll}
        onExportAll={exportAll}
        onExportSelected={exportSelected}
        onCopy={copySelected}
        onActivate={bulkActivate}
        onDeactivate={bulkDeactivate}
        onDelete={bulkDelete}
      />

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBlogs?.map((blog) => (
              <TableRow key={blog.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(blog.id)}
                    onCheckedChange={() => toggleSelect(blog.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{blog.title}</TableCell>
                <TableCell className="text-muted-foreground">{blog.slug}</TableCell>
                <TableCell>{blog.category || "-"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(blog.created_at).toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric'
                  })}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    blog.status === "published" 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {blog.status}
                  </span>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={blog.is_active}
                    onCheckedChange={(checked) => 
                      toggleActiveMutation.mutate({ id: blog.id, is_active: checked })
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => blogs && copyBlogLink(blog.id, blogs)}
                      title="Copy link"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => blogs && openBlog(blog.id, blogs)}
                      title="Open blog"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(blog)}
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(blog.id)}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredBlogs?.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No blogs match your search." : "No blogs yet. Create your first blog!"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Blogs;
