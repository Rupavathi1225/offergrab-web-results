import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DollarSign, Loader2 } from "lucide-react";

const FastMoney = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);
  const [clicked, setClicked] = useState(false);
  
  const fallbackUrl = searchParams.get('fallback') || '/landing';

  useEffect(() => {
    document.title = "FastMoney - Redirecting...";
  }, []);

  useEffect(() => {
    if (clicked) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto redirect to fallback URL
          if (fallbackUrl.startsWith('http')) {
            window.location.href = fallbackUrl;
          } else {
            navigate(fallbackUrl);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fallbackUrl, navigate, clicked]);

  const handleClick = () => {
    setClicked(true);
    if (fallbackUrl.startsWith('http')) {
      window.location.href = fallbackUrl;
    } else {
      navigate(fallbackUrl);
    }
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
            {countdown}
          </div>
          <p className="text-emerald-200 mt-3 text-sm">seconds</p>
        </div>

        {/* Click to redirect button */}
        <button
          onClick={handleClick}
          className="bg-gradient-to-r from-yellow-400 to-amber-500 text-green-900 font-bold py-4 px-8 rounded-full text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
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
