"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/contracts", label: "Contracts" },
  { href: "/import", label: "Import from USASpending" },
  { href: "/profile", label: "COR Profile" },
  { href: "/reference", label: "Reference Library" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-blue-800 text-white" : "text-slate-200 hover:bg-slate-700"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
