"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletControl } from "@/components/wallet/ConnectWalletControl";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "/features", label: "Features" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/backtest", label: "Backtest" },
  { href: "/buy", label: "Buy" },
  { href: "/sell", label: "Sell & Trade" },
];

export function NavBar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/marketplace"
      ? pathname === href || pathname.startsWith("/marketplace/")
      : pathname === href;

  return (
    <header className="sticky top-0 z-50 border-b border-[#3f5653]/40 bg-[#557571]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6">
        
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-white"
        >
          <span
            className="h-3 w-3 rounded-sm bg-white"
            aria-hidden
          />
          Novis
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition duration-300 ${
                isActive(l.href)
                  ? "text-white underline underline-offset-4 decoration-white decoration-2"
                  : "text-white/80 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          {/* Mobile Menu */}
          <details className="relative lg:hidden">
            <summary className="flex h-10 cursor-pointer list-none items-center justify-center rounded-full border border-white/20 bg-white/10 px-3 text-xs font-medium text-white transition duration-300 hover:scale-105 hover:bg-white/20">
              Menu
            </summary>

            <div className="absolute right-0 z-20 mt-2 min-w-[11rem] rounded-2xl border border-neutral-200 bg-white p-2 shadow-soft dark:border-neutral-600 dark:bg-neutral-900 dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
              {links.map((l) => (
                <Link
                  key={`${l.href}-m`}
                  href={l.href}
                  className={`block rounded-xl px-3 py-2.5 text-[15px] font-semibold transition duration-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                    isActive(l.href)
                      ? "font-semibold text-black dark:text-white"
                      : "text-neutral-700 dark:text-neutral-200"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </details>

          {/* Wallet */}
          <ConnectWalletControl />
        </div>
      </div>
    </header>
  );
}