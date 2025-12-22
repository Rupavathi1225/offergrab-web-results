import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle, Loader2, Link2, Sparkles, PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from "xlsx";
import { countries, getCountryName } from "@/lib/countries";

// Helper to get country code from name (case insensitive)
const getCountryCode = (nameOrCode: string): string | null => {
  const normalized = nameOrCode.toLowerCase().trim();
  const country = countries.find(c => 
    c.code.toLowerCase() === normalized || 
    c.name.toLowerCase() === normalized
  );
  return country?.code || null;
};

// Helper to get display names from allowed_countries
const getCountryDisplayNames = (allowedCountries: string[] | null | undefined): string => {
  if (!allowedCountries || allowedCountries.length === 0) return 'N/A';
  return allowedCountries.map(code => getCountryName(code)).join(', ');
};

interface ParsedRow {
  rowIndex: number;
  web_result_id?: string;
  old_url?: string;
  sheet_name?: string; // Name column from uploaded sheet for AI matching
  new_title: string;
  new_url: string;
  new_description?: string;
  new_country?: string; // Country column for updating allowed_countries
}

interface MatchedRow {
  rowIndex: number;
  webResultId: string | null;
  currentTitle: string;
  currentUrl: string;
  currentDescription: string;
  currentCountry: string;
  newTitle: string;
  newUrl: string;
  newDescription: string;
  newCountry: string;
  status: 'matched' | 'not_found' | 'error';
  errorMessage?: string;
  selected: boolean;
  confidenceScore?: number;
}

interface WebResult {
  id: string;
  name: string;
  title: string;
  link: string;
  description: string | null;
  allowed_countries: string[] | null;
}

interface AIMatch {
  original_web_result: string;
  matched_new_name: string;
  confidence_score: number;
}

const BulkWebResultEditor = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isAIMatching, setIsAIMatching] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<{ success: number; failed: number } | null>(null);
  
  // Manual entry state
  const [manualName, setManualName] = useState("");
  const [manualNewTitle, setManualNewTitle] = useState("");
  const [manualNewUrl, setManualNewUrl] = useState("");
  const [manualNewDescription, setManualNewDescription] = useState("");
  const [isManualMatching, setIsManualMatching] = useState(false);

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
            // Clean headers: lowercase, trim, and remove trailing punctuation
            const rowHeaders = row.map(h => String(h || '').toLowerCase().trim().replace(/[,;:]+$/, ''));
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
          const newDescriptionIndex = headers.findIndex(h => h === 'new_description' || h === 'web result description');
          const newCountryIndex = headers.findIndex(h => h === 'new_country' || h === 'country');
          
          // Check for matching columns - support multiple header variations
          const webResultIdIndex = headers.findIndex(h => h === 'web_result_id');
          const oldUrlIndex = headers.findIndex(h => 
            h === 'old_url' || 
            h === 'url_link' || 
            h === 'original_link' || 
            h === 'original link' ||
            h === 'link'
          );
          
          // Check for title-based matching (Web Result Title column)
          const webResultTitleIndex = headers.findIndex(h => h === 'web result title');
          
          // Check for Name column (for AI matching)
          const nameIndex = headers.findIndex(h => h === 'name');
          
          // At least one matching column required
          const hasMatchingColumn = webResultIdIndex !== -1 || oldUrlIndex !== -1 || nameIndex !== -1 || webResultTitleIndex !== -1;
          
          if (!hasMatchingColumn) {
            reject(new Error('File must contain either "web_result_id", "Original Link", "Web Result Title", or "Name" column for matching.'));
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
            
            if (newDescriptionIndex !== -1 && row[newDescriptionIndex]) {
              parsedRow.new_description = String(row[newDescriptionIndex]).trim();
            }
            
            if (newCountryIndex !== -1 && row[newCountryIndex]) {
              parsedRow.new_country = String(row[newCountryIndex]).trim();
            }
            
            if (webResultIdIndex !== -1 && row[webResultIdIndex]) {
              parsedRow.web_result_id = String(row[webResultIdIndex]).trim();
            }
            
            if (oldUrlIndex !== -1 && row[oldUrlIndex]) {
              parsedRow.old_url = String(row[oldUrlIndex]).trim();
            }
            
            // Extract Name column for AI matching
            if (nameIndex !== -1 && row[nameIndex]) {
              parsedRow.sheet_name = String(row[nameIndex]).trim();
            }
            
            // Also use Web Result Title as sheet_name if Name column not present
            if (!parsedRow.sheet_name && webResultTitleIndex !== -1 && row[webResultTitleIndex]) {
              parsedRow.sheet_name = String(row[webResultTitleIndex]).trim();
            }
            
            if (parsedRow.new_title || parsedRow.new_url || parsedRow.new_description) {
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
      .select('id, name, title, link, description, allowed_countries');
    
    if (error) {
      throw new Error('Failed to fetch web results from database.');
    }
    
    const webResultsMap = new Map<string, WebResult>();
    const urlMap = new Map<string, WebResult>();
    const nameMap = new Map<string, WebResult>();
    const titleMap = new Map<string, WebResult>();
    
    (webResults || []).forEach(wr => {
      webResultsMap.set(wr.id, wr as WebResult);
      urlMap.set(wr.link.toLowerCase(), wr as WebResult);
      nameMap.set(wr.name.toLowerCase(), wr as WebResult);
      titleMap.set(wr.title.toLowerCase(), wr as WebResult);
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
      
      // Priority 3: Match by sheet_name against name
      if (!matchedResult && row.sheet_name) {
        matchedResult = nameMap.get(row.sheet_name.toLowerCase());
      }
      
      // Priority 4: Match by sheet_name against title (for "Web Result Title" column)
      if (!matchedResult && row.sheet_name) {
        matchedResult = titleMap.get(row.sheet_name.toLowerCase());
      }
      
      if (matchedResult) {
        return {
          rowIndex: row.rowIndex,
          webResultId: matchedResult.id,
          currentTitle: matchedResult.title,
          currentUrl: matchedResult.link,
          currentDescription: matchedResult.description || '',
          currentCountry: getCountryDisplayNames(matchedResult.allowed_countries),
          newTitle: row.new_title,
          newUrl: row.new_url,
          newDescription: row.new_description || '',
          newCountry: row.new_country || '',
          status: 'matched' as const,
          selected: true, // Auto-select matched rows
        };
      } else {
        return {
          rowIndex: row.rowIndex,
          webResultId: null,
          currentTitle: '-',
          currentUrl: row.old_url || row.web_result_id || row.sheet_name || '-',
          currentDescription: '-',
          currentCountry: '-',
          newTitle: row.new_title,
          newUrl: row.new_url,
          newDescription: row.new_description || '',
          newCountry: row.new_country || '',
          status: 'not_found' as const,
          errorMessage: 'No matching web result found',
          selected: false,
        };
      }
    });
  };

  const matchRowsWithAI = async (parsedRows: ParsedRow[]): Promise<MatchedRow[]> => {
    // Fetch all web results
    const { data: webResults, error } = await supabase
      .from('web_results')
      .select('id, name, title, link, description, allowed_countries');
    
    if (error) {
      throw new Error('Failed to fetch web results from database.');
    }

    if (!webResults || webResults.length === 0) {
      throw new Error('No web results found in database.');
    }

    // Get original names (using 'name' field from web_results)
    const originalNames = webResults.map(wr => wr.name);
    
    // Get names from uploaded sheet (using sheet_name column, not new_title)
    const uploadedSheetNames = parsedRows.map(row => row.sheet_name).filter(Boolean) as string[];

    if (uploadedSheetNames.length === 0) {
      throw new Error('No "Name" column found in uploaded data. Please add a "Name" column to your sheet for AI matching.');
    }

    // Call AI matching function
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('match-web-results', {
      body: {
        original_web_results: originalNames,
        uploaded_new_names: uploadedSheetNames,
      },
    });

    if (aiError) {
      console.error('AI matching error:', aiError);
      throw new Error('AI matching failed. Please try again.');
    }

    if (aiResponse?.error) {
      throw new Error(aiResponse.error);
    }

    const aiMatches: AIMatch[] = aiResponse?.matches || [];

    // Create a map of original name to matched sheet name and confidence
    const matchMap = new Map<string, { sheetName: string; confidence: number }>();
    aiMatches.forEach(match => {
      if (match.matched_new_name !== "NO MATCH") {
        matchMap.set(match.original_web_result, {
          sheetName: match.matched_new_name,
          confidence: match.confidence_score,
        });
      }
    });

    // Create a map of sheet names to parsed rows (for new_title/URL/description lookup)
    const sheetNameToRowMap = new Map<string, ParsedRow>();
    parsedRows.forEach(row => {
      if (row.sheet_name) {
        sheetNameToRowMap.set(row.sheet_name, row);
      }
    });

    // Build matched rows
    return webResults.map((wr, index) => {
      const matchData = matchMap.get(wr.name);
      
      if (matchData) {
        const parsedRow = sheetNameToRowMap.get(matchData.sheetName);
        return {
          rowIndex: index,
          webResultId: wr.id,
          currentTitle: wr.title,
          currentUrl: wr.link,
          currentDescription: wr.description || '',
          currentCountry: getCountryDisplayNames((wr as any).allowed_countries),
          newTitle: parsedRow?.new_title || '',
          newUrl: parsedRow?.new_url || '',
          newDescription: parsedRow?.new_description || '',
          newCountry: parsedRow?.new_country || '',
          status: 'matched' as const,
          selected: true, // Auto-select all matched rows
          confidenceScore: matchData.confidence,
        };
      } else {
        return {
          rowIndex: index,
          webResultId: wr.id,
          currentTitle: wr.title,
          currentUrl: wr.link,
          currentDescription: wr.description || '',
          currentCountry: getCountryDisplayNames((wr as any).allowed_countries),
          newTitle: '',
          newUrl: '',
          newDescription: '',
          newCountry: '',
          status: 'not_found' as const,
          errorMessage: 'No matching name found in uploaded data',
          selected: false,
        };
      }
    }).filter(row => row.newTitle || row.status === 'not_found'); // Only show rows with matches or explicitly unmatched
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

  const handleAIMatching = useCallback(async () => {
    if (parsedRows.length === 0) {
      toast({
        title: "No Data",
        description: "Please upload a file or import a Google Sheet first.",
        variant: "destructive",
      });
      return;
    }

    setIsAIMatching(true);
    setParseError(null);

    try {
      const matched = await matchRowsWithAI(parsedRows);
      setMatchedRows(matched);
      
      const matchedCount = matched.filter(r => r.status === 'matched').length;
      
      toast({
        title: "AI Matching Complete",
        description: `Found ${matchedCount} matches. All matched rows are auto-selected.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'AI matching failed';
      setParseError(errorMessage);
      toast({
        title: "AI Matching Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAIMatching(false);
    }
  }, [parsedRows, toast]);

  const handleManualMatch = useCallback(async () => {
    if (!manualName.trim()) {
      toast({
        title: "Missing Name",
        description: "Please enter the web result name to match.",
        variant: "destructive",
      });
      return;
    }

    if (!manualNewTitle.trim() && !manualNewUrl.trim() && !manualNewDescription.trim()) {
      toast({
        title: "Missing Data",
        description: "Please enter at least one field to update (new title, URL, or description).",
        variant: "destructive",
      });
      return;
    }

    setIsManualMatching(true);
    setParseError(null);
    setApplyResult(null);

    try {
      // Fetch web result by name
      const { data: webResults, error } = await supabase
        .from('web_results')
        .select('id, name, title, link, description, allowed_countries')
        .ilike('name', manualName.trim());

      if (error) throw new Error('Failed to search web results.');

      if (!webResults || webResults.length === 0) {
        setParseError(`No web result found with name "${manualName}".`);
        toast({
          title: "No Match Found",
          description: `Could not find a web result with name "${manualName}".`,
          variant: "destructive",
        });
        return;
      }

      const wr = webResults[0];
      
      const newRow: MatchedRow = {
        rowIndex: Date.now(),
        webResultId: wr.id,
        currentTitle: wr.title,
        currentUrl: wr.link,
        currentDescription: wr.description || '',
        currentCountry: getCountryDisplayNames((wr as any).allowed_countries),
        newTitle: manualNewTitle.trim(),
        newUrl: manualNewUrl.trim(),
        newDescription: manualNewDescription.trim(),
        newCountry: '', // Manual entry doesn't support country yet
        status: 'matched',
        selected: true,
        confidenceScore: 100, // Manual match = 100% confidence
      };

      setMatchedRows(prev => [...prev.filter(r => r.webResultId !== wr.id), newRow]);
      
      // Clear form
      setManualName("");
      setManualNewTitle("");
      setManualNewUrl("");
      setManualNewDescription("");

      toast({
        title: "Match Found",
        description: `Found "${wr.name}" and added to preview. Click Apply to update.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Manual matching failed';
      setParseError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsManualMatching(false);
    }
  }, [manualName, manualNewTitle, manualNewUrl, manualNewDescription, toast]);

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
      // Fetch as CSV from public export URL with no-cors fallback
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      
      let csvText: string;
      try {
        const response = await fetch(csvUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/csv,application/csv,text/plain,*/*',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        csvText = await response.text();
      } catch (fetchError) {
        console.error('Direct fetch failed:', fetchError);
        throw new Error("Failed to fetch Google Sheet. Please ensure:\n1. The sheet is publicly accessible (Share → Anyone with the link can view)\n2. Try downloading as CSV and use 'Upload File' tab instead.");
      }
      
      if (!csvText.trim()) {
        throw new Error("Google Sheet is empty.");
      }

      // Check if we got an error page (HTML) instead of CSV
      if (csvText.includes('<!DOCTYPE html>') || csvText.includes('<html')) {
        throw new Error("Google Sheet is not publicly accessible. Please set sharing to 'Anyone with the link can view'.");
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
        // Clean headers: lowercase, trim, and remove trailing punctuation
        const rowHeaders = row.map(h => String(h || '').toLowerCase().trim().replace(/[,;:]+$/, ''));
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
      const newDescriptionIndex = headers.findIndex(h => h === 'new_description' || h === 'web result description');
      const newCountryIndex = headers.findIndex(h => h === 'new_country' || h === 'country');
      
      // Check for matching columns - support multiple header variations
      const webResultIdIndex = headers.findIndex(h => h === 'web_result_id');
      const oldUrlIndex = headers.findIndex(h => 
        h === 'old_url' || 
        h === 'url_link' || 
        h === 'original_link' || 
        h === 'original link' ||
        h === 'link'
      );
      
      // Check for title-based matching (Web Result Title column)
      const webResultTitleIndex = headers.findIndex(h => h === 'web result title');
      
      // Check for Name column (for AI matching)
      const nameIndex = headers.findIndex(h => h === 'name');
      
      // At least one matching column required
      const hasMatchingColumn = webResultIdIndex !== -1 || oldUrlIndex !== -1 || nameIndex !== -1 || webResultTitleIndex !== -1;
      
      if (!hasMatchingColumn) {
        throw new Error('Sheet must contain either "web_result_id", "original_link", "Web Result Title", or "Name" column for matching.');
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
        
        if (newDescriptionIndex !== -1 && row[newDescriptionIndex]) {
          parsedRow.new_description = String(row[newDescriptionIndex]).trim();
        }
        
        if (newCountryIndex !== -1 && row[newCountryIndex]) {
          parsedRow.new_country = String(row[newCountryIndex]).trim();
        }
        
        if (webResultIdIndex !== -1 && row[webResultIdIndex]) {
          parsedRow.web_result_id = String(row[webResultIdIndex]).trim();
        }
        
        if (oldUrlIndex !== -1 && row[oldUrlIndex]) {
          parsedRow.old_url = String(row[oldUrlIndex]).trim();
        }
        
        // Extract Name column for AI matching
        if (nameIndex !== -1 && row[nameIndex]) {
          parsedRow.sheet_name = String(row[nameIndex]).trim();
        }
        
        // Also use Web Result Title as sheet_name if Name column not present
        if (!parsedRow.sheet_name && webResultTitleIndex !== -1 && row[webResultTitleIndex]) {
          parsedRow.sheet_name = String(row[webResultTitleIndex]).trim();
        }
        
        if (parsedRow.new_title || parsedRow.new_url || parsedRow.new_description || parsedRow.new_country) {
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
        const updateData: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        
        if (row.newTitle) updateData.title = row.newTitle;
        if (row.newUrl) updateData.link = row.newUrl;
        if (row.newDescription) updateData.description = row.newDescription;
        
        // Handle country update - convert name to code if needed
        if (row.newCountry) {
          const countryCode = getCountryCode(row.newCountry);
          if (countryCode) {
            updateData.allowed_countries = [countryCode];
          }
        }
        
        const { error: updateError } = await supabase
          .from('web_results')
          .update(updateData)
          .eq('id', row.webResultId);
        
        if (updateError) {
          throw updateError;
        }
        
        successCount++;
        
        // Update row status
        setMatchedRows(prev => prev.map(r => 
          r.rowIndex === row.rowIndex
            ? { ...r, status: 'matched' as const, selected: false, currentTitle: row.newTitle || r.currentTitle, currentUrl: row.newUrl || r.currentUrl, currentCountry: row.newCountry || r.currentCountry }
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="google" className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Google Sheet
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                Manual Entry
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
                    Required columns: new_title, new_url, and (Name OR web_result_id OR old_url)
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
                  <p>Required columns: new_title, new_url, and (Name OR web_result_id OR original_link)</p>
                  <p>Optional: new_description (or "Web Result Description")</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Web Result Name *</label>
                    <Input
                      placeholder="Enter the exact web result name (e.g., TapTap)"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      disabled={isManualMatching}
                    />
                    <p className="text-xs text-muted-foreground">Must match exactly with the name in the database</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Title</label>
                    <Input
                      placeholder="Enter the new title"
                      value={manualNewTitle}
                      onChange={(e) => setManualNewTitle(e.target.value)}
                      disabled={isManualMatching}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New URL</label>
                    <Input
                      placeholder="Enter the new URL"
                      value={manualNewUrl}
                      onChange={(e) => setManualNewUrl(e.target.value)}
                      disabled={isManualMatching}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Description</label>
                    <Input
                      placeholder="Enter the new description (optional)"
                      value={manualNewDescription}
                      onChange={(e) => setManualNewDescription(e.target.value)}
                      disabled={isManualMatching}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleManualMatch}
                  disabled={isManualMatching || !manualName.trim()}
                  className="w-full md:w-auto"
                >
                  {isManualMatching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Find & Add to Preview
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* AI Matching Button */}
          {parsedRows.length > 0 && (
            <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium">AI-Powered Name Matching</p>
                <p className="text-xs text-muted-foreground">
                  Use AI to automatically match web result names based on semantic meaning and intent
                </p>
              </div>
              <Button 
                onClick={handleAIMatching}
                disabled={isAIMatching || isLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isAIMatching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Matching...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    AI Match Names
                  </>
                )}
              </Button>
            </div>
          )}
          
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Parsing and matching rows...</span>
            </div>
          )}

          {isAIMatching && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Sparkles className="w-5 h-5 animate-pulse text-primary" />
              <span>AI is analyzing names and finding matches...</span>
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
                    <TableHead className="w-20">Confidence</TableHead>
                    <TableHead>Current Title</TableHead>
                    <TableHead>Current URL</TableHead>
                    <TableHead>Current Description</TableHead>
                    <TableHead>Current Country</TableHead>
                    <TableHead>New Title</TableHead>
                    <TableHead>New URL</TableHead>
                    <TableHead>New Description</TableHead>
                    <TableHead>New Country</TableHead>
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
                      <TableCell>
                        {row.confidenceScore !== undefined ? (
                          <Badge 
                            variant={row.confidenceScore >= 80 ? "default" : row.confidenceScore >= 60 ? "secondary" : "outline"}
                            className={row.confidenceScore >= 80 ? "bg-green-500" : row.confidenceScore >= 60 ? "bg-yellow-500" : ""}
                          >
                            {row.confidenceScore}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-48 truncate" title={row.currentTitle}>
                        {row.currentTitle}
                      </TableCell>
                      <TableCell className="max-w-48 truncate" title={row.currentUrl}>
                        {row.currentUrl}
                      </TableCell>
                      <TableCell className="max-w-32 truncate" title={row.currentDescription}>
                        {row.currentDescription || '-'}
                      </TableCell>
                      <TableCell className="max-w-32 truncate" title={row.currentCountry}>
                        {row.currentCountry || '-'}
                      </TableCell>
                      <TableCell className="max-w-48 truncate font-medium text-primary" title={row.newTitle}>
                        {row.newTitle || '-'}
                      </TableCell>
                      <TableCell className="max-w-48 truncate font-medium text-primary" title={row.newUrl}>
                        {row.newUrl || '-'}
                      </TableCell>
                      <TableCell className="max-w-32 truncate font-medium text-primary" title={row.newDescription}>
                        {row.newDescription || '-'}
                      </TableCell>
                      <TableCell className="max-w-32 truncate font-medium text-primary" title={row.newCountry ? getCountryName(row.newCountry.toUpperCase()) : ''}>
                        {row.newCountry ? getCountryName(row.newCountry.toUpperCase()) : '-'}
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