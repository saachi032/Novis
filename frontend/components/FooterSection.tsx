export function FooterSection() {
  return (
    <footer
      id="faq"
      className="border-t border-brand-gray/60 bg-brand-bg px-4 py-14 transition-colors duration-200 dark:border-neutral-600/50 dark:bg-[#151918] sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 sm:flex-row">
        <div className="text-center sm:text-left">
          <p className="flex items-center justify-center gap-2 font-display text-base font-bold text-brand-black dark:text-neutral-100 sm:justify-start">
            <span
              className="h-2 w-2 rounded-sm bg-brand-green"
              aria-hidden
            />
            Novis
          </p>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            DeFi Yield Optimizer · Base · USDC / USDT / DAI
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-8 text-xs font-medium text-neutral-600 dark:text-neutral-400">
          <a
            href="#"
            className="transition duration-300 hover:text-brand-black dark:hover:text-neutral-100"
          >
            Docs
          </a>
          <a
            href="/marketplace"
            className="transition duration-300 hover:text-brand-black dark:hover:text-neutral-100"
          >
            Dashboard
          </a>
          <a
            href="https://docs.base.org"
            className="transition duration-300 hover:text-brand-black dark:hover:text-neutral-100"
            target="_blank"
            rel="noreferrer"
          >
            Base
          </a>
        </div>
        <a
          href="#vault"
          className="rounded-full border border-brand-gray bg-white px-5 py-2.5 text-xs font-semibold text-brand-black transition duration-300 hover:scale-105 hover:bg-brand-bg dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
        >
          Need help?
        </a>
      </div>
    </footer>
  );
}
