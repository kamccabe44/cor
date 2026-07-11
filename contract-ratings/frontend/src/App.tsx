import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { ShieldIcon } from "./components/Icons";
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

function NavLinks() {
  const { pathname } = useLocation();
  const links = [
    { to: "/contractors", label: "Contractors" },
    { to: "/contracts", label: "Contracts" },
  ];
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
  return (
    <div className="app-shell">
      {signedIn && (
        <header className="app-header">
          <Link to="/contractors" className="brand">
            <ShieldIcon style={{ width: "1.4rem", height: "1.4rem" }} />
            Contract Ratings
          </Link>
          <NavLinks />
          <div className="header-spacer">
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
