"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function HeroSection() {
  return (
    <section
      id="vault"
      className="relative px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14"
    >
      <div className="pointer-events-none absolute left-[8%] top-24 hidden h-64 w-64 rounded-full bg-brand-gray/40 lg:block" />
      <div className="pointer-events-none absolute bottom-8 right-[5%] h-48 w-48 rounded-full bg-brand-gray/30 sm:h-72 sm:w-72" />

      <div className="relative mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl border border-brand-gray/70 bg-white p-8 shadow-card sm:p-12 lg:p-16">
          <span className="pointer-events-none absolute right-6 top-6 rounded-full border border-brand-gray bg-brand-bg px-3 py-1.5 text-xs font-medium text-brand-black sm:right-10 sm:top-10">
            Bitcoin
          </span>
          <span className="pointer-events-none absolute right-24 top-24 rounded-full border border-brand-gray bg-white px-3 py-1.5 text-xs font-medium text-brand-black sm:right-36 sm:top-28">
            Ethereum
          </span>

          <div className="relative grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-12">
            <div className="order-2 max-w-md lg:order-1 lg:col-span-4">
              <p className="text-pretty text-sm leading-relaxed text-neutral-600 sm:text-base">
                Novis is an on-chain robo-advisor for USDC on Base: it routes
                liquidity across Aave v3 and Compound v3, rebalancing only when
                the spread clears gas — non-custodial and ERC-4626 aligned.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <button
                      type="button"
                      onClick={openConnectModal}
                      className="rounded-full bg-brand-green px-8 py-3.5 text-sm font-semibold text-white transition duration-300 hover:scale-105 hover:bg-[#3d5a56]"
                    >
                      Connect wallet
                    </button>
                  )}
                </ConnectButton.Custom>
                <a
                  href="/features"
                  className="inline-flex items-center justify-center rounded-full border border-brand-gray bg-white px-8 py-3.5 text-sm font-semibold text-brand-black transition duration-300 hover:scale-105 hover:bg-brand-bg"
                >
                  Learn more
                </a>
              </div>
            </div>

            <div className="order-1 lg:order-2 lg:col-span-8">
              <h1 className="font-display text-balance text-[2.25rem] font-extrabold uppercase leading-[0.95] tracking-tight text-brand-black sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
                <span className="block">Where every</span>
                <span className="block text-brand-green">allocation</span>
                <span className="block">opens new</span>
                <span className="block text-brand-green">horizon</span>
              </h1>
            </div>
          </div>

          <div className="relative mt-12 flex flex-wrap gap-3 border-t border-brand-gray/50 pt-8">
            {["Base", "USDC", "Aave v3", "Compound v3"].map((name) => (
              <span
                key={name}
                className="rounded-full border border-brand-gray bg-brand-bg px-4 py-1.5 text-xs font-medium text-neutral-700"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
