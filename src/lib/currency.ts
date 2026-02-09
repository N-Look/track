// Approximate exchange rates (CAD as base)
// These are rough defaults — user can override per-transaction
const RATES: Record<string, Record<string, number>> = {
  CAD: { CAD: 1, TTD: 5.0, USD: 0.74 },
  TTD: { CAD: 0.2, TTD: 1, USD: 0.148 },
  USD: { CAD: 1.35, TTD: 6.76, USD: 1 },
};

export function convert(
  amount: number,
  from: string,
  to: string,
  customRate?: number
): number {
  if (from === to) return amount;
  if (customRate) return amount * customRate;
  const rate = RATES[from]?.[to] ?? 1;
  return amount * rate;
}

export function getRate(from: string, to: string): number {
  return RATES[from]?.[to] ?? 1;
}

export const CURRENCIES = ["CAD", "TTD", "USD"] as const;

export const currencySymbols: Record<string, string> = {
  CAD: "CA$",
  TTD: "TT$",
  USD: "US$",
};
