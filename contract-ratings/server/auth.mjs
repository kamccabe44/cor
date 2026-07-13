// Shared-password session for the container build (replaces Cognito).
// One password gates the whole app; a successful login gets an
// HMAC-signed, expiring token stored in an HttpOnly cookie.
import { createHmac, timingSafeEqual } from "node:crypto";

export function createAuth({ password, secret, ttlSeconds = 60 * 60 * 24 * 7 }) {
  function sign(payload) {
    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = createHmac("sha256", secret).update(data).digest("base64url");
    return `${data}.${sig}`;
  }

  function verify(token) {
    if (!token) return null;
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expected = createHmac("sha256", secret).update(data).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    try {
      const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
      return typeof payload.exp === "number" && payload.exp > Date.now() ? payload : null;
    } catch {
      return null;
    }
  }

  function checkPassword(candidate) {
    const a = Buffer.from(String(candidate ?? ""));
    const b = Buffer.from(password);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  function issue(name = "COR user") {
    return sign({ exp: Date.now() + ttlSeconds * 1000, name });
  }

  return { checkPassword, issue, verify, ttlSeconds };
}
