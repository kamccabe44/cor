import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { ShieldIcon } from "./components/Icons";
import { Login } from "./pages/Login";
import { Contracts } from "./pages/Contracts";
import { ContractDetail } from "./pages/ContractDetail";

// When this instance is deployed as the ALERTS/PEACEMAKER "COR" add-on it lives
// at cor.<parent-host> (e.g. cor.1136.31traino.com), so the main site is the
// parent host with the "cor." prefix stripped. Returns null in local/dev or any
// deployment that doesn't follow that convention, hiding the back-link there.
function parentSiteUrl(): string | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (host.startsWith("cor.") && host.length > 4) {
    return `${window.location.protocol}//${host.slice(4)}`;
  }
  return null;
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { loading, signedIn } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (!signedIn) return <Navigate to="/login" replace />;
  return children;
}

function NavLinks() {
  const { pathname } = useLocation();
  const links = [{ to: "/contracts", label: "Contracts" }];
  return (
    <nav className="app-nav">
      {links.map((l) => (
        <Link key={l.to} to={l.to} className={pathname.startsWith(l.to) ? "active" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

function Shell({ children }: { children: JSX.Element }) {
  const { signedIn, displayName, signOut } = useAuth();
  const parentUrl = parentSiteUrl();
  return (
    <div className="app-shell">
      {signedIn && (
        <header className="app-header">
          <Link to="/contracts" className="brand">
            <ShieldIcon style={{ width: "1.4rem", height: "1.4rem" }} />
            Contract Ratings
          </Link>
          <NavLinks />
          <div className="header-spacer">
            {parentUrl && (
              <a className="header-back" href={parentUrl} title="Back to the main PEACEMAKER site">
                ← PEACEMAKER
              </a>
            )}
            <span className="header-user">{displayName}</span>
            <button className="btn btn-outline" onClick={signOut}>
              Log out
            </button>
          </div>
        </header>
      )}
      <main className="app-main">{children}</main>
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
            <Route path="/" element={<Navigate to="/contracts" replace />} />
            <Route path="*" element={<Navigate to="/contracts" replace />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AuthProvider>
  );
}
