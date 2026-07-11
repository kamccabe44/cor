import Link from "next/link";
import Nav from "@/components/Nav";
import { authEnabled } from "@/lib/session";
import { logoutAction } from "@/lib/auth-actions";
import { ShieldIcon, BellIcon } from "@/components/Icons";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-olive-800 text-white">
        <div className="flex items-center gap-6 px-4 py-3 md:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <ShieldIcon className="h-6 w-6" />
            <span className="text-base font-bold tracking-tight">COR Contract Tracker</span>
          </Link>
          <div className="hidden md:block">
            <Nav />
          </div>
          <div className="ml-auto flex items-center gap-4">
            <BellIcon className="hidden h-5 w-5 text-olive-300 md:block" />
            {authEnabled() && (
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md border border-olive-600 px-3 py-1.5 text-xs font-semibold text-olive-100 hover:bg-olive-700"
                >
                  Log out
                </button>
              </form>
            )}
          </div>
        </div>
        <div className="border-t border-olive-700/60 px-4 py-1.5 text-center text-[11px] text-olive-200 md:hidden">
          <Nav />
        </div>
      </header>
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-400 md:px-8">
        Unofficial tool built from publicly available FAR/DFARS guidance. Not a system of record — always follow
        your command&apos;s official COR file and WAWF requirements.
      </footer>
    </div>
  );
}
