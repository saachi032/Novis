export function FooterSection() {
  return (
    <footer
      id="faq"
      className="border-t border-brand-gray/60 bg-brand-bg px-4 py-14 sm:px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 sm:flex-row">
        <div className="text-center sm:text-left">
          <p className="flex items-center justify-center gap-2 font-display text-base font-bold text-brand-black sm:justify-start">
            <span
              className="h-2 w-2 rounded-sm bg-brand-green"
              aria-hidden
            />
            Novis
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            DeFi Yield Optimizer · Base · USDC / USDT / DAI
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-8 text-xs font-medium text-neutral-600">
          <a
            href="#"
            className="transition duration-300 hover:text-brand-black"
          >
            Docs
          </a>
          <a
            href="/marketplace"
            className="transition duration-300 hover:text-brand-black"
          >
            Dashboard
          </a>
          <a
            href="https://docs.base.org"
            className="transition duration-300 hover:text-brand-black"
            target="_blank"
            rel="noreferrer"
          >
            Base
          </a>
        </div>
        <a
          href="#vault"
          className="rounded-full border border-brand-gray bg-white px-5 py-2.5 text-xs font-semibold text-brand-black transition duration-300 hover:scale-105 hover:bg-brand-bg"
        >
          Need help?
        </a>
      </div>
    </footer>
  );
}
