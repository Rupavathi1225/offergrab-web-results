import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";

export default function Subscribers() {
  const { data = [] } = useQuery({
    queryKey: ["adm-subs"],
    queryFn: async () => {
      const { data } = await supabase.from("newsletter_subscribers").select("*").order("subscribed_at", { ascending: false }).limit(5000);
      return data || [];
    },
  });
  const exportCsv = () => {
    const rows = ["email,source,subscribed_at,is_active", ...data.map((r: any) => `${r.email},${r.source||""},${r.subscribed_at},${r.is_active}`)].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "subscribers.csv";
    a.click();
  };
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Subscribers ({data.length})</h2>
        <Button onClick={exportCsv}><Download className="w-4 h-4 mr-2" />Export CSV</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Source</TableHead><TableHead>Date</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
        <TableBody>
          {data.map((s: any) => (
            <TableRow key={s.id}>
              <TableCell>{s.email}</TableCell>
              <TableCell>{s.source}</TableCell>
              <TableCell className="text-xs">{new Date(s.subscribed_at).toLocaleString()}</TableCell>
              <TableCell>{s.is_active ? "✓" : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
