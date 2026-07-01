/** Shared formatting helpers for the portal (Romanian locale). */

export function formatNumber(n: number): string {
  return n.toLocaleString("ro-RO");
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
  });
}

export function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

export function timeAgo(iso: string): string {
  const ageMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ageMs / 60000);
  if (min < 1) return "chiar acum";
  if (min < 60) return `acum ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `acum ${h} h`;
  const days = Math.floor(h / 24);
  return days === 1 ? "acum o zi" : `acum ${days} zile`;
}

/** "2026-06-30" → "30 iun." — for daily-series axis labels. */
export function formatDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
}

/** API dayOfWeek: 0=Sunday … 6=Saturday. */
export const DAY_NAMES_RO = [
  "Duminică",
  "Luni",
  "Marți",
  "Miercuri",
  "Joi",
  "Vineri",
  "Sâmbătă",
];

export const DAY_NAMES_RO_SHORT = ["Du", "Lu", "Ma", "Mi", "Jo", "Vi", "Sâ"];
