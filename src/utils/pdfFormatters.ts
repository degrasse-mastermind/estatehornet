import { currency } from "./date";

export function formatPdfDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).format(date);
}

export function formatPdfCurrency(value?: string | number | null) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) return "";
  return currency(numeric);
}

export function formatYesNo(value?: string | boolean | null) {
  if (value === true || value === "yes") return "Yes";
  if (value === false || value === "no") return "No";
  return "";
}

export function formatCheckbox(value?: string | boolean | null, checkedWhen?: string | boolean) {
  if (checkedWhen !== undefined) return value === checkedWhen;
  return value === true || value === "yes";
}

export function formatPhone(value?: string | null) {
  return value?.trim() || "";
}

export function formatMultilineList(value?: string | string[] | null) {
  if (Array.isArray(value)) return value.filter(Boolean).join("\n");
  return value?.trim() || "";
}

export function formatFullAddress(parts: Array<string | undefined | null>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ");
}

export function missingValueLabel(label: string) {
  return `Missing ${label}`;
}
