import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle, Loader2, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from "xlsx";

interface ParsedRow {
  rowIndex: number;
  web_result_id?: string;
  old_url?: string;
  new_title: string;
  new_url: string;
}

interface MatchedRow {
  rowIndex: number;
  webResultId: string | null;
  currentTitle: string;
  currentUrl: string;
  newTitle: string;
  newUrl: string;
  status: 'matched' | 'not_found' | 'error';
  errorMessage?: string;
  selected: boolean;
}

interface WebResult {
  id: string;
  title: string;
  link: string;
}

const BulkWebResultEditor = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<{ success: number; failed: number } | null>(null);

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
            const rowHeaders = row.map(h => String(h || '').toLowerCase().trim());
            const hasNewTitle = rowHeaders.some(h => h === 'new_title');
            const hasNewUrl = rowHeaders.some(h => h === 'new_url');
            
            if (hasNewTitle && hasNewUrl) {
              headerRowIndex = i;
              headers = rowHeaders;
              break;
            }
          }
          
          if (headerRowIndex === -1) {
            reject(new Error('File must contain "new_title" and "new_url" columns. Headers can be in any of the first 10 rows.'));
            return;
          }
          
          // Check for required columns
          const newTitleIndex = headers.findIndex(h => h === 'new_title');
          const newUrlIndex = headers.findIndex(h => h === 'new_url');
          
          // Check for matching columns
          const webResultIdIndex = headers.findIndex(h => h === 'web_result_id');
          const oldUrlIndex = headers.findIndex(h => h === 'old_url' || h === 'url_link' || h === 'original_link');
          
          if (webResultIdIndex === -1 && oldUrlIndex === -1) {
            reject(new Error('File must contain either "web_result_id" or "old_url" (or "url_link" / "original_link") column for matching.'));
            return;
          }
          
          const rows: ParsedRow[] = [];
          
          for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0 || row.every(cell => !cell)) continue;
            
            const parsedRow: ParsedRow = {
              rowIndex: i,
              new_title: String(row[newTitleIndex] || '').trim(),
              new_url: String(row[newUrlIndex] || '').trim(),
            };
            
            if (webResultIdIndex !== -1 && row[webResultIdIndex]) {
              parsedRow.web_result_id = String(row[webResultIdIndex]).trim();
            }
            
            if (oldUrlIndex !== -1 && row[oldUrlIndex]) {
              parsedRow.old_url = String(row[oldUrlIndex]).trim();
            }
            
            if (parsedRow.new_title && parsedRow.new_url) {
              rows.push(parsedRow);
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

  const matchRows = async (parsedRows: ParsedRow[]): Promise<MatchedRow[]> => {
    // Fetch all web results
    const { data: webResults, error } = await supabase
      .from('web_results')
      .select('id, title, link');
    
    if (error) {
      throw new Error('Failed to fetch web results from database.');
    }
    
    const webResultsMap = new Map<string, WebResult>();
    const urlMap = new Map<string, WebResult>();
    
    (webResults || []).forEach(wr => {
      webResultsMap.set(wr.id, wr);
      urlMap.set(wr.link.toLowerCase(), wr);
    });
    
    return parsedRows.map(row => {
      let matchedResult: WebResult | undefined;
      
      // Priority 1: Match by web_result_id
      if (row.web_result_id) {
        matchedResult = webResultsMap.get(row.web_result_id);
      }
      
      // Priority 2: Match by old_url
      if (!matchedResult && row.old_url) {
        matchedResult = urlMap.get(row.old_url.toLowerCase());
      }
      
      if (matchedResult) {
        return {
          rowIndex: row.rowIndex,
          webResultId: matchedResult.id,
          currentTitle: matchedResult.title,
          currentUrl: matchedResult.link,
          newTitle: row.new_title,
          newUrl: row.new_url,
          status: 'matched' as const,
          selected: false,
        };
      } else {
        return {
          rowIndex: row.rowIndex,
          webResultId: null,
          currentTitle: '-',
          currentUrl: row.old_url || row.web_result_id || '-',
          newTitle: row.new_title,
          newUrl: row.new_url,
          status: 'not_found' as const,
          errorMessage: 'No matching web result found',
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

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setSheetUrl("");
    setParseError(null);
    setApplyResult(null);
    setMatchedRows([]);
    
    if (!validateFile(selectedFile)) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const parsed = await parseFile(selectedFile);
      await processData(parsed, "File");
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Unknown error occurred');
      toast({
        title: "Parse Error",
        description: error instanceof Error ? error.message : 'Failed to parse file',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, processData]);

  const extractSheetId = (url: string): string | null => {
    // Match patterns like:
    // https://docs.google.com/spreadsheets/d/SHEET_ID/edit
    // https://docs.google.com/spreadsheets/d/SHEET_ID/
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const handleGoogleSheetImport = useCallback(async () => {
    if (!sheetUrl.trim()) {
      setParseError("Please enter a Google Sheet URL");
      return;
    }

    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      setParseError("Invalid Google Sheet URL. Please use a link like: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit");
      return;
    }

    setFile(null);
    setParseError(null);
    setApplyResult(null);
    setMatchedRows([]);
    setIsLoading(true);

    try {
      // Fetch as CSV from public export URL
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const response = await fetch(csvUrl);
      
      if (!response.ok) {
        throw new Error("Failed to fetch Google Sheet. Make sure the sheet is publicly accessible (Anyone with the link can view).");
      }

      const csvText = await response.text();
      
      if (!csvText.trim()) {
        throw new Error("Google Sheet is empty.");
      }

      // Parse CSV using XLSX
      const workbook = XLSX.read(csvText, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

      if (jsonData.length < 2) {
        throw new Error('Sheet must contain a header row and at least one data row.');
      }

      // Auto-detect header row by searching for required columns
      let headerRowIndex = -1;
      let headers: string[] = [];
      
      for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
        const row = jsonData[i];
        if (!row) continue;
        const rowHeaders = row.map(h => String(h || '').toLowerCase().trim());
        const hasNewTitle = rowHeaders.some(h => h === 'new_title');
        const hasNewUrl = rowHeaders.some(h => h === 'new_url');
        
        if (hasNewTitle && hasNewUrl) {
          headerRowIndex = i;
          headers = rowHeaders;
          break;
        }
      }
      
      if (headerRowIndex === -1) {
        throw new Error('Sheet must contain "new_title" and "new_url" columns. Headers can be in any of the first 10 rows.');
      }
      
      // Check for required columns
      const newTitleIndex = headers.findIndex(h => h === 'new_title');
      const newUrlIndex = headers.findIndex(h => h === 'new_url');
      
      // Check for matching columns
      const webResultIdIndex = headers.findIndex(h => h === 'web_result_id');
      const oldUrlIndex = headers.findIndex(h => h === 'old_url' || h === 'url_link' || h === 'original_link');
      
      if (webResultIdIndex === -1 && oldUrlIndex === -1) {
        throw new Error('Sheet must contain either "web_result_id" or "old_url" (or "url_link" / "original_link") column for matching.');
      }

      const rows: ParsedRow[] = [];
      
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0 || row.every(cell => !cell)) continue;
        
        const parsedRow: ParsedRow = {
          rowIndex: i,
          new_title: String(row[newTitleIndex] || '').trim(),
          new_url: String(row[newUrlIndex] || '').trim(),
        };
        
        if (webResultIdIndex !== -1 && row[webResultIdIndex]) {
          parsedRow.web_result_id = String(row[webResultIdIndex]).trim();
        }
        
        if (oldUrlIndex !== -1 && row[oldUrlIndex]) {
          parsedRow.old_url = String(row[oldUrlIndex]).trim();
        }
        
        if (parsedRow.new_title && parsedRow.new_url) {
          rows.push(parsedRow);
        }
      }

      if (rows.length === 0) {
        throw new Error('No valid data rows found in the sheet.');
      }

      await processData(rows, "Google Sheet");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import Google Sheet';
      setParseError(errorMessage);
      toast({
        title: "Import Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [sheetUrl, toast, processData]);

  const toggleRowSelection = (rowIndex: number) => {
    setMatchedRows(prev => prev.map(row => 
      row.rowIndex === rowIndex && row.status === 'matched'
        ? { ...row, selected: !row.selected }
        : row
    ));
  };

  const toggleSelectAll = () => {
    const matchedCount = matchedRows.filter(r => r.status === 'matched');
    const selectedCount = matchedCount.filter(r => r.selected).length;
    const shouldSelectAll = selectedCount < matchedCount.length;
    
    setMatchedRows(prev => prev.map(row => 
      row.status === 'matched'
        ? { ...row, selected: shouldSelectAll }
        : row
    ));
  };

  const applyChanges = async () => {
    const selectedRows = matchedRows.filter(r => r.selected && r.webResultId);
    
    if (selectedRows.length === 0) {
      toast({
        title: "No Rows Selected",
        description: "Please select at least one row to apply changes.",
        variant: "destructive",
      });
      return;
    }
    
    setIsApplying(true);
    let successCount = 0;
    let failedCount = 0;
    
    for (const row of selectedRows) {
      try {
        // First, save to history
        const { error: historyError } = await supabase
          .from('web_result_update_history')
          .insert({
            web_result_id: row.webResultId,
            old_title: row.currentTitle,
            old_url: row.currentUrl,
            new_title: row.newTitle,
            new_url: row.newUrl,
            updated_by: 'admin',
          });
        
        if (historyError) {
          console.error('History insert error:', historyError);
        }
        
        // Then update the web_result
        const { error: updateError } = await supabase
          .from('web_results')
          .update({
            title: row.newTitle,
            link: row.newUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.webResultId);
        
        if (updateError) {
          throw updateError;
        }
        
        successCount++;
        
        // Update row status
        setMatchedRows(prev => prev.map(r => 
          r.rowIndex === row.rowIndex
            ? { ...r, status: 'matched' as const, selected: false, currentTitle: row.newTitle, currentUrl: row.newUrl }
            : r
        ));
      } catch (error) {
        failedCount++;
        setMatchedRows(prev => prev.map(r => 
          r.rowIndex === row.rowIndex
            ? { ...r, status: 'error' as const, errorMessage: 'Update failed' }
            : r
        ));
      }
    }
    
    setApplyResult({ success: successCount, failed: failedCount });
    setIsApplying(false);
    
    if (successCount > 0) {
      toast({
        title: "Changes Applied",
        description: `${successCount} web results updated successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}.`,
      });
    } else {
      toast({
        title: "Update Failed",
        description: "No changes were applied. Please check the errors.",
        variant: "destructive",
      });
    }
  };

  const selectedCount = matchedRows.filter(r => r.selected).length;
  const matchedCount = matchedRows.filter(r => r.status === 'matched').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Web Result Editor
          </CardTitle>
          <CardDescription>
            Upload a CSV or XLSX file to bulk update web result titles and URLs with preview and rollback support.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Import Section with Tabs */}
          <Tabs defaultValue="file" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="google" className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Google Sheet
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="file" className="mt-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={isLoading}
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-10 h-10 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {file ? file.name : 'Click to upload CSV or XLSX file'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Required columns: new_title, new_url, and (web_result_id OR old_url)
                  </span>
                </label>
              </div>
            </TabsContent>
            
            <TabsContent value="google" className="mt-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="Paste Google Sheet URL here..."
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleGoogleSheetImport}
                    disabled={isLoading || !sheetUrl.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Import"
                    )}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>⚠️ The Google Sheet must be publicly accessible (Share → Anyone with the link can view)</p>
                  <p>Required columns: new_title, new_url, and (web_result_id OR old_url)</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Parsing and matching rows...</span>
            </div>
          )}
          
          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}
          
          {applyResult && (
            <Alert variant={applyResult.failed > 0 ? "destructive" : "default"}>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Update Complete</AlertTitle>
              <AlertDescription>
                {applyResult.success} web results updated successfully
                {applyResult.failed > 0 && `, ${applyResult.failed} failed`}.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Preview Table */}
      {matchedRows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview Changes</CardTitle>
                <CardDescription>
                  {matchedCount} matched, {matchedRows.length - matchedCount} not found. 
                  {selectedCount > 0 && ` ${selectedCount} selected for update.`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  disabled={matchedCount === 0}
                >
                  {selectedCount === matchedCount ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  onClick={applyChanges}
                  disabled={selectedCount === 0 || isApplying}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    `Apply Selected Changes (${selectedCount})`
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Apply</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead>Current Title</TableHead>
                    <TableHead>Current URL</TableHead>
                    <TableHead>New Title</TableHead>
                    <TableHead>New URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchedRows.map((row) => (
                    <TableRow 
                      key={row.rowIndex}
                      className={row.status === 'not_found' ? 'opacity-50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={row.selected}
                          onCheckedChange={() => toggleRowSelection(row.rowIndex)}
                          disabled={row.status !== 'matched'}
                        />
                      </TableCell>
                      <TableCell>
                        {row.status === 'matched' && (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Matched
                          </Badge>
                        )}
                        {row.status === 'not_found' && (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            Not Found
                          </Badge>
                        )}
                        {row.status === 'error' && (
                          <Badge variant="destructive">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Error
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-48 truncate" title={row.currentTitle}>
                        {row.currentTitle}
                      </TableCell>
                      <TableCell className="max-w-48 truncate" title={row.currentUrl}>
                        {row.currentUrl}
                      </TableCell>
                      <TableCell className="max-w-48 truncate font-medium text-primary" title={row.newTitle}>
                        {row.newTitle}
                      </TableCell>
                      <TableCell className="max-w-48 truncate font-medium text-primary" title={row.newUrl}>
                        {row.newUrl}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkWebResultEditor;