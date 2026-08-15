export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function fmtUSD(n: number, digits = 2): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function fmtPct(n: number, digits = 2): string {
  return `${n.toFixed(digits)}%`;
}

export function fmtDecimal(n: number, digits = 2): string {
  return n.toFixed(digits);
}

export function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export function fmtDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
