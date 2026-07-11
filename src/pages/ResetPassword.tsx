import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase auto-parses the recovery hash into a session
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate("/");
  };

  return (
    <div className="astepstair">
      <div className="as-wrap" style={{ maxWidth: 460, padding: "80px 24px" }}>
        <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 32, marginBottom: 16 }}>Set a new password</h1>
        {!ready ? <p>Open the reset link from your email to continue.</p> : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input required type="password" placeholder="New password" minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 6, fontFamily: "'JetBrains Mono',monospace" }} />
            <button style={{ background: "var(--ink)", color: "var(--ivory)", border: "none", padding: 14, borderRadius: 6, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>Update password</button>
          </form>
        )}
      </div>
    </div>
  );
}
