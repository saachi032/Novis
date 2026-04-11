"use client";

import { useAccount, useBalance } from "wagmi";
import { useUserVaultShares, useTotalAssets } from "@/lib/hooks/useVaultData";
import { BASE_SEPOLIA_ADDRESSES } from "@/lib/contracts";

// Use Base Sepolia testnet USDC address
const USDC_ADDRESS = BASE_SEPOLIA_ADDRESSES.usdc;

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletOverview() {
  const { address, isConnected } = useAccount();
  const { data: bal } = useBalance({
    address,
    token: USDC_ADDRESS,
    query: { enabled: !!address },
  });
  const { shares } = useUserVaultShares(address);
  const { totalAssets } = useTotalAssets();

  return (
    <div className="surface-card h-full min-h-[10.5rem] p-5 transition duration-300 hover:scale-[1.01]">
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
              Vault shares
            </dt>
            <dd className="mt-1 font-medium text-brand-black">
              {shares && shares !== "0"
                ? `${Number(shares).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}`
                : "No shares"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-neutral-500">
              Total vault assets
            </dt>
            <dd className="mt-1 font-medium text-brand-black">
              ${Number(totalAssets).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
