// Shared-password auth for the container build. Talks to the same-origin
// server endpoints (server.mjs); the session lives in an HttpOnly cookie
// the browser sends automatically on same-origin requests, so there's no
// token to manage client-side.

export type LocalSession = { signedIn: boolean; name: string | null };

export async function getLocalSession(): Promise<LocalSession> {
  try {
    const res = await fetch("/api/session");
    if (!res.ok) return { signedIn: false, name: null };
    return await res.json();
  } catch {
    return { signedIn: false, name: null };
  }
}

export async function localSignIn(password: string): Promise<LocalSession> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Sign-in failed");
  return { signedIn: true, name: data.name ?? "COR user" };
}

export async function localSignOut(): Promise<void> {
  await fetch("/api/logout", { method: "POST" }).catch(() => {});
}
