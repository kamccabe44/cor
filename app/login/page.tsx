import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authEnabled, checkPassword, createSessionToken, verifySessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";
import { ShieldIcon } from "@/components/Icons";

async function login(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!checkPassword(password)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const token = await createSessionToken();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect(next || "/");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  if (!authEnabled()) redirect("/");

  const jar = await cookies();
  if (await verifySessionToken(jar.get(SESSION_COOKIE)?.value)) redirect(params.next || "/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2 text-olive-800">
            <ShieldIcon className="h-7 w-7" />
            <h1 className="text-xl font-bold">COR Contract Tracker</h1>
          </div>
          <p className="mb-4 text-sm text-slate-500">Enter the shared password to continue.</p>
          {params.error && (
            <p className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              Incorrect password.
            </p>
          )}
          <form action={login} className="flex flex-col gap-3">
            <input type="hidden" name="next" value={params.next ?? "/"} />
            <input
              type="password"
              name="password"
              autoFocus
              required
              placeholder="Password"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-olive-500 focus:outline-none focus:ring-1 focus:ring-olive-500"
            />
            <button
              type="submit"
              className="rounded-md bg-olive-700 px-4 py-2 text-sm font-semibold text-white hover:bg-olive-800"
            >
              Log in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
