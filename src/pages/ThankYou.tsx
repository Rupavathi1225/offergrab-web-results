import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Sparkles } from "lucide-react";

const ThankYou = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(2);
  
  // Get the destination URL from query params
  const destinationUrl = searchParams.get("to") || "/landing";

  useEffect(() => {
    // Set page title
    document.title = "Thank You | Astepstair";
  }, []);

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect to the destination URL
          window.location.href = destinationUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [destinationUrl]);

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

        {/* Countdown indicator */}
        <div className="flex justify-center">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                className="text-secondary"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={176}
                strokeDashoffset={176 - (176 * (2 - countdown)) / 2}
                className="text-primary transition-all duration-1000"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-foreground">
              {countdown}
            </span>
          </div>
        </div>

        {/* Loading dots */}
        <div className="flex justify-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

export default ThankYou;
