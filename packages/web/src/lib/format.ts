import { formatUnits } from "viem";

export function shortAddress(addr: string): string {
  if (!addr) return "";
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatTokenAmount(raw: string, decimals: number): string {
  try {
    return parseFloat(formatUnits(BigInt(raw), decimals)).toLocaleString("en-US", {
      maximumFractionDigits: 4,
    });
  } catch {
    return "—";
  }
}

export function relativeToNow(ms: number): string {
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60_000);
  const hr = Math.round(abs / 3_600_000);
  const day = Math.round(abs / 86_400_000);
  const future = diff >= 0;
  if (abs < 60_000) return future ? "any moment" : "just now";
  if (min < 60) return future ? `in ${min}m` : `${min}m ago`;
  if (hr < 48) return future ? `in ${hr}h` : `${hr}h ago`;
  return future ? `in ${day}d` : `${day}d ago`;
}

export function periodLabel(days: number): string {
  if (days === 1) return "daily";
  if (days === 7) return "weekly";
  if (days === 30 || days === 31) return "monthly";
  if (days === 90) return "quarterly";
  if (days === 365) return "yearly";
  return `every ${days} days`;
}
