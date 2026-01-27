import { supabase } from "@/integrations/supabase/client";

const SUPABASE_FUNCTIONS_BASE_URL =
  "https://juxjsxgmghpdhurjkmyd.supabase.co/functions/v1";

// Publishable (anon) key is safe to ship to the client.
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1eGpzeGdtZ2hwZGh1cmprbXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDAwNjIsImV4cCI6MjA4MDMxNjA2Mn0.FhQyySpXz2y5AIJv3Evr72lRe4I_rKr9AGSf1phZm3E";

type InvokeOk<T> = { data: T; error: null };
type InvokeErr = { data: null; error: Error };

// Some hosting setups / browser extensions can cause `supabase.functions.invoke` to fail
// with a generic network error. We fall back to a direct fetch against the function URL.
export async function invokeEdgeFunction<T>(
  functionName: string,
  body: unknown,
): Promise<InvokeOk<T> | InvokeErr> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, { body });
    if (error) throw error;
    return { data: data as T, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);

    // Fallback only for common network-style failures.
    const shouldFallback =
      msg.includes("Failed to send a request to the Edge Function") ||
      msg.toLowerCase().includes("failed to fetch") ||
      msg.toLowerCase().includes("network");

    if (!shouldFallback) {
      return { data: null, error: e instanceof Error ? e : new Error(msg) };
    }

    try {
      const resp = await fetch(
        `${SUPABASE_FUNCTIONS_BASE_URL}/${encodeURIComponent(functionName)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(body ?? {}),
        },
      );

      const text = await resp.text();
      if (!resp.ok) {
        // Preserve useful errors like 429/402.
        const details = text?.trim() ? ` — ${text.trim()}` : "";
        return {
          data: null,
          error: new Error(`Edge Function error (${resp.status})${details}`),
        };
      }

      return { data: (text ? JSON.parse(text) : {}) as T, error: null };
    } catch (fallbackErr) {
      const fallbackMsg =
        fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      return {
        data: null,
        error: new Error(`${msg} (fallback failed: ${fallbackMsg})`),
      };
    }
  }
}
