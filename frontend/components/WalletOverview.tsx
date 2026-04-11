"use client";

import { useAccount, useBalance } from "wagmi";

const USDC_BASE =
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletOverview() {
  const { address, isConnected } = useAccount();
  const { data: bal } = useBalance({
    address,
    token: USDC_BASE,
    query: { enabled: !!address },
  });

  return (
    <div className="surface-card p-5 transition duration-300 hover:scale-[1.01]">
      <h3 className="text-sm font-semibold text-brand-black">Wallet</h3>
      {!isConnected || !address ? (
        <p className="mt-4 text-sm text-neutral-600">
          Connect a wallet on Base to see your address and USDC balance.
        </p>
      ) : (
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-xs font-medium text-neutral-500">Address</dt>
            <dd className="mt-1 font-mono text-xs text-brand-black sm:text-sm">
              {shorten(address)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-500">
              USDC balance
            </dt>
            <dd className="mt-1 font-medium text-brand-black">
              {bal
                ? `${Number(bal.formatted).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })} ${bal.symbol}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-500">
              Share price (demo)
            </dt>
            <dd className="mt-1 font-medium text-brand-black">$1.024</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
