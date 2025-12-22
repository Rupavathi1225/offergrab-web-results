import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackClick, initSession } from "@/lib/tracking";
import { getUserCountryCode, isCountryAllowed } from "@/lib/countryAccess";

const LinkRedirect = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const lid = searchParams.get('lid');
  const [error, setError] = useState(false);

  useEffect(() => {
    initSession();
    handleRedirect();
  }, [lid]);

  const handleRedirect = async () => {
    if (!lid) {
      setError(true);
      return;
    }

    try {
      // Get all results and find by serial number
      const { data: results, error: fetchError } = await supabase
        .from('web_results')
        .select('*')
        .eq('is_active', true)
        .order('serial_number', { ascending: true });

      if (fetchError || !results) {
        setError(true);
        return;
      }

      const lidNum = parseInt(lid);
      const result = results.find((_, index) => index + 1 === lidNum);

      if (!result) {
        setError(true);
        return;
      }

      // Track the click
      await trackClick('web_result', result.id, result.title, `/lid=${lid}`, lidNum, result.link);

      // Check country access
      const userCountryCode = await getUserCountryCode();
      const allowed = isCountryAllowed(result.allowed_countries, userCountryCode);
      
      if (!allowed) {
        // User's country is not allowed - open FastMoney in new tab
        window.open('/fastmoney', '_blank', 'noopener,noreferrer');
        return;
      }

      // Check for prelanding
      const { data: prelanding } = await supabase
        .from('prelandings')
        .select('id, is_active')
        .eq('web_result_id', result.id)
        .eq('is_active', true)
        .maybeSingle();

      if (prelanding) {
        navigate(`/prelanding/${prelanding.id}?redirect=${encodeURIComponent(result.link)}`);
      } else {
        // Direct redirect
        window.location.href = result.link;
      }
    } catch (err) {
      console.error('Error redirecting:', err);
      setError(true);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Link Not Found</h1>
          <p className="text-muted-foreground mb-6">The link you're looking for doesn't exist.</p>
          <button 
            onClick={() => navigate('/landing')}
            className="text-primary hover:underline"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-primary">Redirecting...</div>
    </div>
  );
};

export default LinkRedirect;
