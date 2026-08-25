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

// Asia/Taipei has no DST and is a fixed UTC+8 year-round, so a Y/M/D
// calendar date there always maps to this UTC instant — this keeps
// calendar math correct regardless of the device's own local timezone.
function taipeiMidnightUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - 8 * 60 * 60 * 1000);
}

export interface CalendarCell {
  dateKey: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

/** Monday-first calendar grid for the given year/month (1-12), padded with adjacent-month days. */
export function calendarGrid(year: number, month: number): CalendarCell[] {
  const today = todayKey();
  const firstOfMonth = taipeiMidnightUtc(year, month, 1);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // getUTCDay(): 0=Sun..6=Sat, convert to Monday-first offset (0=Mon..6=Sun)
  const leadingOffset = (firstOfMonth.getUTCDay() + 6) % 7;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < leadingOffset; i++) {
    const d = taipeiMidnightUtc(year, month, 1 - (leadingOffset - i));
    cells.push({ dateKey: dateKeyOf(d), day: d.getUTCDate(), inMonth: false, isToday: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = dateKeyOf(taipeiMidnightUtc(year, month, day));
    cells.push({ dateKey, day, inMonth: true, isToday: dateKey === today });
  }
  let trailingDay = daysInMonth + 1;
  while (cells.length % 7 !== 0) {
    const d = taipeiMidnightUtc(year, month, trailingDay);
    cells.push({ dateKey: dateKeyOf(d), day: d.getUTCDate(), inMonth: false, isToday: false });
    trailingDay += 1;
  }
  return cells;
}

export function monthDateKeys(year: number, month: number): string[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const keys: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    keys.push(dateKeyOf(taipeiMidnightUtc(year, month, day)));
  }
  return keys;
}

export function formatMonthLabel(year: number, month: number): string {
  return `${year} 年 ${month} 月`;
}

export function formatFullDateLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${m} 月 ${d} 日`;
}

/** True once it's past the given hour (24h, Asia/Taipei) today — used only to
 * decide whether the cat can settle into a quiet/resting state; never used
 * to imply "medication not taken". */
export function isPastHourToday(hour: number): boolean {
  const nowHour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(new Date())
  );
  return nowHour >= hour;
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
