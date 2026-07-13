import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";
import { config } from "./config";

// Constructed lazily: `new CognitoUserPool` throws if the pool/client IDs
// are missing, which is exactly the case in the local/container build
// (VITE_LOCAL_MODE) where Cognito is never used. Building it on first use
// keeps this module importable there without crashing at load.
let _pool: CognitoUserPool | null = null;
function pool(): CognitoUserPool {
  if (!_pool) {
    _pool = new CognitoUserPool({ UserPoolId: config.cognitoUserPoolId, ClientId: config.cognitoClientId });
  }
  return _pool;
}

export function signIn(username: string, password: string): Promise<CognitoUserSession> {
  const user = new CognitoUser({ Username: username, Pool: pool() });
  const details = new AuthenticationDetails({ Username: username, Password: password });

  return new Promise((resolve, reject) => {
    user.authenticateUser(details, {
      onSuccess: (session) => resolve(session),
      onFailure: (err) => reject(err),
      newPasswordRequired: () => {
        reject(new Error("This account requires a new password. Set one in the os_alerts app first, then sign in here."));
      },
    });
  });
}

export function signOut(): void {
  pool().getCurrentUser()?.signOut();
}

// Resolves the current session, silently refreshing the ID token if it's
// expired but the refresh token is still valid. Returns null if there's
// no signed-in user at all.
export function getSession(): Promise<CognitoUserSession | null> {
  const user = pool().getCurrentUser();
  if (!user) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err) return reject(err);
      resolve(session);
    });
  });
}

export async function getIdToken(): Promise<string | null> {
  const session = await getSession();
  if (!session || !session.isValid()) return null;
  return session.getIdToken().getJwtToken();
}

export function currentDisplayName(session: CognitoUserSession): string {
  const claims = session.getIdToken().payload as Record<string, unknown>;
  return (claims.email as string) || (claims["cognito:username"] as string) || "signed in";
}
