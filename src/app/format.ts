const intFmt = new Intl.NumberFormat("en-US");

export function fmtInt(n: number): string {
  return intFmt.format(Math.round(n));
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}

/** Compact magnitude for axis labels: 950, 1.2k, 34k, 5.6M, 1.2B. */
export function fmtCompact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const units = ["", "k", "M", "B", "T"];
  let u = 0;
  let v = n;
  for (;;) {
    // Round first, then decide the unit, so 999_960 reads "1M", not "1000k".
    const r = u === 0 || Math.abs(v) < 100 ? Math.round(v * 10) / 10 : Math.round(v);
    if (Math.abs(r) < 1000 || u === units.length - 1) return String(r) + units[u];
    v /= 1000;
    u++;
  }
}
