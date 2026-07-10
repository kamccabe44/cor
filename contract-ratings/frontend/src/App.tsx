import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { Login } from "./pages/Login";
import { Contractors } from "./pages/Contractors";
import { ContractorDetail } from "./pages/ContractorDetail";
import { Contracts } from "./pages/Contracts";
import { ContractDetail } from "./pages/ContractDetail";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { loading, signedIn } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (!signedIn) return <Navigate to="/login" replace />;
  return children;
}

function Shell({ children }: { children: JSX.Element }) {
  const { signedIn, displayName, signOut } = useAuth();
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "1rem", fontFamily: "system-ui, sans-serif" }}>
      {signedIn && (
        <nav style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.5rem" }}>
          <Link to="/contractors">Contractors</Link>
          <Link to="/contracts">Contracts</Link>
          <span style={{ marginLeft: "auto", color: "#666", fontSize: "0.9em" }}>{displayName}</span>
          <button onClick={signOut}>Log out</button>
        </nav>
      )}
      {children}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/contractors"
              element={
                <RequireAuth>
                  <Contractors />
                </RequireAuth>
              }
            />
            <Route
              path="/contractors/:id"
              element={
                <RequireAuth>
                  <ContractorDetail />
                </RequireAuth>
              }
            />
            <Route
              path="/contracts"
              element={
                <RequireAuth>
                  <Contracts />
                </RequireAuth>
              }
            />
            <Route
              path="/contracts/:id"
              element={
                <RequireAuth>
                  <ContractDetail />
                </RequireAuth>
              }
            />
            <Route path="/" element={<Navigate to="/contractors" replace />} />
            <Route path="*" element={<Navigate to="/contractors" replace />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AuthProvider>
  );
}
