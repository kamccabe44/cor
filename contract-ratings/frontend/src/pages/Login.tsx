import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { ShieldIcon } from "../components/Icons";
import { config } from "../config";

export function Login() {
  const { signIn, signedIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (signedIn) return <Navigate to="/contracts" replace />;

  return (
    <div style={{ maxWidth: 360, margin: "4rem auto" }}>
      <div className="card" style={{ padding: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--olive-800)",
            marginBottom: "0.75rem",
          }}
        >
          <ShieldIcon style={{ width: "1.75rem", height: "1.75rem" }} />
          <h1 style={{ margin: 0 }}>Contract Ratings</h1>
        </div>
        <p className="subtitle">
          {config.localMode ? "Enter the shared password to continue." : "Sign in with your existing account."}
        </p>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {!config.localMode && (
            <input
              type="text"
              placeholder="Username or email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          )}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus={config.localMode}
            required
          />
          {error && <p className="error-banner">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
