import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FallbackUrl {
  id: string;
  url: string;
  sequence_order: number;
  allowed_countries: string[] | null;
}

interface WebResult {
  id: string;
  link: string;
  allowed_countries: string[] | null;
  fallback_link: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const wrId = url.searchParams.get("id");
    const action = url.searchParams.get("action") || "check"; // "check" or "redirect"

    // Get country from Cloudflare header or fallback to IP lookup
    let countryCode = req.headers.get("cf-ipcountry") || "XX";
    
    // If no CF header, try to detect via IP
    if (countryCode === "XX") {
      const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                       req.headers.get("x-real-ip") ||
                       "unknown";
      
      if (clientIP !== "unknown") {
        try {
          const geoResponse = await fetch(`https://ipapi.co/${clientIP}/country_code/`);
          if (geoResponse.ok) {
            const code = await geoResponse.text();
            if (code && code.length === 2) {
              countryCode = code.trim().toUpperCase();
            }
          }
        } catch (e) {
          console.log("IP lookup failed:", e);
        }
      }
    }

    console.log("Country detected:", countryCode);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If checking a specific web result
    if (wrId) {
      const { data: webResult, error: wrError } = await supabase
        .from("web_results")
        .select("id, link, allowed_countries, fallback_link")
        .eq("id", wrId)
        .eq("is_active", true)
        .maybeSingle();

      if (wrError || !webResult) {
        return new Response(
          JSON.stringify({ error: "Web result not found", redirect: "/landing" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      const allowed = isCountryAllowed(webResult.allowed_countries, countryCode);

      if (allowed) {
        // Country is allowed - return the destination link
        return new Response(
          JSON.stringify({
            allowed: true,
            country: countryCode,
            destination: webResult.link,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Country not allowed - return black page URL
        return new Response(
          JSON.stringify({
            allowed: false,
            country: countryCode,
            destination: `/go?id=${wrId}`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get next fallback URL for this country
    const { data: allUrls, error: urlsError } = await supabase
      .from("fallback_urls")
      .select("*")
      .eq("is_active", true)
      .order("sequence_order", { ascending: true });

    if (urlsError || !allUrls || allUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: "No fallback URLs configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Filter URLs allowed for this country
    const allowedUrls = allUrls.filter((url: FallbackUrl) => {
      // Skip Google Sheets URLs
      if (url.url.includes("docs.google.com/spreadsheets")) return false;
      return isCountryAllowed(url.allowed_countries, countryCode);
    });

    if (allowedUrls.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No fallback URL for country", 
          country: countryCode,
          redirect: "/fastmoney" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Get current index for this country from tracker
    const { data: tracker } = await supabase
      .from("fallback_sequence_tracker")
      .select("current_index")
      .limit(1)
      .maybeSingle();

    let currentIndex = tracker?.current_index || 0;
    currentIndex = currentIndex % allowedUrls.length;

    const selectedUrl = allowedUrls[currentIndex] as FallbackUrl;

    // Update tracker for next request
    const nextIndex = (currentIndex + 1) % allowedUrls.length;
    await supabase
      .from("fallback_sequence_tracker")
      .upsert({ id: "default", current_index: nextIndex, updated_at: new Date().toISOString() });

    console.log("Selected fallback URL:", selectedUrl.url, "for country:", countryCode);

    return new Response(
      JSON.stringify({
        country: countryCode,
        destination: selectedUrl.url,
        index: currentIndex,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in country-redirect:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Helper function to check if country is allowed
function isCountryAllowed(
  allowedCountries: string[] | null,
  userCountryCode: string
): boolean {
  if (!allowedCountries || allowedCountries.length === 0) {
    return true;
  }

  const userCode = (userCountryCode || "XX").trim().toUpperCase();

  const aliasToCode: Record<string, string> = {
    worldwide: "WORLDWIDE",
    ww: "WORLDWIDE",
    india: "IN",
    "united states": "US",
    usa: "US",
    "united kingdom": "GB",
    uk: "GB",
  };

  const normalizeToken = (token: string): string => {
    const t = (token || "").trim();
    const lower = t.toLowerCase();
    if (aliasToCode[lower]) return aliasToCode[lower];
    const upper = t.toUpperCase();
    if (upper.length === 2) return upper;
    return upper;
  };

  const normalizedAllowed = allowedCountries.map(normalizeToken).filter(Boolean);

  if (normalizedAllowed.includes("WORLDWIDE")) return true;
  if (userCode === "XX") return false;

  return normalizedAllowed.includes(userCode);
}
