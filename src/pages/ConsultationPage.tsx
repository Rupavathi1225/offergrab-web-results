import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { initSession, trackClick } from "@/lib/tracking";
import { ArrowDown, Shield, Clock, CreditCard } from "lucide-react";

interface ConsultationPageData {
  id: string;
  name: string;
  slug: string;
  destination_link: string;
  image_url: string | null;
  trust_line: string | null;
  cta_text: string | null;
  is_active: boolean;
}

const ConsultationPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [pageData, setPageData] = useState<ConsultationPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    initSession();
    fetchPageData();
  }, [slug]);

  const fetchPageData = async () => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("consultation_pages")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      setNotFound(true);
    } else {
      setPageData(data);
      // Track page view
      trackClick("consultation_view", data.id, data.name, `/cnos/${slug}`);
    }
    setLoading(false);
  };

  const handleCTAClick = () => {
    if (!pageData) return;
    
    // Track the click
    trackClick("consultation_click", pageData.id, pageData.name, `/cnos/${pageData.slug}`, undefined, pageData.destination_link);
    
    // Redirect to destination
    window.location.href = pageData.destination_link;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="animate-pulse text-slate-600">Loading...</div>
      </div>
    );
  }

  if (notFound || !pageData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Page Not Found</h1>
          <p className="text-slate-600 mb-4">This consultation page doesn't exist or is inactive.</p>
          <button
            onClick={() => navigate("/")}
            className="text-blue-600 hover:underline"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="py-6 border-b border-slate-200">
        <div className="container mx-auto px-4">
          <h1 className="text-xl font-bold text-slate-800 text-center">Astepstair</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Image Section */}
        {pageData.image_url && (
          <div className="mb-8 flex justify-center">
            <img
              src={pageData.image_url}
              alt={pageData.name}
              className="max-w-full h-auto max-h-48 object-contain rounded-lg shadow-md"
            />
          </div>
        )}

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 text-center mb-6">
          {pageData.name}
        </h2>

        {/* Trust Line */}
        <p className="text-slate-600 text-center text-lg mb-8 max-w-lg mx-auto">
          {pageData.trust_line || "To proceed, please complete a short, secure consultation form."}
        </p>

        {/* Big Arrow Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="animate-bounce">
            <ArrowDown className="w-16 h-16 text-blue-600" strokeWidth={2.5} />
          </div>
          <div className="flex items-center gap-1 mt-2">
            <ArrowDown className="w-8 h-8 text-blue-500" />
            <ArrowDown className="w-8 h-8 text-blue-500" />
            <ArrowDown className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex justify-center mb-10">
          <button
            onClick={handleCTAClick}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-10 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            {pageData.cta_text || "Take Your Consultation"} →
          </button>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 mb-12">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-600" />
            <span>Secure</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Takes less than 2 minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-600" />
            <span>No payment required</span>
          </div>
        </div>

        {/* Additional Trust Message */}
        <div className="text-center text-slate-500 text-sm">
          <p>This helps us understand your requirement better.</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          <div className="flex items-center justify-center gap-4 mb-2">
            <a href="/about-us" className="hover:text-slate-700 transition-colors">
              About Us
            </a>
            <span className="text-slate-300">•</span>
            <a href="/privacy-policy" className="hover:text-slate-700 transition-colors">
              Privacy Policy
            </a>
          </div>
          © {new Date().getFullYear()} Astepstair.com. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default ConsultationPage;
