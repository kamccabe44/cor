"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/contracts", label: "Contracts" },
  { href: "/import", label: "Import" },
  { href: "/profile", label: "COR Profile" },
  { href: "/reference", label: "Reference" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-olive-600 text-white" : "text-olive-100 hover:bg-olive-700"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
