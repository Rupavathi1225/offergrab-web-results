import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { trackClick, initSession } from "@/lib/tracking";
import { Helmet } from "react-helmet-async";

/**
 * RedirectHandler - Server-side country detection and redirect logic
 * 
 * This page handles:
 * 1. Country detection via Edge Function
 * 2. Redirect to appropriate destination based on country rules
 * 3. No visible content - purely for redirection
 * 
 * URL format: /r?id=<web_result_id>
 */
const RedirectHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const wrId = searchParams.get("id");
  const [status, setStatus] = useState<"checking" | "redirecting" | "error">("checking");

  useEffect(() => {
    initSession();
    handleRedirect();
  }, [wrId]);

  const handleRedirect = async () => {
    if (!wrId) {
      setStatus("error");
      return;
    }

    try {
      // Call edge function for server-side country detection
      const response = await supabase.functions.invoke('country-redirect', {
        body: null,
      });

      // Parse response - handle both direct response and nested data
      const params = new URLSearchParams();
      params.set("id", wrId);
      
      const edgeResponse = await fetch(
        `https://juxjsxgmghpdhurjkmyd.supabase.co/functions/v1/country-redirect?id=${wrId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await edgeResponse.json();
      console.log("Country redirect response:", data);

      if (data.allowed) {
        // Country is allowed - track and redirect to destination
        setStatus("redirecting");
        await trackClick('web_result', wrId, 'redirect', '/r', undefined, data.destination);
        
        // Check for prelanding
        const { data: prelanding } = await supabase
          .from('prelandings')
          .select('id, is_active')
          .eq('web_result_id', wrId)
          .eq('is_active', true)
          .maybeSingle();

        if (prelanding) {
          navigate(`/prelanding/${prelanding.id}?redirect=${encodeURIComponent(data.destination)}`);
        } else {
          window.location.href = data.destination;
        }
      } else {
        // Country not allowed - redirect to black page
        setStatus("redirecting");
        await trackClick('fallback_redirect', wrId, data.country, '/r');
        navigate(`/go?id=${wrId}`);
      }
    } catch (error) {
      console.error("Redirect error:", error);
      setStatus("error");
    }
  };

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center">
        {status === "checking" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Checking access...</p>
          </div>
        )}
        {status === "redirecting" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Redirecting...</p>
          </div>
        )}
        {status === "error" && (
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
        )}
      </div>
    </>
  );
};

export default RedirectHandler;
