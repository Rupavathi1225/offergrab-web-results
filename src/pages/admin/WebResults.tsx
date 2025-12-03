import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, Edit2, X, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { countries } from "@/lib/countries";

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
}

const WebResults = () => {
  const [results, setResults] = useState<WebResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingResult, setEditingResult] = useState<WebResult | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedWr, setSelectedWr] = useState<number>(0);

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
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('web_results')
        .select('*')
        .order('wr_page', { ascending: true })
        .order('serial_number', { ascending: true });

      if (error) throw error;
      if (data) setResults(data);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
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
      fetchResults();
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
      fetchResults();
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

  const filteredResults = selectedWr === 0 
    ? results 
    : results.filter(r => r.wr_page === selectedWr);

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

      {/* Add New */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Add New Result</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Name</label>
            <Input
              value={newResult.name}
              onChange={(e) => setNewResult({ ...newResult, name: e.target.value })}
              className="admin-input"
              placeholder="e.g., Example Site"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Link</label>
            <Input
              value={newResult.link}
              onChange={(e) => setNewResult({ ...newResult, link: e.target.value })}
              className="admin-input"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Title</label>
            <Input
              value={newResult.title}
              onChange={(e) => setNewResult({ ...newResult, title: e.target.value })}
              className="admin-input"
              placeholder="Result title"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Logo URL (optional)</label>
            <Input
              value={newResult.logo_url || ''}
              onChange={(e) => setNewResult({ ...newResult, logo_url: e.target.value })}
              className="admin-input"
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-muted-foreground mb-1">Description</label>
            <Textarea
              value={newResult.description || ''}
              onChange={(e) => setNewResult({ ...newResult, description: e.target.value })}
              className="admin-input"
              placeholder="Result description"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Web Result Page</label>
            <Select 
              value={String(newResult.wr_page)} 
              onValueChange={(v) => setNewResult({ ...newResult, wr_page: parseInt(v) })}
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
            <label className="block text-sm text-muted-foreground mb-1">Serial Number</label>
            <Input
              type="number"
              value={newResult.serial_number}
              onChange={(e) => setNewResult({ ...newResult, serial_number: parseInt(e.target.value) || 1 })}
              className="admin-input"
              min={1}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={newResult.is_sponsored}
              onCheckedChange={(checked) => setNewResult({ ...newResult, is_sponsored: !!checked })}
            />
            <label className="text-sm text-muted-foreground">Sponsored</label>
          </div>
        </div>
        <Button onClick={handleAdd} className="mt-4">
          <Plus className="w-4 h-4 mr-2" /> Add Result
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-muted-foreground">Filter by page:</label>
        <Select value={String(selectedWr)} onValueChange={(v) => setSelectedWr(parseInt(v))}>
          <SelectTrigger className="admin-input w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">All</SelectItem>
            {[1, 2, 3, 4, 5].map(n => (
              <SelectItem key={n} value={String(n)}>wr={n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Existing Results */}
      <div className="glass-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Existing Results ({filteredResults.length})</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Title</th>
                <th>Page</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result) => (
                <tr key={result.id}>
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
                    </div>
                  </td>
                  <td className="max-w-xs truncate">{result.title}</td>
                  <td><span className="badge-primary">wr={result.wr_page}</span></td>
                  <td>
                    {result.is_active ? (
                      <span className="badge-success">Active</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Hidden</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
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
              ))}
            </tbody>
          </table>

          {filteredResults.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No results yet.</p>
          )}
        </div>
      </div>

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
                <label className="block text-sm text-muted-foreground mb-2">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Allowed Countries
                </label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-secondary/30 rounded-lg">
                  {countries.map(country => (
                    <label key={country.code} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={editingResult.allowed_countries?.includes(country.code)}
                        onCheckedChange={() => toggleCountry(country.code, editingResult, setEditingResult)}
                      />
                      <span className="truncate">{country.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
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
