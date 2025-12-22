import { useEffect, useState } from "react";
import { DollarSign, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const FastMoney = () => {
  const [countdown, setCountdown] = useState(5);
  const [clicked, setClicked] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "FastMoney - Redirecting...";
    fetchNextUrl();
  }, []);

  const fetchNextUrl = async () => {
    try {
      // Get all active URLs in sequence order
      const { data: urls, error: urlsError } = await supabase
        .from("fallback_urls")
        .select("*")
        .eq("is_active", true)
        .order("sequence_order", { ascending: true });

      if (urlsError) throw urlsError;

      if (!urls || urls.length === 0) {
        // No URLs configured, use default
        setRedirectUrl("https://google.com");
        setLoading(false);
        return;
      }

      // Get current sequence tracker
      const { data: tracker, error: trackerError } = await supabase
        .from("fallback_sequence_tracker")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (trackerError) throw trackerError;

      const currentIndex = tracker?.current_index || 0;
      const nextIndex = currentIndex % urls.length;
      
      // Get the URL at the current index
      const selectedUrl = urls[nextIndex]?.url || urls[0]?.url;
      setRedirectUrl(selectedUrl);

      // Update the tracker to next position
      const newIndex = (currentIndex + 1) % urls.length;
      await supabase
        .from("fallback_sequence_tracker")
        .update({ current_index: newIndex })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      setLoading(false);
    } catch (error) {
      console.error("Error fetching redirect URL:", error);
      setRedirectUrl("https://google.com");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading || clicked || !redirectUrl) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = redirectUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, redirectUrl, clicked]);

  const handleClick = () => {
    if (!redirectUrl) return;
    setClicked(true);
    window.location.href = redirectUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
        {/* Logo/Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
            <DollarSign className="w-12 h-12 text-green-900" />
          </div>
        </div>

        {/* Brand Name */}
        <div>
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Fast<span className="text-yellow-400">Money</span>
          </h1>
          <p className="text-emerald-200 mt-2 text-lg">Your Gateway to Opportunities</p>
        </div>

        {/* Countdown */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <p className="text-emerald-100 mb-3">Redirecting you in</p>
          <div className="text-6xl font-bold text-yellow-400 animate-pulse">
            {loading ? <Loader2 className="h-16 w-16 animate-spin mx-auto" /> : countdown}
          </div>
          <p className="text-emerald-200 mt-3 text-sm">seconds</p>
        </div>

        {/* Click to redirect button */}
        <button
          onClick={handleClick}
          disabled={loading}
          className="bg-gradient-to-r from-yellow-400 to-amber-500 text-green-900 font-bold py-4 px-8 rounded-full text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {clicked ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              Continue Now
            </>
          )}
        </button>

        {/* Loading indicator */}
        <div className="flex justify-center gap-2">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default FastMoney;
