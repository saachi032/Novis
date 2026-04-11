export type RiskLevelId = "conservative" | "balanced" | "aggressive";

export type SwapCadenceId = "24h" | "48h" | "72h";

const PREFIX = "novis:depositPrefs:";

export type StoredDepositPrefs = {
  risk: RiskLevelId;
  swapCadence: SwapCadenceId;
};

export function depositPrefsKey(address: string): string {
  return PREFIX + address.toLowerCase();
}

export function readDepositPrefs(address: string): StoredDepositPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(depositPrefsKey(address));
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<StoredDepositPrefs>;
    if (
      p.risk !== "conservative" &&
      p.risk !== "balanced" &&
      p.risk !== "aggressive"
    ) {
      return null;
    }
    if (
      p.swapCadence !== "24h" &&
      p.swapCadence !== "48h" &&
      p.swapCadence !== "72h"
    ) {
      return null;
    }
    return { risk: p.risk, swapCadence: p.swapCadence };
  } catch {
    return null;
  }
}

export function writeDepositPrefs(
  address: string,
  prefs: StoredDepositPrefs
): void {
  localStorage.setItem(depositPrefsKey(address), JSON.stringify(prefs));
}
