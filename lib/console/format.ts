/** Display helpers for the console. Dates are ISO strings. */

/** Unit counts read 100,000 as in the mockups; money keeps Indian grouping (₹12,50,000). */
export const fmtNum = (n: number) => Math.round(n).toLocaleString("en-US");
export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export function lakh(n: number) {
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  return inr(n);
}

/** "12 Jun 2026" */
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
/** "12 Jun" */
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
/** "12 Mar 2026, 10:30 AM" */
export const fmtDateTime = (iso: string) =>
  `${fmtDate(iso)}, ${new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;

/** "2 hours ago", "1 day ago", "1 week ago" */
export function ago(iso: string, now = Date.now()) {
  const m = Math.round((now - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d > 1 ? "s" : ""} ago`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w} week${w > 1 ? "s" : ""} ago`;
  const mo = Math.round(d / 30);
  return `${mo} month${mo > 1 ? "s" : ""} ago`;
}

/** Whole days from now to the date (negative when past). */
export const daysUntil = (iso: string, now = Date.now()) => Math.round((new Date(iso).getTime() - now) / 864e5);

/** Save a text file (CSV, invoice) to the viewer's machine. */
export function download(name: string, body: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function csv(rows: (string | number)[][]) {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}
