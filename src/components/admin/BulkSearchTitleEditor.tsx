import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle, Loader2, Link2, PlusCircle, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from "xlsx";

interface ParsedRow {
  rowIndex: number;
  old_title: string;
  new_title: string;
}

interface MatchedRow {
  rowIndex: number;
  searchId: string | null;
  currentTitle: string;
  newTitle: string;
  blogName: string;
  status: 'matched' | 'not_found' | 'error';
  errorMessage?: string;
  selected: boolean;
}

interface RelatedSearch {
  id: string;
  title: string;
  blog_id: string | null;
}

interface Blog {
  id: string;
  title: string;
}

interface BulkSearchTitleEditorProps {
  onClose: () => void;
  onSuccess: () => void;
}

const BulkSearchTitleEditor = ({ onClose, onSuccess }: BulkSearchTitleEditorProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<{ success: number; failed: number } | null>(null);
  
  // Manual entry state
  const [manualOldTitle, setManualOldTitle] = useState("");
  const [manualNewTitle, setManualNewTitle] = useState("");
  const [isManualMatching, setIsManualMatching] = useState(false);

  // Blog map for display
  const [blogMap, setBlogMap] = useState<Map<string, string>>(new Map());

  const validateFile = (file: File): boolean => {
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(extension)) {
      setParseError(`Invalid file format. Please upload a CSV or XLSX file.`);
      return false;
    }
    
    if (file.size === 0) {
      setParseError(`File is empty. Please upload a valid file.`);
      return false;
    }
    
    return true;
  };

  const parseFile = async (file: File): Promise<ParsedRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
          
          if (jsonData.length < 2) {
            reject(new Error('File must contain a header row and at least one data row.'));
            return;
          }
          
          // Auto-detect header row by searching for required columns
          let headerRowIndex = -1;
          let headers: string[] = [];
          
          for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
            const row = jsonData[i];
            if (!row) continue;
            const rowHeaders = row.map(h => String(h || '').toLowerCase().trim().replace(/[,;:]+$/, ''));
            const hasOldTitle = rowHeaders.some(h => h === 'old_title' || h === 'oldtitle' || h === 'old title');
            const hasNewTitle = rowHeaders.some(h => h === 'new_title' || h === 'newtitle' || h === 'new title');
            
            if (hasOldTitle && hasNewTitle) {
              headerRowIndex = i;
              headers = rowHeaders;
              break;
            }
          }
          
          if (headerRowIndex === -1) {
            reject(new Error('File must contain "old_title" and "new_title" columns. Headers can be in any of the first 10 rows.'));
            return;
          }
          
          const oldTitleIndex = headers.findIndex(h => h === 'old_title' || h === 'oldtitle' || h === 'old title');
          const newTitleIndex = headers.findIndex(h => h === 'new_title' || h === 'newtitle' || h === 'new title');
          
          const rows: ParsedRow[] = [];
          
          for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0 || row.every(cell => !cell)) continue;
            
            const oldTitle = String(row[oldTitleIndex] || '').trim();
            const newTitle = String(row[newTitleIndex] || '').trim();
            
            if (oldTitle && newTitle) {
              rows.push({
                rowIndex: i,
                old_title: oldTitle,
                new_title: newTitle,
              });
            }
          }
          
          if (rows.length === 0) {
            reject(new Error('No valid data rows found in the file.'));
            return;
          }
          
          resolve(rows);
        } catch (error) {
          reject(new Error('Failed to parse file. Please ensure it is a valid CSV or XLSX file.'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsBinaryString(file);
    });
  };

  const fetchBlogsMap = async (): Promise<Map<string, string>> => {
    const { data: blogs } = await supabase
      .from('blogs')
      .select('id, title');
    
    const map = new Map<string, string>();
    (blogs || []).forEach(b => map.set(b.id, b.title));
    setBlogMap(map);
    return map;
  };

  const matchRows = async (parsedRows: ParsedRow[]): Promise<MatchedRow[]> => {
    // Fetch all related searches
    const { data: searches, error } = await supabase
      .from('related_searches')
      .select('id, title, blog_id');
    
    if (error) {
      throw new Error('Failed to fetch related searches from database.');
    }
    
    const blogsMap = await fetchBlogsMap();
    
    // Create a map of lowercase titles to searches
    const titleMap = new Map<string, RelatedSearch>();
    (searches || []).forEach(s => {
      titleMap.set(s.title.toLowerCase(), s as RelatedSearch);
    });
    
    return parsedRows.map(row => {
      const matchedSearch = titleMap.get(row.old_title.toLowerCase());
      
      if (matchedSearch) {
        return {
          rowIndex: row.rowIndex,
          searchId: matchedSearch.id,
          currentTitle: matchedSearch.title,
          newTitle: row.new_title,
          blogName: matchedSearch.blog_id ? (blogsMap.get(matchedSearch.blog_id) || 'Unknown') : 'No Blog',
          status: 'matched' as const,
          selected: true,
        };
      } else {
        return {
          rowIndex: row.rowIndex,
          searchId: null,
          currentTitle: row.old_title,
          newTitle: row.new_title,
          blogName: '-',
          status: 'not_found' as const,
          errorMessage: 'No matching related search found',
          selected: false,
        };
      }
    });
  };

  const processData = useCallback(async (parsed: ParsedRow[], source: string) => {
    setParsedRows(parsed);
    const matched = await matchRows(parsed);
    setMatchedRows(matched);
    
    toast({
      title: `${source} Parsed Successfully`,
      description: `Found ${matched.length} rows. ${matched.filter(r => r.status === 'matched').length} matched, ${matched.filter(r => r.status === 'not_found').length} not found.`,
    });
  }, [toast]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    
    if (!validateFile(selectedFile)) return;
    
    setFile(selectedFile);
    setIsLoading(true);
    setParseError(null);
    setApplyResult(null);
    
    try {
      const parsed = await parseFile(selectedFile);
      await processData(parsed, "File");
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to parse file.');
      setMatchedRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSheetImport = async () => {
    if (!sheetUrl.trim()) {
      setParseError("Please enter a Google Sheet URL.");
      return;
    }
    
    setIsLoading(true);
    setParseError(null);
    setApplyResult(null);
    
    try {
      // Extract sheet ID and gid from URL
      const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!sheetIdMatch) {
        throw new Error('Invalid Google Sheet URL. Please use a valid sharing link.');
      }
      
      const sheetId = sheetIdMatch[1];
      
      // Extract gid parameter if present
      const gidMatch = sheetUrl.match(/[?&]gid=(\d+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      
      // Fetch sheet as CSV
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      const response = await fetch(csvUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch Google Sheet. Make sure the sheet is set to "Anyone with the link can view".');
      }
      
      const csvText = await response.text();
      
      // Parse CSV manually
      const lines = csvText.split('\n').map(line => {
        const cells: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cells.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        cells.push(current.trim());
        return cells;
      });
      
      if (lines.length < 2) {
        throw new Error('Sheet must contain a header row and at least one data row.');
      }
      
      // Find header row
      let headerRowIndex = -1;
      let headers: string[] = [];
      
      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const row = lines[i];
        if (!row) continue;
        const rowHeaders = row.map(h => String(h || '').toLowerCase().trim());
        const hasOldTitle = rowHeaders.some(h => h === 'old_title' || h === 'oldtitle' || h === 'old title');
        const hasNewTitle = rowHeaders.some(h => h === 'new_title' || h === 'newtitle' || h === 'new title');
        
        if (hasOldTitle && hasNewTitle) {
          headerRowIndex = i;
          headers = rowHeaders;
          break;
        }
      }
      
      if (headerRowIndex === -1) {
        throw new Error('Sheet must contain "old_title" and "new_title" columns.');
      }
      
      const oldTitleIndex = headers.findIndex(h => h === 'old_title' || h === 'oldtitle' || h === 'old title');
      const newTitleIndex = headers.findIndex(h => h === 'new_title' || h === 'newtitle' || h === 'new title');
      
      const rows: ParsedRow[] = [];
      
      for (let i = headerRowIndex + 1; i < lines.length; i++) {
        const row = lines[i];
        if (!row || row.every(cell => !cell)) continue;
        
        const oldTitle = String(row[oldTitleIndex] || '').trim();
        const newTitle = String(row[newTitleIndex] || '').trim();
        
        if (oldTitle && newTitle) {
          rows.push({
            rowIndex: i,
            old_title: oldTitle,
            new_title: newTitle,
          });
        }
      }
      
      if (rows.length === 0) {
        throw new Error('No valid data rows found in the sheet.');
      }
      
      await processData(rows, "Google Sheet");
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to import sheet.');
      setMatchedRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualAdd = async () => {
    if (!manualOldTitle.trim() || !manualNewTitle.trim()) {
      toast({
        title: "Missing Fields",
        description: "Please enter both old title and new title.",
        variant: "destructive",
      });
      return;
    }
    
    setIsManualMatching(true);
    
    try {
      // Search for matching related search
      const { data: searches, error } = await supabase
        .from('related_searches')
        .select('id, title, blog_id')
        .ilike('title', `%${manualOldTitle.trim()}%`);
      
      if (error) throw error;
      
      const blogsMap = blogMap.size > 0 ? blogMap : await fetchBlogsMap();
      
      if (!searches || searches.length === 0) {
        toast({
          title: "No Match Found",
          description: `No related search found matching "${manualOldTitle}".`,
          variant: "destructive",
        });
        return;
      }
      
      if (searches.length > 1) {
        toast({
          title: "Multiple Matches",
          description: `Found ${searches.length} matches. Please use a more specific title.`,
          variant: "destructive",
        });
        return;
      }
      
      const search = searches[0];
      
      // Check if already in matched rows
      if (matchedRows.some(r => r.searchId === search.id)) {
        toast({
          title: "Already Added",
          description: "This related search is already in the list.",
          variant: "destructive",
        });
        return;
      }
      
      const newRow: MatchedRow = {
        rowIndex: matchedRows.length + 1,
        searchId: search.id,
        currentTitle: search.title,
        newTitle: manualNewTitle.trim(),
        blogName: search.blog_id ? (blogsMap.get(search.blog_id) || 'Unknown') : 'No Blog',
        status: 'matched',
        selected: true,
      };
      
      setMatchedRows([...matchedRows, newRow]);
      setManualOldTitle("");
      setManualNewTitle("");
      
      toast({
        title: "Added",
        description: `"${search.title}" → "${manualNewTitle.trim()}"`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search for related search.",
        variant: "destructive",
      });
    } finally {
      setIsManualMatching(false);
    }
  };

  const toggleRowSelection = (rowIndex: number) => {
    setMatchedRows(prev => prev.map(row => 
      row.rowIndex === rowIndex ? { ...row, selected: !row.selected } : row
    ));
  };

  const toggleSelectAll = (checked: boolean) => {
    setMatchedRows(prev => prev.map(row => 
      row.status === 'matched' ? { ...row, selected: checked } : row
    ));
  };

  const handleApplyChanges = async () => {
    const selectedRows = matchedRows.filter(r => r.selected && r.status === 'matched');
    
    if (selectedRows.length === 0) {
      toast({
        title: "No Changes Selected",
        description: "Please select at least one row to apply changes.",
        variant: "destructive",
      });
      return;
    }
    
    setIsApplying(true);
    let successCount = 0;
    let failCount = 0;
    
    for (const row of selectedRows) {
      try {
        const { error } = await supabase
          .from('related_searches')
          .update({ title: row.newTitle })
          .eq('id', row.searchId);
        
        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error('Failed to update:', row, error);
        failCount++;
      }
    }
    
    setApplyResult({ success: successCount, failed: failCount });
    setIsApplying(false);
    
    if (successCount > 0) {
      toast({
        title: "Changes Applied",
        description: `Successfully updated ${successCount} titles.${failCount > 0 ? ` ${failCount} failed.` : ''}`,
      });
      onSuccess();
    }
  };

  const clearData = () => {
    setFile(null);
    setSheetUrl("");
    setParsedRows([]);
    setMatchedRows([]);
    setParseError(null);
    setApplyResult(null);
  };

  const matchedCount = matchedRows.filter(r => r.status === 'matched').length;
  const selectedCount = matchedRows.filter(r => r.selected && r.status === 'matched').length;

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Bulk Title Editor</h2>
          <p className="text-muted-foreground text-sm">Update multiple related search titles at once</p>
        </div>
      </div>

      {/* Import Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import Data</CardTitle>
          <CardDescription>
            Upload a file or import from Google Sheets. Required columns: <code className="bg-muted px-1 rounded">old_title</code> and <code className="bg-muted px-1 rounded">new_title</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="file" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="sheet" className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Google Sheet
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                Manual Entry
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="mt-4">
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="max-w-md"
                />
                {file && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <FileSpreadsheet className="w-3 h-3" />
                    {file.name}
                  </Badge>
                )}
              </div>
            </TabsContent>

            <TabsContent value="sheet" className="mt-4">
              <div className="flex items-center gap-4">
                <Input
                  type="text"
                  placeholder="Paste Google Sheet URL..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  disabled={isLoading}
                  className="max-w-lg"
                />
                <Button onClick={handleSheetImport} disabled={isLoading || !sheetUrl.trim()}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                  Import
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Sheet must be set to "Anyone with the link can view"
              </p>
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Old Title (search)</label>
                  <Input
                    placeholder="Current title to find..."
                    value={manualOldTitle}
                    onChange={(e) => setManualOldTitle(e.target.value)}
                    disabled={isManualMatching}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">New Title</label>
                  <Input
                    placeholder="New title to set..."
                    value={manualNewTitle}
                    onChange={(e) => setManualNewTitle(e.target.value)}
                    disabled={isManualMatching}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleManualAdd} disabled={isManualMatching || !manualOldTitle.trim() || !manualNewTitle.trim()}>
                    {isManualMatching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PlusCircle className="w-4 h-4 mr-2" />}
                    Add
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {parseError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {applyResult && (
        <Alert variant={applyResult.failed > 0 ? "destructive" : "default"} className={applyResult.failed === 0 ? "border-primary bg-primary/10" : ""}>
          {applyResult.failed > 0 ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-primary" />}
          <AlertTitle>{applyResult.failed > 0 ? 'Partial Success' : 'Success!'}</AlertTitle>
          <AlertDescription>
            Updated {applyResult.success} titles successfully.
            {applyResult.failed > 0 && ` ${applyResult.failed} updates failed.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Preview Table */}
      {matchedRows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Preview Changes</CardTitle>
              <CardDescription>
                {matchedCount} matched, {selectedCount} selected for update
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearData}>
                Clear
              </Button>
              <Button onClick={handleApplyChanges} disabled={isApplying || selectedCount === 0}>
                {isApplying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Apply {selectedCount} Changes
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={matchedCount > 0 && selectedCount === matchedCount}
                        onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                      />
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Blog</TableHead>
                    <TableHead>Current Title</TableHead>
                    <TableHead>→</TableHead>
                    <TableHead>New Title</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchedRows.map((row) => (
                    <TableRow key={row.rowIndex} className={row.status === 'not_found' ? 'bg-destructive/5' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={row.selected}
                          disabled={row.status !== 'matched'}
                          onCheckedChange={() => toggleRowSelection(row.rowIndex)}
                        />
                      </TableCell>
                      <TableCell>
                        {row.status === 'matched' ? (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Matched
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            Not Found
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate" title={row.blogName}>
                        {row.blogName}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate" title={row.currentTitle}>
                        {row.currentTitle}
                      </TableCell>
                      <TableCell className="text-muted-foreground">→</TableCell>
                      <TableCell className="text-primary max-w-[200px] truncate" title={row.newTitle}>
                        {row.newTitle}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {matchedRows.length === 0 && !isLoading && !parseError && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Data Imported</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Upload a CSV/XLSX file, import from Google Sheets, or add entries manually.
              Your sheet should have <code className="bg-muted px-1 rounded">old_title</code> and <code className="bg-muted px-1 rounded">new_title</code> columns.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Processing...</h3>
            <p className="text-muted-foreground text-sm">Parsing and matching data</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkSearchTitleEditor;
