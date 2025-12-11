import { useState } from "react";
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
  DialogTrigger,
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
import { Plus, Pencil, Trash2, Copy, ExternalLink, Loader2, Sparkles } from "lucide-react";
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
  const [selectedSearches, setSelectedSearches] = useState<Set<number>>(new Set());
  
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
      if (data && selectedSearches.size > 0) {
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
      if (blogId && selectedSearches.size > 0) {
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
      const { error } = await supabase.from("blogs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      toast.success("Blog deleted successfully");
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

  const resetForm = () => {
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
    setSelectedSearches(new Set());
  };

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
          setSelectedSearches(new Set()); // Reset selections
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
    setSelectedSearches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else if (newSet.size < 4) {
        newSet.add(index);
      } else {
        toast.error("Maximum 4 related searches allowed");
      }
      return newSet;
    });
  };

  const saveRelatedSearches = async (blogId: string) => {
    if (selectedSearches.size === 0) return;
    
    const selectedTitles = Array.from(selectedSearches).map(index => generatedSearches[index]);
    const relatedSearchesToInsert = selectedTitles.map((title, idx) => ({
      title,
      blog_id: blogId,
      target_wr: idx + 1,
      serial_number: idx + 1,
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

  const copyBlogLink = (slug: string) => {
    const url = `${window.location.origin}/blog/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Blog link copied to clipboard!");
  };

  const openBlog = (slug: string) => {
    window.open(`/blog/${slug}`, "_blank");
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
    const text = selected.map(b => `${b.title}: ${window.location.origin}/blog/${b.slug}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`${selected.length} blogs copied to clipboard.`);
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
    if (!confirm(`Delete ${selectedIds.size} selected blogs?`)) return;
    try {
      const { error } = await supabase
        .from('blogs')
        .delete()
        .in('id', Array.from(selectedIds));
      if (error) throw error;
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      toast.success(`${selectedIds.size} blogs deleted.`);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Blogs</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Blog
            </Button>
          </DialogTrigger>
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
                  value={formData.category}
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
                <Input
                  value={formData.featured_image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, featured_image_url: e.target.value }))}
                  placeholder="Or paste image URL here..."
                />
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

              {/* Related Searches Selection */}
              {generatedSearches.length > 0 && (
                <div className="space-y-2 p-4 border border-border rounded-lg bg-muted/30">
                  <Label className="text-sm font-medium">
                    Select Related Searches (max 4)
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Selected searches will be linked to this blog and redirect to /wr=1, /wr=2, etc.
                  </p>
                  <div className="space-y-2">
                    {generatedSearches.map((search, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox
                          id={`search-${index}`}
                          checked={selectedSearches.has(index)}
                          onCheckedChange={() => toggleSearchSelection(index)}
                        />
                        <label
                          htmlFor={`search-${index}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {search}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedSearches.size}/4 selected
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
      </div>

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
              <TableHead>Status</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blogs?.map((blog) => (
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
                      onClick={() => copyBlogLink(blog.slug)}
                      title="Copy link"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openBlog(blog.slug)}
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
            {blogs?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No blogs yet. Create your first blog!
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
