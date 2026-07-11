import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";

const SLOTS = ["hero","step","mosaic_big","mosaic_side","latest","mini","featured"] as const;

type Article = any;

const empty = {
  slug: "", title: "", lead: "", category: "Finance", hero_image: "", body_html: "",
  author_name: "Editorial Team", author_avatar: "https://i.pravatar.cc/96?img=1",
  read_minutes: 5, layout_slot: "latest", sort_order: 0, is_trending: false, published: true,
};

export default function Articles() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Article | null>(null);
  const [open, setOpen] = useState(false);

  const { data: articles = [] } = useQuery({
    queryKey: ["adm-articles"],
    queryFn: async () => {
      const { data } = await supabase.from("articles").select("*").order("published_at", { ascending: false });
      return data || [];
    },
  });

  const save = async () => {
    if (!editing) return;
    const payload = { ...editing };
    delete payload.profiles;
    const { id, created_at, updated_at, view_count, like_count, ...rest } = payload;
    if (id) {
      const { error } = await supabase.from("articles").update(rest).eq("id", id);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("articles").insert(rest);
      if (error) return toast.error(error.message);
      toast.success("Created");
    }
    setOpen(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["adm-articles"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete article?")) return;
    await supabase.from("articles").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["adm-articles"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Articles</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ ...empty })}><Plus className="w-4 h-4 mr-2" />New Article</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} Article</DialogTitle></DialogHeader>
            {editing && (
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Slug</Label><Input value={editing.slug} onChange={e => setEditing({ ...editing, slug: e.target.value })} /></div>
                  <div><Label>Category</Label><Input value={editing.category || ""} onChange={e => setEditing({ ...editing, category: e.target.value })} /></div>
                </div>
                <div><Label>Title</Label><Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} /></div>
                <div><Label>Lead</Label><Textarea rows={2} value={editing.lead || ""} onChange={e => setEditing({ ...editing, lead: e.target.value })} /></div>
                <div><Label>Hero Image URL</Label><Input value={editing.hero_image || ""} onChange={e => setEditing({ ...editing, hero_image: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Author name</Label><Input value={editing.author_name || ""} onChange={e => setEditing({ ...editing, author_name: e.target.value })} /></div>
                  <div><Label>Author avatar</Label><Input value={editing.author_avatar || ""} onChange={e => setEditing({ ...editing, author_avatar: e.target.value })} /></div>
                  <div><Label>Read minutes</Label><Input type="number" value={editing.read_minutes || 5} onChange={e => setEditing({ ...editing, read_minutes: +e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <Label>Layout slot</Label>
                    <Select value={editing.layout_slot} onValueChange={v => setEditing({ ...editing, layout_slot: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Sort order</Label><Input type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: +e.target.value })} /></div>
                  <div className="flex items-center gap-2 pb-2"><Switch checked={editing.published} onCheckedChange={v => setEditing({ ...editing, published: v })} /><Label>Published</Label></div>
                </div>
                <div><Label>Body HTML</Label><Textarea rows={12} value={editing.body_html || ""} onChange={e => setEditing({ ...editing, body_html: e.target.value })} /></div>
                <Button onClick={save}>Save</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Slot</TableHead><TableHead>Category</TableHead><TableHead>Views</TableHead><TableHead>Likes</TableHead><TableHead>Published</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {articles.map((a: any) => (
            <TableRow key={a.id}>
              <TableCell className="max-w-md truncate">{a.title}</TableCell>
              <TableCell>{a.layout_slot}</TableCell>
              <TableCell>{a.category}</TableCell>
              <TableCell>{a.view_count}</TableCell>
              <TableCell>{a.like_count}</TableCell>
              <TableCell>{a.published ? "✓" : "—"}</TableCell>
              <TableCell className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => del(a.id)}><Trash2 className="w-4 h-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
