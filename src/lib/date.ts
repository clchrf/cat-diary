const TZ = "Asia/Taipei";

export function nowIso(): string {
  return new Date().toISOString();
}

export function dateKeyOf(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dateKeyOf(new Date());
}

export function formatTimeOfDay(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatDateLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${m}/${d}`;
}

export function dateKeysBetween(startKey: string, endKey: string): string[] {
  const [sy, sm, sd] = startKey.split("-").map(Number);
  const [ey, em, ed] = endKey.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const keys: string[] = [];
  const cur = new Date(Math.min(start.getTime(), end.getTime()));
  const last = new Date(Math.max(start.getTime(), end.getTime()));
  while (cur <= last) {
    keys.push(dateKeyOf(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}

export function dateKeysInRange(days: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.push(dateKeyOf(d));
  }
  return keys;
}
