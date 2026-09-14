/**
 * Tiny relative-time formatter. Avoids date-fns to keep bundle size flat.
 * "2 minutes ago", "3 hours ago", "yesterday", "in 4 days", etc.
 */
export function formatDistanceToNow(iso: string | Date, opts: { addSuffix?: boolean } = { addSuffix: true }): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const past = diffSec < 0;

  let str: string;
  if (abs < 60) str = "just now";
  else if (abs < 3600) str = plural(Math.floor(abs / 60), "minute");
  else if (abs < 86_400) str = plural(Math.floor(abs / 3600), "hour");
  else if (abs < 86_400 * 2) str = past ? "yesterday" : "tomorrow";
  else if (abs < 86_400 * 30) str = plural(Math.floor(abs / 86_400), "day");
  else if (abs < 86_400 * 365) str = plural(Math.floor(abs / 86_400 / 30), "month");
  else str = plural(Math.floor(abs / 86_400 / 365), "year");

  if (!opts.addSuffix || str === "just now" || str === "yesterday" || str === "tomorrow") return str;
  return past ? `${str} ago` : `in ${str}`;
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** Format a due date for display: "Due Fri, Mar 6" or "Due tomorrow, 3 PM". */
export function formatDueDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `today, ${time}`;
  if (isTomorrow) return `tomorrow, ${time}`;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
