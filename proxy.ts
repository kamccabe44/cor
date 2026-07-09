import { NextRequest, NextResponse } from "next/server";
import { authEnabled, verifySessionToken, SESSION_COOKIE } from "@/lib/session";

export const config = {
  matcher: ["/((?!api/health|login|_next/static|_next/image|favicon.ico).*)"],
};

export async function proxy(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
