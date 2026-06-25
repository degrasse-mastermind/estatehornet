export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso() {
  return new Date().toISOString();
}

export function makeId(prefix = "id") {
  const value = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${value}`;
}

export function addDays(isoDate: string, days: number) {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addMonths(isoDate: string, months: number) {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function formatDate(isoDate?: string) {
  if (!isoDate) return "Not entered";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${isoDate}T12:00:00`));
}

export function isOverdue(isoDate: string, status?: string) {
  if (!isoDate || status === "done" || status === "filed/sent") return false;
  return new Date(`${isoDate}T23:59:59`).getTime() < new Date().setHours(0, 0, 0, 0);
}

export function isDueWithin(isoDate: string, days: number, status?: string) {
  if (!isoDate || status === "done" || status === "filed/sent") return false;
  const due = new Date(`${isoDate}T12:00:00`).getTime();
  const start = new Date().setHours(0, 0, 0, 0);
  const end = start + days * 24 * 60 * 60 * 1000;
  return due >= start && due <= end;
}

export function daysSince(isoDate: string) {
  if (!isoDate) return 0;
  const then = new Date(isoDate).getTime();
  return Math.floor((Date.now() - then) / (24 * 60 * 60 * 1000));
}

export function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
}
