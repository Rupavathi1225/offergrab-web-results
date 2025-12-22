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
  // If no restrictions or worldwide, allow all
  if (!allowedCountries || allowedCountries.length === 0) {
    return true;
  }
  
  // Check for worldwide access
  const normalizedAllowed = allowedCountries.map(c => c.toLowerCase());
  if (normalizedAllowed.includes('worldwide') || normalizedAllowed.includes('ww')) {
    return true;
  }
  
  // Check if user's country is in the allowed list (case-insensitive)
  const normalizedUserCountry = userCountryCode.toUpperCase();
  return allowedCountries.some(c => c.toUpperCase() === normalizedUserCountry);
};
