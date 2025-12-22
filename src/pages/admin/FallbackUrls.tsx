import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ArrowUp, ArrowDown, Link, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FallbackUrl {
  id: string;
  url: string;
  sequence_order: number;
  is_active: boolean;
  created_at: string;
}

const FallbackUrls = () => {
  const [newUrl, setNewUrl] = useState("");
  const queryClient = useQueryClient();

  const { data: urls, isLoading } = useQuery({
    queryKey: ["fallback-urls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fallback_urls")
        .select("*")
        .order("sequence_order", { ascending: true });
      
      if (error) throw error;
      return data as FallbackUrl[];
    },
  });

  const { data: tracker } = useQuery({
    queryKey: ["fallback-tracker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fallback_sequence_tracker")
        .select("*")
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const addUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      const maxOrder = urls?.length ? Math.max(...urls.map(u => u.sequence_order)) : 0;
      const { error } = await supabase
        .from("fallback_urls")
        .insert({ url, sequence_order: maxOrder + 1 });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fallback-urls"] });
      setNewUrl("");
      toast.success("URL added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add URL: " + error.message);
    },
  });

  const deleteUrlMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fallback_urls")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fallback-urls"] });
      toast.success("URL deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete URL: " + error.message);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      if (!urls) return;
      
      const currentIndex = urls.findIndex(u => u.id === id);
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      
      if (targetIndex < 0 || targetIndex >= urls.length) return;
      
      const currentUrl = urls[currentIndex];
      const targetUrl = urls[targetIndex];
      
      // Swap sequence orders
      await supabase
        .from("fallback_urls")
        .update({ sequence_order: targetUrl.sequence_order })
        .eq("id", currentUrl.id);
      
      await supabase
        .from("fallback_urls")
        .update({ sequence_order: currentUrl.sequence_order })
        .eq("id", targetUrl.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fallback-urls"] });
    },
    onError: (error) => {
      toast.error("Failed to reorder: " + error.message);
    },
  });

  const handleAddUrl = () => {
    if (!newUrl.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    
    try {
      new URL(newUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    
    addUrlMutation.mutate(newUrl.trim());
  };

  const resetSequenceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("fallback_sequence_tracker")
        .update({ current_index: 0 })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Update all rows
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fallback-tracker"] });
      toast.success("Sequence reset to beginning");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fallback URLs</h1>
          <p className="text-muted-foreground">
            Manage redirect URLs for country mismatch (FastMoney page)
          </p>
        </div>
        {tracker && (
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Current position: <span className="font-bold text-primary">{(tracker.current_index % (urls?.length || 1)) + 1}</span> of {urls?.length || 0}
            </div>
            <Button variant="outline" size="sm" onClick={() => resetSequenceMutation.mutate()}>
              Reset Sequence
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="https://example.com"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
              className="flex-1"
            />
            <Button onClick={handleAddUrl} disabled={addUrlMutation.isPending}>
              {addUrlMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add URL
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            URL Sequence ({urls?.length || 0} URLs)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : urls?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No URLs added yet. Add URLs above to enable sequential redirects.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-32 text-center">Reorder</TableHead>
                  <TableHead className="w-24 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urls?.map((url, index) => (
                  <TableRow 
                    key={url.id}
                    className={tracker && (tracker.current_index % urls.length) === index ? "bg-primary/10" : ""}
                  >
                    <TableCell className="font-mono text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-mono text-sm break-all">
                      {url.url}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => reorderMutation.mutate({ id: url.id, direction: "up" })}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => reorderMutation.mutate({ id: url.id, direction: "down" })}
                          disabled={index === urls.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteUrlMutation.mutate(url.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

export default FallbackUrls;
