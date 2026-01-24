import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, Sparkles } from "lucide-react";

const ThankYou = () => {
  const [searchParams] = useSearchParams();
  
  // Get the destination URL from query params (defensive decode)
  const rawTo = searchParams.get("to") || "/landing";
  const destinationUrl = (() => {
    try {
      // If it's already decoded this is a no-op; if not, it will decode safely.
      return decodeURIComponent(rawTo);
    } catch {
      return rawTo;
    }
  })();

  useEffect(() => {
    // Set page title
    document.title = "Thank You | Astepstair";

    // Meta Pixel conversion event (equivalent to: fbq('track', 'Lead'))
    try {
      if (typeof window !== "undefined" && typeof window.fbq === "function") {
        window.fbq("track", "Lead");
      } else {
        // eslint-disable-next-line no-console
        console.warn("ThankYou: fbq is not available; Lead event not sent.");
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("ThankYou: failed to send Lead event.", error);
    }
  }, []);

  useEffect(() => {
    // Redirect after 2 seconds
    const timer = setTimeout(() => {
      const url = destinationUrl;

      // NOTE: Some embedded preview environments (iframes) block non-user-initiated
      // navigations. We try multiple strategies for maximum compatibility.
      const tryNavigate = () => {
        // 1) Break out of iframe if allowed
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = url;
            return true;
          }
        } catch {
          // ignore cross-origin error
        }

        // 2) Same-frame navigation using assign (more reliable)
        try {
          window.location.assign(url);
          return true;
        } catch {
          // ignore
        }

        // 3) Direct href assignment
        try {
          window.location.href = url;
          return true;
        } catch {
          // ignore
        }

        // 4) window.open (may be blocked by popup rules in some browsers)
        try {
          const w = window.open(url, "_self");
          if (w) return true;
        } catch {
          // ignore
        }

        // 5) Programmatic anchor click fallback
        try {
          const a = document.createElement("a");
          a.href = url;
          a.target = "_self";
          a.rel = "noreferrer";
          document.body.appendChild(a);
          a.click();
          a.remove();
          return true;
        } catch {
          // ignore
        }

        return false;
      };

      const ok = tryNavigate();
      if (!ok) {
        // Helpful for debugging in strict iframe environments.
        // eslint-disable-next-line no-console
        console.warn("ThankYou: redirect attempt was blocked.", { url });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [destinationUrl]);

  const handleManualRedirect = () => {
    window.location.href = destinationUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-4xl font-bold text-primary-foreground tracking-tight">A</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
              <CheckCircle className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* Brand name */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-wide">Astepstair</h1>
        </div>

        {/* Thank You message */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            <h2 className="text-3xl font-bold text-foreground">Thank You!</h2>
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </div>
          
          <p className="text-muted-foreground text-lg">
            Redirecting to the original URL…
          </p>
        </div>

        {/* Loading dots */}
        <div className="flex justify-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>

        {/* Fallback button - more prominent for environments that block auto-redirect */}
        <div className="space-y-3">
          <button 
            onClick={handleManualRedirect}
            className="inline-block px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Continue to Destination →
          </button>
          <p className="text-sm text-muted-foreground">
            If you're not redirected automatically, click the button above.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;
