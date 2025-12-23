// Get user's country code from IP
export const getUserCountryCode = async (): Promise<string> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json();
      return data.country_code || 'XX';
    }
  } catch (e) {
    console.log('Could not fetch country info');
  }
  return 'XX';
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

  // Normalize list (some rows may contain combined codes like "US IN" inside one array item)
  const tokens = allowedCountries
    .flatMap((entry) =>
      entry
        .split(/[\s,|]+/)
        .map((t) => t.trim())
        .filter(Boolean)
    )
    .map((t) => t.toLowerCase());

  // Check for worldwide access
  if (tokens.includes("worldwide") || tokens.includes("ww")) {
    return true;
  }

  const normalizedUserCountry = (userCountryCode || "").toUpperCase();
  if (!normalizedUserCountry || normalizedUserCountry === "XX") {
    // Unknown country: be permissive (caller can decide otherwise)
    return true;
  }

  // Check if user's country is in the allowed list
  return tokens.some((t) => t.toUpperCase() === normalizedUserCountry);
};
