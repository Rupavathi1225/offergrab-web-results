import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, ExternalLink, Loader2, Sparkles, Search } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Finance", "Technology", "Lifestyle", "Business", "Health", "Education", "Tax"];
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80";

const slugify = (t: string) => t.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");

interface Article {
  id: string; slug: string; title: string; lead: string | null; category: string | null;
  hero_image: string | null; body_html: string | null; author_name: string | null;
  author_avatar: string | null; read_minutes: number; published: boolean; is_active: boolean;
  is_step: boolean; step_position: number | null; feature_on_homepage: boolean;
  total_words: number | null; view_count: number; like_count: number; published_at: string;
}

const emptyForm = {
  title: "", slug: "", lead: "", category: "",
  hero_image: "", body_html: "", author_name: "Editorial Team",
  author_avatar: "https://i.pravatar.cc/96?img=1", read_minutes: 5,
  published: true, is_active: true, is_step: false, step_position: null as number | null,
  feature_on_homepage: true, total_words: 800,
};

export default function Articles() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [searchQ, setSearchQ] = useState("");

  // AI state
  const [genImage, setGenImage] = useState(false);
  const [genH1, setGenH1] = useState(false);
  const [genH2, setGenH2] = useState(false);
  const [genContent, setGenContent] = useState(false);
  const [h1Opts, setH1Opts] = useState<string[]>([]);
  const [selH1, setSelH1] = useState("");
  const [h2Count, setH2Count] = useState(4);
  const [h2s, setH2s] = useState<string[]>([]);
  const [selH2s, setSelH2s] = useState<string[]>([]);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["adm-articles"],
    queryFn: async () => {
      const { data } = await supabase.from("articles").select("*").order("published_at", { ascending: false });
      return (data || []) as unknown as Article[];
    },
  });

  const reset = useCallback(() => {
    setForm({ ...emptyForm }); setEditing(null);
    setH1Opts([]); setSelH1(""); setH2s([]); setSelH2s([]); setH2Count(4);
  }, []);

  const onDialogChange = (o: boolean) => { setOpen(o); if (!o) reset(); };

  const setTitle = (title: string) => setForm(p => ({ ...p, title, slug: p.slug || slugify(title) }));

  const invoke = async (body: any) => {
    const { invokeEdgeFunction } = await import("@/lib/invokeEdgeFunction");
    return invokeEdgeFunction<any>("generate-blog-content", body);
  };

  const generateH1 = async () => {
    const topic = form.title.trim();
    if (!topic) return toast.error("Enter a topic/keyword first");
    setGenH1(true);
    try {
      const { data, error } = await invoke({ title: topic, generateType: "h1" });
      if (error) throw error;
      if (data?.titles?.length) { setH1Opts(data.titles); toast.success("H1 options generated"); }
    } catch (e: any) { toast.error(e.message || "Failed"); } finally { setGenH1(false); }
  };

  const pickH1 = (t: string) => { setSelH1(t); setForm(p => ({ ...p, title: t, slug: slugify(t) })); };

  const generateH2 = async () => {
    if (!form.title) return toast.error("Select an H1 first");
    setGenH2(true);
    try {
      const { data, error } = await invoke({ title: form.title, generateType: "h2", h2Count });
      if (error) throw error;
      if (data?.h2Sections?.length) { setH2s(data.h2Sections); setSelH2s(data.h2Sections); toast.success("H2s generated"); }
    } catch (e: any) { toast.error(e.message || "Failed"); } finally { setGenH2(false); }
  };

  const generateFullContent = async () => {
    if (!form.title) return toast.error("Enter a title first");
    setGenContent(true);
    try {
      const { data, error } = await invoke({
        title: form.title, slug: form.slug, totalWordTarget: form.total_words,
        h2Count: selH2s.length || h2Count, generateType: "full",
      });
      if (error) throw error;
      if (data?.content) { setForm(p => ({ ...p, body_html: data.content })); toast.success("Content generated"); }
    } catch (e: any) { toast.error(e.message || "Failed"); } finally { setGenContent(false); }
  };

  const generateImage = async () => {
    if (!form.title) return toast.error("Enter a title first");
    setGenImage(true);
    try {
      const { invokeEdgeFunction } = await import("@/lib/invokeEdgeFunction");
      const { data, error } = await invokeEdgeFunction<{ imageUrl?: string; error?: string }>("generate-blog-image", { title: form.title });
      if (error) throw error;
      if (data?.imageUrl) { setForm(p => ({ ...p, hero_image: data.imageUrl! })); toast.success("Image generated"); }
    } catch (e: any) { toast.error(e.message || "Failed"); } finally { setGenImage(false); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.slug) return toast.error("Title and slug required");
    if (!form.category) return toast.error("Category is required");

    // Auto-apply default image if none
    const heroImage = form.hero_image || DEFAULT_IMAGE;

    const payload: any = {
      title: form.title, slug: form.slug, lead: form.lead || null, category: form.category,
      hero_image: heroImage, body_html: form.body_html || null,
      author_name: form.author_name || "Editorial Team", author_avatar: form.author_avatar || null,
      read_minutes: form.read_minutes || 5, published: form.published, is_active: form.is_active,
      is_step: form.is_step, step_position: form.is_step ? form.step_position : null,
      feature_on_homepage: form.feature_on_homepage, total_words: form.total_words,
    };

    if (editing) {
      const { error } = await supabase.from("articles").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Article updated");
    } else {
      const { error } = await supabase.from("articles").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Article created");
    }
    setOpen(false); reset();
    qc.invalidateQueries({ queryKey: ["adm-articles"] });
    qc.invalidateQueries({ queryKey: ["articles-home"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete article?")) return;
    await supabase.from("articles").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["adm-articles"] });
    qc.invalidateQueries({ queryKey: ["articles-home"] });
    toast.success("Deleted");
  };

  const edit = (a: Article) => {
    setEditing(a);
    setForm({
      title: a.title, slug: a.slug, lead: a.lead || "", category: a.category || "",
      hero_image: a.hero_image || "", body_html: a.body_html || "",
      author_name: a.author_name || "Editorial Team", author_avatar: a.author_avatar || "https://i.pravatar.cc/96?img=1",
      read_minutes: a.read_minutes || 5, published: a.published, is_active: a.is_active,
      is_step: a.is_step, step_position: a.step_position, feature_on_homepage: a.feature_on_homepage,
      total_words: a.total_words || 800,
    });
    setOpen(true);
  };

  const toggleActive = async (a: Article) => {
    await supabase.from("articles").update({ is_active: !a.is_active }).eq("id", a.id);
    qc.invalidateQueries({ queryKey: ["adm-articles"] });
    qc.invalidateQueries({ queryKey: ["articles-home"] });
  };

  const filtered = articles.filter(a => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return a.title.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q) || (a.category || "").toLowerCase().includes(q);
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Articles</h2>
        <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="w-4 h-4" />Add Article</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search title, slug, or category…" className="pl-10" />
      </div>

      {open && (
        <Dialog open={open} onOpenChange={onDialogChange}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Article" : "Create New Article"}</DialogTitle>
              <DialogDescription>{editing ? "Update the article." : "Fill in details to create an article."}</DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              {/* Step 1: H1 */}
              <div className="space-y-3 p-4 border border-primary/30 rounded-lg bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">Step 1</span>
                  <Label className="font-semibold">Generate H1 Title</Label>
                </div>
                <div className="flex gap-2">
                  <Input value={form.title} onChange={e => setTitle(e.target.value)} placeholder="Enter topic/keyword…" className="flex-1" />
                  <Button type="button" variant="outline" onClick={generateH1} disabled={genH1 || !form.title.trim()} className="gap-2 whitespace-nowrap">
                    {genH1 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate H1
                  </Button>
                </div>
                {h1Opts.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <Label className="text-xs text-muted-foreground">Select an H1 title:</Label>
                    {h1Opts.map((t, i) => (
                      <div key={i} onClick={() => pickH1(t)} className={`cursor-pointer p-3 rounded-lg border ${selH1 === t ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}>
                        <span className={`text-sm ${selH1 === t ? "font-semibold text-primary" : ""}`}>{t}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 2: H2s */}
              {form.title && (
                <div className="space-y-3 p-4 border border-secondary/50 rounded-lg bg-secondary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-secondary text-secondary-foreground text-xs font-bold px-2 py-1 rounded">Step 2</span>
                    <Label className="font-semibold">Generate H2 Sections</Label>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Number of H2s:</Label>
                      <Select value={String(h2Count)} onValueChange={v => setH2Count(parseInt(v))}>
                        <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{[2,3,4,5,6,7,8].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="outline" onClick={generateH2} disabled={genH2} className="gap-2">
                      {genH2 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate H2s
                    </Button>
                  </div>
                  {h2s.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {h2s.map((h2, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Checkbox checked={selH2s.includes(h2)} onCheckedChange={() => setSelH2s(p => p.includes(h2) ? p.filter(x => x !== h2) : [...p, h2])} />
                          <Input value={h2} onChange={e => { const v = e.target.value; setH2s(p => p.map((x, ix) => ix === i ? v : x)); setSelH2s(p => p.map(x => x === h2 ? v : x)); }} className="flex-1 h-9 text-sm" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} required />
              </div>

              <div className="space-y-2">
                <Label>Lead / Excerpt</Label>
                <Textarea rows={2} value={form.lead} onChange={e => setForm(p => ({ ...p, lead: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Author name</Label>
                  <Input value={form.author_name} onChange={e => setForm(p => ({ ...p, author_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Read minutes</Label>
                  <Input type="number" value={form.read_minutes} onChange={e => setForm(p => ({ ...p, read_minutes: +e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category || undefined} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category (required)" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Featured Image * <span className="text-xs text-muted-foreground">(default applied if empty)</span></Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={generateImage} disabled={genImage || !form.title} className="gap-2">
                    {genImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate AI Image
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input value={form.hero_image} onChange={e => setForm(p => ({ ...p, hero_image: e.target.value }))} placeholder="Or paste image URL…" className="flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setForm(p => ({ ...p, hero_image: DEFAULT_IMAGE }))}>Default</Button>
                </div>
                {form.hero_image && <img src={form.hero_image} alt="preview" className="w-full max-h-48 object-cover rounded-md mt-2" />}
              </div>

              {/* Step 3: full content */}
              <div className="space-y-2">
                <Label>Content (HTML)</Label>
                <div className="flex flex-wrap gap-3 items-center mb-2 p-3 border rounded-lg bg-muted/20">
                  <Label className="text-xs">Total words:</Label>
                  <Input type="number" className="w-24 h-8" value={form.total_words} onChange={e => setForm(p => ({ ...p, total_words: +e.target.value }))} />
                  <Button type="button" variant="outline" onClick={generateFullContent} disabled={genContent || !form.title} className="gap-2 ml-auto">
                    {genContent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate AI Content
                  </Button>
                </div>
                <Textarea rows={10} value={form.body_html} onChange={e => setForm(p => ({ ...p, body_html: e.target.value }))} placeholder="<p>Article body HTML…</p>" />
              </div>

              {/* Placement */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                <Label className="font-semibold">Homepage placement</Label>

                <div className="flex items-center gap-2">
                  <Switch checked={form.feature_on_homepage} onCheckedChange={v => setForm(p => ({ ...p, feature_on_homepage: v }))} />
                  <Label className="text-sm">Feature on homepage (Hero + Mosaic). When off, appears only in Latest + Mini Grid.</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={form.is_step} onCheckedChange={v => setForm(p => ({ ...p, is_step: v, step_position: v ? (p.step_position || 1) : null }))} />
                  <Label className="text-sm">Pin as Step (fixed slot, does not shift)</Label>
                  {form.is_step && (
                    <Select value={String(form.step_position || 1)} onValueChange={v => setForm(p => ({ ...p, step_position: +v }))}>
                      <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>Step {n}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.published} onCheckedChange={v => setForm(p => ({ ...p, published: v }))} />
                    <Label className="text-sm">Published</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                    <Label className="text-sm">Active</Label>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full">{editing ? "Update Article" : "Create Article"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead><TableHead>Category</TableHead>
            <TableHead>Placement</TableHead><TableHead>Views</TableHead><TableHead>Likes</TableHead>
            <TableHead>Pub</TableHead><TableHead>Active</TableHead><TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(a => (
            <TableRow key={a.id}>
              <TableCell className="max-w-md truncate">{a.title}</TableCell>
              <TableCell>{a.category}</TableCell>
              <TableCell className="text-xs">
                {a.is_step ? `Step ${a.step_position}` : a.feature_on_homepage ? "Featured" : "Latest only"}
              </TableCell>
              <TableCell>{a.view_count}</TableCell>
              <TableCell>{a.like_count}</TableCell>
              <TableCell>{a.published ? "✓" : "—"}</TableCell>
              <TableCell><Switch checked={a.is_active} onCheckedChange={() => toggleActive(a)} /></TableCell>
              <TableCell className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => window.open(`/post/${a.slug}`, "_blank")}><ExternalLink className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => edit(a)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del(a.id)}><Trash2 className="w-4 h-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
