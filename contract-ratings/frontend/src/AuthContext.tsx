import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSession, signIn as cognitoSignIn, signOut as cognitoSignOut, currentDisplayName } from "./auth";

type AuthState = {
  loading: boolean;
  signedIn: boolean;
  displayName: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    getSession()
      .then((session) => {
        if (session?.isValid()) {
          setSignedIn(true);
          setDisplayName(currentDisplayName(session));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function signIn(username: string, password: string) {
    const session = await cognitoSignIn(username, password);
    setSignedIn(true);
    setDisplayName(currentDisplayName(session));
  }

  function signOut() {
    cognitoSignOut();
    setSignedIn(false);
    setDisplayName(null);
  }

  return (
    <AuthContext.Provider value={{ loading, signedIn, displayName, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
