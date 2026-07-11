import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, EyeOff, Eye } from "lucide-react";

export default function AdminComments() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["adm-comments"],
    queryFn: async () => {
      const { data } = await supabase.from("comments").select("*, articles(title, slug), profiles(display_name)").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
  });
  const toggle = async (id: string, is_hidden: boolean) => {
    await supabase.from("comments").update({ is_hidden: !is_hidden }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["adm-comments"] });
  };
  const del = async (id: string) => {
    if (!confirm("Delete comment?")) return;
    await supabase.from("comments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["adm-comments"] });
  };
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Comments ({data.length})</h2>
      <Table>
        <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Author</TableHead><TableHead>Article</TableHead><TableHead>Body</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {data.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell className="text-xs">{new Date(c.created_at).toLocaleString()}</TableCell>
              <TableCell>{c.profiles?.display_name || "—"}</TableCell>
              <TableCell className="text-xs max-w-xs truncate">{c.articles?.title}</TableCell>
              <TableCell className="max-w-md text-sm">{c.body}</TableCell>
              <TableCell>{c.is_hidden ? "Hidden" : "Visible"}</TableCell>
              <TableCell className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => toggle(c.id, c.is_hidden)}>{c.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</Button>
                <Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="w-4 h-4" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
