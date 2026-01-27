// Direct fetch wrapper for Supabase Edge Functions
// Avoids SDK issues on custom domains / Render deployments

const SUPABASE_FUNCTIONS_BASE_URL =
  "https://juxjsxgmghpdhurjkmyd.supabase.co/functions/v1";

// Publishable (anon) key is safe to ship to the client.
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1eGpzeGdtZ2hwZGh1cmprbXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDAwNjIsImV4cCI6MjA4MDMxNjA2Mn0.FhQyySpXz2y5AIJv3Evr72lRe4I_rKr9AGSf1phZm3E";

type InvokeOk<T> = { data: T; error: null };
type InvokeErr = { data: null; error: Error };

// Some hosting setups / browser extensions can cause `supabase.functions.invoke` to fail
// with a generic network error. We fall back to a direct fetch against the function URL.
/**
 * Directly calls the Supabase Edge Function via fetch (skips the SDK wrapper).
 * This avoids "Failed to send a request to the Edge Function" issues that occur
 * on some hosting setups / custom domains / when browser extensions interfere.
 */
export async function invokeEdgeFunction<T>(
  functionName: string,
  body: unknown,
): Promise<InvokeOk<T> | InvokeErr> {
  const url = `${SUPABASE_FUNCTIONS_BASE_URL}/${encodeURIComponent(functionName)}`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body ?? {}),
    });

    const text = await resp.text();

    if (!resp.ok) {
      const details = text?.trim() ? ` — ${text.trim()}` : "";
      return {
        data: null,
        error: new Error(`Edge Function error (${resp.status})${details}`),
      };
    }

    return { data: (text ? JSON.parse(text) : {}) as T, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: null, error: new Error(msg) };
  }
}
