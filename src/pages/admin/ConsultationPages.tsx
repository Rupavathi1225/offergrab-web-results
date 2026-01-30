import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink, Copy } from "lucide-react";

interface ConsultationPage {
  id: string;
  name: string;
  slug: string;
  destination_link: string;
  image_url: string | null;
  trust_line: string | null;
  cta_text: string | null;
  is_active: boolean;
  created_at: string;
}

const ConsultationPages = () => {
  const [pages, setPages] = useState<ConsultationPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<ConsultationPage | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    destination_link: "",
    image_url: "",
    trust_line: "To proceed, please complete a short, secure consultation form.",
    cta_text: "Take Your Consultation",
    is_active: true,
  });

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("consultation_pages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch consultation pages");
      console.error(error);
    } else {
      setPages(data || []);
    }
    setLoading(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      destination_link: "",
      image_url: "",
      trust_line: "To proceed, please complete a short, secure consultation form.",
      cta_text: "Take Your Consultation",
      is_active: true,
    });
    setEditingPage(null);
  };

  const handleOpenDialog = (page?: ConsultationPage) => {
    if (page) {
      setEditingPage(page);
      setFormData({
        name: page.name,
        slug: page.slug,
        destination_link: page.destination_link,
        image_url: page.image_url || "",
        trust_line: page.trust_line || "To proceed, please complete a short, secure consultation form.",
        cta_text: page.cta_text || "Take Your Consultation",
        is_active: page.is_active,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.slug || !formData.destination_link) {
      toast.error("Name, slug and destination link are required");
      return;
    }

    if (editingPage) {
      const { error } = await supabase
        .from("consultation_pages")
        .update({
          name: formData.name,
          slug: formData.slug,
          destination_link: formData.destination_link,
          image_url: formData.image_url || null,
          trust_line: formData.trust_line,
          cta_text: formData.cta_text,
          is_active: formData.is_active,
        })
        .eq("id", editingPage.id);

      if (error) {
        toast.error("Failed to update consultation page");
        console.error(error);
      } else {
        toast.success("Consultation page updated");
        setIsDialogOpen(false);
        resetForm();
        fetchPages();
      }
    } else {
      const { error } = await supabase
        .from("consultation_pages")
        .insert({
          name: formData.name,
          slug: formData.slug,
          destination_link: formData.destination_link,
          image_url: formData.image_url || null,
          trust_line: formData.trust_line,
          cta_text: formData.cta_text,
          is_active: formData.is_active,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("A page with this slug already exists");
        } else {
          toast.error("Failed to create consultation page");
        }
        console.error(error);
      } else {
        toast.success("Consultation page created");
        setIsDialogOpen(false);
        resetForm();
        fetchPages();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this consultation page?")) return;

    const { error } = await supabase
      .from("consultation_pages")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete consultation page");
      console.error(error);
    } else {
      toast.success("Consultation page deleted");
      fetchPages();
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("consultation_pages")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(`Page ${!currentStatus ? "activated" : "deactivated"}`);
      fetchPages();
    }
  };

  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/cnos/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Consultation Pages</h1>
          <p className="text-muted-foreground">
            Manage /cnos/:name redirect pages with arrows and trust messages
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Consultation Page
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPage ? "Edit Consultation Page" : "Add Consultation Page"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Crypto Consultation"
                />
              </div>

              <div className="space-y-2">
                <Label>Slug (URL) *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">/cnos/</span>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="crypto-consultation"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Destination Link *</Label>
                <Input
                  value={formData.destination_link}
                  onChange={(e) => setFormData({ ...formData, destination_link: e.target.value })}
                  placeholder="https://example.com/offer"
                />
              </div>

              <div className="space-y-2">
                <Label>Image URL (Optional)</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/image.png"
                />
              </div>

              <div className="space-y-2">
                <Label>Trust Line</Label>
                <Textarea
                  value={formData.trust_line}
                  onChange={(e) => setFormData({ ...formData, trust_line: e.target.value })}
                  placeholder="To proceed, please complete a short, secure consultation form."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>CTA Text</Label>
                <Input
                  value={formData.cta_text}
                  onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                  placeholder="Take Your Consultation"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label>Active</Label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingPage ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Consultation Pages</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : pages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No consultation pages yet. Create your first one!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">{page.name}</TableCell>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">/cnos/{page.slug}</code>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {page.destination_link}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={page.is_active}
                        onCheckedChange={() => handleToggleActive(page.id, page.is_active)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyUrl(page.slug)}
                          title="Copy URL"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(`/cnos/${page.slug}`, "_blank")}
                          title="Preview"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(page)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(page.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsultationPages;
