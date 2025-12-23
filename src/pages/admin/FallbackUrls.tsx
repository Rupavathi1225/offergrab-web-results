import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ArrowUp, ArrowDown, Link, Loader2, Globe, FileSpreadsheet, Upload, Calendar } from "lucide-react";
import { toast } from "sonner";
import { countries, getCountryName } from "@/lib/countries";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import * as XLSX from "xlsx";
import { format } from "date-fns";

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
  const byCode = countries.find(c => c.code.toLowerCase() === normalized);
  if (byCode) return byCode.code;
  
  // Check by name
  const byName = countries.find(c => c.name.toLowerCase() === normalized);
  if (byName) return byName.code;
  
  return null;
};

const FallbackUrls = () => {
  const [newUrl, setNewUrl] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["worldwide"]);
  const [countrySearchOpen, setCountrySearchOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      const jsonData = XLSX.utils.sheet_to_json<{ url?: string; URL?: string; link?: string; Link?: string; allowed_countries?: string; countries?: string; Countries?: string }>(worksheet);

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
        const urlValue = row.url || row.URL || row.link || row.Link;
        const countriesValue = row.allowed_countries || row.countries || row.Countries || "";

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
            Upload an Excel/CSV file with columns: <code className="bg-muted px-1 rounded">url</code> and <code className="bg-muted px-1 rounded">allowed_countries</code> (comma-separated country names)
          </p>
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
                  Upload Sheet
                </>
              )}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Example format:</strong></p>
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
                  <TableHead>Countries</TableHead>
                  <TableHead className="w-40">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Added
                    </div>
                  </TableHead>
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