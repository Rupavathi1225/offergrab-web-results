// Get user's country code from IP
export const getUserCountryCode = async (): Promise<string> => {
  const normalize = (v: unknown) => {
    const code = typeof v === "string" ? v.trim().toUpperCase() : "";
    return code.length === 2 ? code : "";
  };

  // 1) ipapi.co
  try {
    const response = await fetch("https://ipapi.co/json/");
    if (response.ok) {
      const data = await response.json();
      const code = normalize(data?.country_code);
      if (code) return code;
    }
  } catch {
    // ignore
  }

  // 2) ipwho.is (no key)
  try {
    const response = await fetch("https://ipwho.is/");
    if (response.ok) {
      const data = await response.json();
      const code = normalize(data?.country_code);
      if (code) return code;
    }
  } catch {
    // ignore
  }

  // 3) Cloudflare trace (works only when behind Cloudflare)
  try {
    const response = await fetch("https://www.cloudflare.com/cdn-cgi/trace");
    if (response.ok) {
      const text = await response.text();
      const match = text.match(/\bloc=([A-Z]{2})\b/);
      const code = normalize(match?.[1]);
      if (code) return code;
    }
  } catch {
    // ignore
  }

  console.log("Could not fetch country info");
  return "XX";
};

// Check if user's country is allowed for a web result
export const isCountryAllowed = (
  allowedCountries: string[] | null,
  userCountryCode: string
): boolean => {
  // If no restrictions, allow all
  if (!allowedCountries || allowedCountries.length === 0) {
    return true;
  }

  const userCode = (userCountryCode || "XX").trim().toUpperCase();

  const aliasToCode: Record<string, string> = {
    worldwide: "WORLDWIDE",
    ww: "WORLDWIDE",

    // Common country-name aliases (helps if admin uploads names instead of codes)
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

  const normalizedAllowed = allowedCountries
    .map(normalizeToken)
    .filter(Boolean);

  // Worldwide access
  if (normalizedAllowed.includes("WORLDWIDE")) return true;

  // Unknown country -> do NOT allow country-specific URLs (safe default)
  if (userCode === "XX") return false;

  return normalizedAllowed.includes(userCode);
};
