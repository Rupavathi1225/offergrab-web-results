import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackClick, getOrCreateSessionId } from "@/lib/tracking";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface PrelandingData {
  id: string;
  logo_url: string | null;
  main_image_url: string | null;
  headline: string;
  description: string | null;
  email_placeholder: string;
  cta_button_text: string;
  background_color: string;
  background_image_url: string | null;
  web_result_id: string | null;
}

interface WebResultData {
  link: string;
}

const Prelanding = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectUrl = searchParams.get('redirect');
  
  const [prelanding, setPrelanding] = useState<PrelandingData | null>(null);
  const [webResultLink, setWebResultLink] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPrelanding();
  }, [id]);

  const fetchPrelanding = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('prelandings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPrelanding(data);
        
        // Fetch the linked web result's link
        if (data.web_result_id) {
          const { data: webResult } = await supabase
            .from('web_results')
            .select('link')
            .eq('id', data.web_result_id)
            .maybeSingle();
          
          if (webResult) {
            setWebResultLink(webResult.link);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching prelanding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const sessionId = getOrCreateSessionId();
      
      // Get IP
      let ipAddress = '';
      try {
        const ipResponse = await fetch('https://ipapi.co/json/');
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          ipAddress = ipData.ip || '';
        }
      } catch (e) {
        console.log('Could not fetch IP');
      }

      // Save email capture
      await supabase.from('email_captures').insert({
        prelanding_id: id,
        email,
        session_id: sessionId,
        ip_address: ipAddress,
      });

      // Track the submit
      await trackClick('prelanding_submit', id, 'Email Capture', `/prelanding/${id}`);

      // Determine redirect URL: use query param first, then linked web result, then fallback to landing
      const targetUrl = redirectUrl || webResultLink;
      
      if (targetUrl) {
        window.location.href = targetUrl;
      } else {
        navigate('/landing');
      }
    } catch (error) {
      console.error('Error submitting:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!prelanding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Prelanding not found</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: prelanding.background_color || '#1a1a2e',
        backgroundImage: prelanding.background_image_url 
          ? `url(${prelanding.background_image_url})` 
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="glass-card max-w-md w-full p-8 animate-fade-in">
        {/* Logo */}
        {prelanding.logo_url && (
          <div className="flex justify-center mb-6">
            <img 
              src={prelanding.logo_url} 
              alt="Logo" 
              className="h-12 object-contain"
            />
          </div>
        )}

        {/* Main Image */}
        {prelanding.main_image_url && (
          <div className="mb-6">
            <img 
              src={prelanding.main_image_url} 
              alt="Main" 
              className="w-full rounded-lg"
            />
          </div>
        )}

        {/* Headline */}
        <h1 className="text-2xl font-display font-bold text-foreground text-center mb-4">
          {prelanding.headline}
        </h1>

        {/* Description */}
        {prelanding.description && (
          <p className="text-muted-foreground text-center mb-6">
            {prelanding.description}
          </p>
        )}

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder={prelanding.email_placeholder || 'Enter your email'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="admin-input text-center"
            required
          />
          <Button 
            type="submit" 
            className="w-full"
            disabled={submitting}
          >
            {submitting ? 'Please wait...' : prelanding.cta_button_text || 'Get Started'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Prelanding;
