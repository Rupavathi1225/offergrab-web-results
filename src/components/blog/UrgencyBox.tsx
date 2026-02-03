import { useState, useEffect } from "react";
import { Clock, Mail, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateSessionId } from "@/lib/tracking";

interface UrgencyBoxProps {
  blogSlug: string;
  urgencyHours: number;
  urgencyText: string | null;
  urgencyAction: string | null;
}

const UrgencyBox = ({ blogSlug, urgencyHours, urgencyText, urgencyAction }: UrgencyBoxProps) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initTimer();
  }, [blogSlug, urgencyHours]);

  useEffect(() => {
    if (timeRemaining <= 0 && !loading) {
      // Timer completed - restart it
      restartTimer();
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Timer reached zero - will restart in next tick via useEffect above
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, loading, urgencyHours]);

  const initTimer = async () => {
    const sessionId = getOrCreateSessionId();
    const pageUrl = `/blog/${blogSlug}`;

    try {
      // Check for existing timer for this session + page
      const { data: existingTimer, error } = await supabase
        .from("blog_timers")
        .select("*")
        .eq("session_id", sessionId)
        .eq("page_url", pageUrl)
        .maybeSingle();

      if (error) {
        console.error("Error fetching timer:", error);
        startNewTimer(sessionId, pageUrl);
        return;
      }

      if (existingTimer) {
        const endTime = new Date(existingTimer.end_time).getTime();
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

        if (remaining > 0) {
          setTimeRemaining(remaining);
        } else {
          // Timer expired - restart it
          await restartTimerInDb(existingTimer.id, sessionId, pageUrl);
        }
      } else {
        await startNewTimer(sessionId, pageUrl);
      }
    } catch (err) {
      console.error("Timer init error:", err);
      // Fallback to local timer
      setTimeRemaining(urgencyHours * 60 * 60);
    }

    setLoading(false);
  };

  const startNewTimer = async (sessionId: string, pageUrl: string) => {
    const now = new Date();
    const endTime = new Date(now.getTime() + urgencyHours * 60 * 60 * 1000);

    try {
      await supabase.from("blog_timers").insert({
        session_id: sessionId,
        page_url: pageUrl,
        start_time: now.toISOString(),
        end_time: endTime.toISOString(),
      });

      setTimeRemaining(urgencyHours * 60 * 60);
    } catch (err) {
      console.error("Error creating timer:", err);
      setTimeRemaining(urgencyHours * 60 * 60);
    }
  };

  const restartTimer = async () => {
    const sessionId = getOrCreateSessionId();
    const pageUrl = `/blog/${blogSlug}`;

    const now = new Date();
    const endTime = new Date(now.getTime() + urgencyHours * 60 * 60 * 1000);

    try {
      await supabase
        .from("blog_timers")
        .update({
          start_time: now.toISOString(),
          end_time: endTime.toISOString(),
          is_completed: true,
        })
        .eq("session_id", sessionId)
        .eq("page_url", pageUrl);

      setTimeRemaining(urgencyHours * 60 * 60);
    } catch (err) {
      console.error("Error restarting timer:", err);
      setTimeRemaining(urgencyHours * 60 * 60);
    }
  };

  const restartTimerInDb = async (timerId: string, sessionId: string, pageUrl: string) => {
    const now = new Date();
    const endTime = new Date(now.getTime() + urgencyHours * 60 * 60 * 1000);

    try {
      await supabase
        .from("blog_timers")
        .update({
          start_time: now.toISOString(),
          end_time: endTime.toISOString(),
          is_completed: true,
        })
        .eq("id", timerId);

      setTimeRemaining(urgencyHours * 60 * 60);
    } catch (err) {
      console.error("Error updating timer:", err);
      setTimeRemaining(urgencyHours * 60 * 60);
    }
  };

  const handleEmailSubmit = async () => {
    if (!email || !email.includes("@")) return;

    const sessionId = getOrCreateSessionId();
    const pageUrl = `/blog/${blogSlug}`;

    try {
      await supabase
        .from("blog_timers")
        .update({
          email: email,
          is_submitted: true,
        })
        .eq("session_id", sessionId)
        .eq("page_url", pageUrl);

      setSubmitted(true);
    } catch (err) {
      console.error("Error saving email:", err);
      setSubmitted(true);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  if (loading) {
    return (
      <div className="p-6 rounded-xl bg-purple-600 text-white shadow-lg animate-pulse">
        <div className="h-6 bg-purple-500 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-purple-500 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl bg-purple-600 text-white shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <Clock className="w-6 h-6 animate-pulse" />
        <h3 className="text-xl font-bold">
          {formatTime(timeRemaining)} Remaining
        </h3>
      </div>
      <p className="text-purple-100 mb-4">
        {urgencyText || "Within 3 hours, a consultation form will be available. Please come back or leave your email to get notified."}
      </p>

      {urgencyAction === "email" && !submitted && (
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter your email to get notified..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/20 border-white/30 text-white placeholder:text-purple-200 flex-1"
          />
          <Button
            onClick={handleEmailSubmit}
            className="bg-white text-purple-600 hover:bg-purple-100"
          >
            <Mail className="w-4 h-4 mr-2" />
            Notify Me
          </Button>
        </div>
      )}

      {urgencyAction === "email" && submitted && (
        <div className="flex items-center gap-2 text-emerald-300">
          <Check className="w-5 h-5" />
          <span>Thank you! We'll notify you when the form is available.</span>
        </div>
      )}

      {urgencyAction === "comeback" && (
        <p className="text-purple-200 text-sm italic">
          Please bookmark this page and come back later.
        </p>
      )}

      {urgencyAction === "message" && (
        <p className="text-purple-200 text-sm italic">
          Check back soon for the consultation form.
        </p>
      )}
    </div>
  );
};

export default UrgencyBox;
