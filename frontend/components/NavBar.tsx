"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const links = [
  { href: "/features", label: "Features" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/buy", label: "Buy" },
  { href: "/sell", label: "Sell & Trade" },
];

function SearchIconButton() {
  return (
    <button
      type="button"
      aria-label="Search"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-gray bg-white text-brand-black transition duration-300 hover:scale-105 hover:border-brand-green/40 hover:bg-brand-bg"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.2-4.2" />
      </svg>
    </button>
  );
}

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-brand-gray/60 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-brand-black"
        >
          <span
            className="h-2 w-2 rounded-sm bg-brand-green"
            aria-hidden
          />
          novis
        </Link>
        <nav
          className="hidden items-center gap-8 lg:flex"
          aria-label="Primary"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition duration-300 hover:text-brand-black ${pathname === l.href
                  ? "text-brand-black underline underline-offset-4 decoration-brand-green decoration-2"
                  : "text-neutral-600"
                }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <SearchIconButton />
          <details className="relative lg:hidden">
            <summary className="flex h-10 cursor-pointer list-none items-center justify-center rounded-full border border-brand-gray bg-white px-3 text-xs font-medium text-neutral-700 transition duration-300 hover:scale-105">
              Menu
            </summary>
            <div className="absolute right-0 z-20 mt-2 min-w-[11rem] rounded-2xl border border-brand-gray/80 bg-white p-2 shadow-soft">
              {links.map((l) => (
                <Link
                  key={`${l.href}-m`}
                  href={l.href}
                  className={`block rounded-xl px-3 py-2.5 text-sm transition duration-300 hover:bg-brand-bg ${pathname === l.href
                      ? "font-semibold text-brand-black"
                      : "text-neutral-700"
                    }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </details>
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="address"
          />
        </div>
      </div>
    </header>
  );
}
