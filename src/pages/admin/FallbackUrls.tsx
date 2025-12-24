import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ArrowUp, ArrowDown, Link, Loader2, Globe, FileSpreadsheet, Upload, Calendar, Eye, Check, X, Filter, CalendarIcon, Copy } from "lucide-react";
import { toast } from "sonner";
import { countries, getCountryName } from "@/lib/countries";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import * as XLSX from "xlsx";
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface FallbackUrl {
  id: string;
  url: string;
  sequence_order: number;
  is_active: boolean;
  created_at: string;
  allowed_countries: string[] | null;
}

// Helper to convert country name to code
const getCountryCode = (input: string): string | null => {
  const normalized = input.trim().toLowerCase();
  if (normalized === "worldwide") return "worldwide";

  // Check if it's already a valid code
  const byCode = countries.find((c) => c.code.toLowerCase() === normalized);
  if (byCode) return byCode.code;

  // Check by name
  const byName = countries.find((c) => c.name.toLowerCase() === normalized);
  if (byName) return byName.code;

  return null;
};

// Prevent accidentally saving Google Sheets links as fallback redirect URLs
const isBlockedFallbackUrl = (url: string): boolean => {
  try {
    const u = new URL(url);
    return u.hostname === "docs.google.com" && u.pathname.includes("/spreadsheets/");
  } catch {
    return false;
  }
};

interface SheetPreviewData {
  url: string;
  countries: string[];
  countryNames: string;
}

const FallbackUrls = () => {
  const [newUrl, setNewUrl] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["worldwide"]);
  const [countrySearchOpen, setCountrySearchOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetPreviewData, setSheetPreviewData] = useState<SheetPreviewData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Filter states
  const [filterCountries, setFilterCountries] = useState<string[]>([]);
  const [filterCountryOpen, setFilterCountryOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Multi-select states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // Filter the URLs based on selected filters
  const filteredUrls = useMemo(() => {
    if (!urls) return [];
    
    return urls.filter((url) => {
      // Country filter
      if (filterCountries.length > 0) {
        const urlCountries = url.allowed_countries || ["worldwide"];
        const hasMatchingCountry = filterCountries.some((fc) =>
          urlCountries.some((uc) => uc.toLowerCase() === fc.toLowerCase())
        );
        if (!hasMatchingCountry) return false;
      }

      // Date range filter
      if (dateRange?.from) {
        const urlDate = parseISO(url.created_at);
        const fromDate = startOfDay(dateRange.from);
        const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        
        if (!isWithinInterval(urlDate, { start: fromDate, end: toDate })) {
          return false;
        }
      }

      return true;
    });
  }, [urls, filterCountries, dateRange]);

  const toggleFilterCountry = (countryCode: string) => {
    setFilterCountries((prev) => {
      if (prev.includes(countryCode)) {
        return prev.filter((c) => c !== countryCode);
      } else {
        return [...prev, countryCode];
      }
    });
  };

  const removeFilterCountry = (countryCode: string) => {
    setFilterCountries((prev) => prev.filter((c) => c !== countryCode));
  };

  const clearAllFilters = () => {
    setFilterCountries([]);
    setDateRange(undefined);
  };

  const hasActiveFilters = filterCountries.length > 0 || dateRange?.from;

  // Multi-select handlers
  const toggleSelectUrl = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredUrls.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUrls.map((u) => u.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("fallback_urls")
        .delete()
        .in("id", ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fallback-urls"] });
      setSelectedIds(new Set());
      toast.success(`Deleted ${selectedIds.size} URLs successfully`);
    },
    onError: (error) => {
      toast.error("Failed to delete URLs: " + error.message);
    },
  });

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  const handleBulkCopy = () => {
    if (selectedIds.size === 0) return;
    const selectedUrls = filteredUrls
      .filter((u) => selectedIds.has(u.id))
      .map((u) => u.url)
      .join("\n");
    navigator.clipboard.writeText(selectedUrls);
    toast.success(`Copied ${selectedIds.size} URLs to clipboard`);
  };

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
    mutationFn: async ({ url, countries }: { url: string; countries: string[] }) => {
      const maxOrder = urls?.length ? Math.max(...urls.map(u => u.sequence_order)) : 0;
      const { error } = await supabase
        .from("fallback_urls")
        .insert({ url, sequence_order: maxOrder + 1, allowed_countries: countries });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fallback-urls"] });
      setNewUrl("");
      setSelectedCountries(["worldwide"]);
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

    if (isBlockedFallbackUrl(newUrl)) {
      toast.error("Google Sheets links are not allowed as fallback URLs");
      return;
    }

    if (selectedCountries.length === 0) {
      toast.error("Please select at least one country");
      return;
    }

    addUrlMutation.mutate({ url: newUrl.trim(), countries: selectedCountries });
  };

  const toggleCountry = (countryCode: string) => {
    setSelectedCountries(prev => {
      if (prev.includes(countryCode)) {
        return prev.filter(c => c !== countryCode);
      } else {
        return [...prev, countryCode];
      }
    });
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

  // Google Sheets import handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

      console.log("Parsed sheet data:", jsonData);

      if (jsonData.length === 0) {
        toast.error("No data found in the sheet");
        return;
      }

      const maxOrder = urls?.length ? Math.max(...urls.map(u => u.sequence_order)) : 0;
      let addedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Normalize keys by trimming whitespace
        const normalizedRow: Record<string, string> = {};
        for (const key of Object.keys(row)) {
          normalizedRow[key.trim().toLowerCase()] = row[key];
        }

        const urlValue = normalizedRow["url"] || normalizedRow["link"] || "";
        const countriesValue = normalizedRow["allowed_countries"] || normalizedRow["countries"] || "";

        if (!urlValue) {
          console.log("Skipping row - no URL:", row);
          skippedCount++;
          continue;
        }

        // Validate URL
        try {
          new URL(urlValue);
        } catch {
          console.log("Skipping row - invalid URL:", urlValue);
          skippedCount++;
          continue;
        }

        // Block Google Sheets URLs from being saved as fallback redirects
        if (isBlockedFallbackUrl(urlValue)) {
          console.log("Skipping row - Google Sheets URL:", urlValue);
          skippedCount++;
          continue;
        }

        // Parse comma-separated countries
        const countryInputs = countriesValue
          .split(",")
          .map((c: string) => c.trim())
          .filter(Boolean);

        let countryCodes: string[] = ["worldwide"];
        if (countryInputs.length > 0) {
          const resolvedCodes = countryInputs
            .map((input: string) => getCountryCode(input))
            .filter((code): code is string => code !== null);
          if (resolvedCodes.length > 0) {
            countryCodes = resolvedCodes;
          }
        }

        console.log("Importing URL:", { url: urlValue, countries: countryCodes });

        const { error } = await supabase
          .from("fallback_urls")
          .insert({
            url: urlValue.trim(),
            sequence_order: maxOrder + addedCount + 1,
            allowed_countries: countryCodes,
          });

        if (error) {
          console.error("Failed to insert URL:", error);
          skippedCount++;
        } else {
          addedCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["fallback-urls"] });
      toast.success(`Imported ${addedCount} URLs${skippedCount > 0 ? `, skipped ${skippedCount}` : ""}`);
    } catch (error) {
      console.error("Failed to parse sheet:", error);
      toast.error("Failed to parse the file. Please check the format.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Fetch and preview Google Sheet data
  const handleSheetUrlPreview = async () => {
    if (!sheetUrl.trim()) {
      toast.error("Please enter a Google Sheets URL");
      return;
    }

    // Extract sheet ID from various Google Sheets URL formats
    const sheetIdMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      toast.error("Invalid Google Sheets URL. Please use a valid URL.");
      return;
    }

    const sheetId = sheetIdMatch[1];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    setIsFetchingPreview(true);

    try {
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch sheet. Make sure it's publicly accessible.");
      }

      const csvText = await response.text();
      const workbook = XLSX.read(csvText, { type: "string" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);

      console.log("Parsed Google Sheet data:", jsonData);

      if (jsonData.length === 0) {
        toast.error("No data found in the sheet");
        return;
      }

      const previewData: SheetPreviewData[] = [];

      for (const row of jsonData) {
        // Normalize keys by trimming whitespace
        const normalizedRow: Record<string, string> = {};
        for (const key of Object.keys(row)) {
          normalizedRow[key.trim().toLowerCase()] = row[key];
        }

        const urlValue = normalizedRow["url"] || normalizedRow["link"] || "";
        const countriesValue = normalizedRow["allowed_countries"] || normalizedRow["countries"] || "";

        if (!urlValue) continue;

        // Validate URL
        try {
          new URL(urlValue);
        } catch {
          continue;
        }

        // Block Google Sheets URLs from being saved as fallback redirects
        if (isBlockedFallbackUrl(urlValue)) {
          continue;
        }

        // Parse comma-separated countries
        const countryInputs = countriesValue
          .split(",")
          .map((c: string) => c.trim())
          .filter(Boolean);

        let countryCodes: string[] = ["worldwide"];
        if (countryInputs.length > 0) {
          const resolvedCodes = countryInputs
            .map((input: string) => getCountryCode(input))
            .filter((code): code is string => code !== null);
          if (resolvedCodes.length > 0) {
            countryCodes = resolvedCodes;
          }
        }

        previewData.push({
          url: urlValue.trim(),
          countries: countryCodes,
          countryNames: countryCodes.map(c => getCountryName(c)).join(", "),
        });
      }

      if (previewData.length === 0) {
        toast.error("No valid URLs found in the sheet");
        return;
      }

      setSheetPreviewData(previewData);
      setShowPreview(true);
      toast.success(`Found ${previewData.length} URLs in the sheet`);
    } catch (error) {
      console.error("Failed to fetch/parse Google Sheet:", error);
      toast.error("Failed to fetch sheet. Make sure it's publicly accessible (File > Share > Anyone with the link).");
    } finally {
      setIsFetchingPreview(false);
    }
  };

  // Import previewed data
  const handleConfirmImport = async () => {
    if (sheetPreviewData.length === 0) return;

    setIsImporting(true);

    try {
      const maxOrder = urls?.length ? Math.max(...urls.map(u => u.sequence_order)) : 0;
      let addedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < sheetPreviewData.length; i++) {
        const item = sheetPreviewData[i];

        const { error } = await supabase
          .from("fallback_urls")
          .insert({
            url: item.url,
            sequence_order: maxOrder + addedCount + 1,
            allowed_countries: item.countries,
          });

        if (error) {
          console.error("Failed to insert URL:", error);
          skippedCount++;
        } else {
          addedCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["fallback-urls"] });
      setSheetUrl("");
      setSheetPreviewData([]);
      setShowPreview(false);
      toast.success(`Imported ${addedCount} URLs${skippedCount > 0 ? `, skipped ${skippedCount}` : ""}`);
    } catch (error) {
      console.error("Failed to import:", error);
      toast.error("Failed to import URLs");
    } finally {
      setIsImporting(false);
    }
  };

  // Cancel preview
  const handleCancelPreview = () => {
    setSheetPreviewData([]);
    setShowPreview(false);
  };

  const renderCountryBadges = (allowedCountries: string[] | null) => {
    const countryList = allowedCountries || ["worldwide"];
    const displayCount = 3;
    const visibleCountries = countryList.slice(0, displayCount);
    const remainingCount = countryList.length - displayCount;

    return (
      <div className="flex flex-wrap gap-1">
        {visibleCountries.map(code => (
          <Badge key={code} variant="secondary" className="text-xs">
            {getCountryName(code)}
          </Badge>
        ))}
        {remainingCount > 0 && (
          <Badge variant="outline" className="text-xs">
            +{remainingCount} more
          </Badge>
        )}
      </div>
    );
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "MMM dd, yyyy HH:mm");
  };

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
        <CardContent className="space-y-4">
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
          
          {/* Country Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Allowed Countries
            </label>
            <Popover open={countrySearchOpen} onOpenChange={setCountrySearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  {selectedCountries.length === 0 ? (
                    <span className="text-muted-foreground">Select countries...</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {selectedCountries.slice(0, 4).map(code => (
                        <Badge key={code} variant="secondary" className="text-xs">
                          {getCountryName(code)}
                        </Badge>
                      ))}
                      {selectedCountries.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{selectedCountries.length - 4} more
                        </Badge>
                      )}
                    </div>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search countries..." />
                  <CommandList>
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {countries.map((country) => (
                        <CommandItem
                          key={country.code}
                          onSelect={() => toggleCountry(country.code)}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            checked={selectedCountries.includes(country.code)}
                            className="pointer-events-none"
                          />
                          <span>{country.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Select which countries can access this URL. "Worldwide" means all countries.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Google Sheets Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import from Google Sheets / Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Import URLs with columns: <code className="bg-muted px-1 rounded">url</code> and <code className="bg-muted px-1 rounded">allowed_countries</code> (comma-separated country names)
          </p>
          
          {/* Google Sheets URL Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Google Sheets URL</label>
            <div className="flex gap-2">
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="flex-1"
                disabled={showPreview}
              />
              {!showPreview ? (
                <Button
                  onClick={handleSheetUrlPreview}
                  disabled={isFetchingPreview || !sheetUrl.trim()}
                >
                  {isFetchingPreview ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview Data
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleConfirmImport}
                    disabled={isImporting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isImporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Confirm Import
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelPreview}
                    disabled={isImporting}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Make sure the sheet is publicly accessible: <strong>File → Share → Anyone with the link</strong>
            </p>
          </div>

          {/* Preview Table */}
          {showPreview && sheetPreviewData.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 border-b">
                <h4 className="font-medium text-sm">Preview: {sheetPreviewData.length} URLs found</h4>
              </div>
              <div className="max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Countries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sheetPreviewData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-mono text-sm break-all max-w-xs">{item.url}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.countries.slice(0, 3).map(code => (
                              <Badge key={code} variant="secondary" className="text-xs">
                                {getCountryName(code)}
                              </Badge>
                            ))}
                            {item.countries.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{item.countries.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or upload file</span>
            </div>
          </div>

          {/* File Upload */}
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Excel/CSV
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Expected format:</strong></p>
            <div className="bg-muted p-2 rounded font-mono text-xs">
              | url | allowed_countries |<br />
              | https://example.com | India, United States, UK |<br />
              | https://other.com | worldwide |
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            URL Sequence ({hasActiveFilters ? `${filteredUrls.length} of ${urls?.length || 0}` : `${urls?.length || 0}`} URLs)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters Section */}
          <div className="flex flex-wrap gap-4 pb-4 border-b">
            {/* Country Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
                <Globe className="h-3 w-3" />
                Country
              </label>
              <Popover open={filterCountryOpen} onOpenChange={setFilterCountryOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="min-w-[160px] justify-start text-left font-normal h-8">
                    {filterCountries.length === 0 ? (
                      <span className="text-muted-foreground">Select...</span>
                    ) : (
                      <span>{filterCountries.length} selected</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0 z-50 bg-popover" align="start">
                  <Command>
                    <CommandInput placeholder="Search countries..." />
                    <CommandList>
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {countries.map((country) => (
                          <CommandItem
                            key={country.code}
                            onSelect={() => toggleFilterCountry(country.code)}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              checked={filterCountries.includes(country.code)}
                              className="pointer-events-none"
                            />
                            <span>{country.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
                <CalendarIcon className="h-3 w-3" />
                Date
              </label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "min-w-[200px] justify-start text-left font-normal h-8",
                      !dateRange?.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground h-8">
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            )}
          </div>

          {/* Selected Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {filterCountries.map((code) => (
                <Badge
                  key={code}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  {getCountryName(code)}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeFilterCountry(code)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              {dateRange?.from && (
                <Badge variant="secondary" className="flex items-center gap-1 pr-1">
                  {dateRange.to
                    ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd, y")}`
                    : format(dateRange.from, "MMM dd, y")}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => setDateRange(undefined)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          )}

          {/* Bulk Actions Toolbar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleBulkCopy}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy URLs
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteMutation.isPending}
                >
                  {bulkDeleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </>
                  )}
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : urls?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No URLs added yet. Add URLs above to enable sequential redirects.
            </div>
          ) : filteredUrls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No URLs match the selected filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === filteredUrls.length && filteredUrls.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Countries</TableHead>
                  <TableHead className="w-36">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Added
                    </div>
                  </TableHead>
                  <TableHead className="w-28 text-center">Reorder</TableHead>
                  <TableHead className="w-20 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUrls.map((url) => {
                  const originalIndex = urls?.findIndex((u) => u.id === url.id) ?? 0;
                  const isSelected = selectedIds.has(url.id);
                  return (
                    <TableRow 
                      key={url.id}
                      className={cn(
                        tracker && urls && (tracker.current_index % urls.length) === originalIndex && "bg-primary/10",
                        isSelected && "bg-muted/50"
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectUrl(url.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {originalIndex + 1}
                      </TableCell>
                      <TableCell className="font-mono text-sm break-all max-w-xs">
                        {url.url}
                      </TableCell>
                      <TableCell>
                        {renderCountryBadges(url.allowed_countries)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(url.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => reorderMutation.mutate({ id: url.id, direction: "up" })}
                            disabled={originalIndex === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => reorderMutation.mutate({ id: url.id, direction: "down" })}
                            disabled={urls && originalIndex === urls.length - 1}
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FallbackUrls;