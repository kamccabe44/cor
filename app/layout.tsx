import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "COR Contract Tracker",
  description: "Contracting Officer's Representative data tracker for Army CENTCOM units",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex bg-slate-50 text-slate-900">
        <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 px-4 py-6 md:flex">
          <Link href="/" className="mb-6 block px-3">
            <div className="text-sm font-semibold uppercase tracking-wide text-blue-300">COR Tracker</div>
            <div className="text-xs text-slate-400">USCENTCOM &middot; Army</div>
          </Link>
          <Nav />
          <div className="mt-auto px-3 pt-6 text-xs text-slate-500">
            Unofficial tool built from publicly available FAR/DFARS
            guidance. Not a system of record — always follow your
            command&apos;s official COR file and WAWF requirements.
          </div>
        </aside>
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 md:hidden">
            <span className="font-semibold">COR Tracker</span>
          </header>
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
