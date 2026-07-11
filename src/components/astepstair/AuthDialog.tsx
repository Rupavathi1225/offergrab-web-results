import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AuthDialog({ open, onClose, initialMode = "signin" }: { open: boolean; onClose: () => void; initialMode?: "signin" | "signup" }) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name } },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
        onClose();
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        onClose();
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        toast.success("Reset link sent");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <div className="astepstair">
      <div className="as-popup-overlay" onClick={onClose}>
        <div className="as-popup" onClick={(e) => e.stopPropagation()}>
          <button className="close-pop" onClick={onClose}>×</button>
          <h2>{mode === "signup" ? "Create your account" : mode === "reset" ? "Reset password" : "Welcome back"}</h2>
          <p>{mode === "signup" ? "Join to comment, like, and save articles." : mode === "reset" ? "We'll email you a link." : "Sign in to like, comment, and follow topics."}</p>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mode === "signup" && (
              <input required placeholder="Display name" value={name} onChange={e => setName(e.target.value)}
                style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 6, background: "var(--ivory2)", fontFamily: "'JetBrains Mono',monospace", fontSize: 14 }} />
            )}
            <input required type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)}
              style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 6, background: "var(--ivory2)", fontFamily: "'JetBrains Mono',monospace", fontSize: 14 }} />
            {mode !== "reset" && (
              <input required type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} minLength={6}
                style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 6, background: "var(--ivory2)", fontFamily: "'JetBrains Mono',monospace", fontSize: 14 }} />
            )}
            <button type="submit" disabled={loading}
              style={{ background: "var(--ink)", color: "var(--ivory)", border: "none", padding: 14, borderRadius: 6, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, cursor: "pointer", textTransform: "uppercase", fontSize: 12, letterSpacing: ".04em" }}>
              {loading ? "…" : mode === "signup" ? "Create Account" : mode === "reset" ? "Send reset link" : "Sign In"}
            </button>
          </form>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontFamily: "'JetBrains Mono',monospace", fontSize: 12 }}>
            {mode === "signin" ? (
              <>
                <button onClick={() => setMode("signup")} style={{ background: "none", border: "none", color: "var(--brass)", cursor: "pointer" }}>Create account →</button>
                <button onClick={() => setMode("reset")} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}>Forgot password?</button>
              </>
            ) : (
              <button onClick={() => setMode("signin")} style={{ background: "none", border: "none", color: "var(--brass)", cursor: "pointer" }}>← Back to sign in</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
