const STORAGE_PREFIX = "novis:walletDisplayName:";

export function walletDisplayNameKey(address: string): string {
  return STORAGE_PREFIX + address.toLowerCase();
}

export function readWalletDisplayName(address: string): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(walletDisplayNameKey(address));
  if (!v) return null;
  const t = v.trim();
  return t.length ? t : null;
}

export function writeWalletDisplayName(address: string, name: string): void {
  localStorage.setItem(walletDisplayNameKey(address), name.trim());
}

export function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
