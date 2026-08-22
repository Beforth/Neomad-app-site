function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function padZ(n: number) { return String(n).padStart(2, '0'); }

export function toDateStr(d: Date) {
  return `${d.getFullYear()}-${padZ(d.getMonth() + 1)}-${padZ(d.getDate())}`;
}

export function getMonday(d: Date) {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** Inclusive list of `YYYY-MM-DD` strings from `fromDate` to `toDate`. */
export function dateRange(fromDate: string, toDate: string): string[] {
  const out: string[] = [];
  const start = parseDate(fromDate);
  const end = parseDate(toDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return out;
  let cur = start;
  while (cur <= end) {
    out.push(toDateStr(cur));
    cur = addDays(cur, 1);
  }
  return out;
}

/** Inclusive list of `YYYY-MM-DD` strings in the range, skipping Sundays. */
export function workingDateRange(fromDate: string, toDate: string): string[] {
  return dateRange(fromDate, toDate).filter((_, i) => {
    const d = parseDate(fromDate);
    d.setDate(d.getDate() + i);
    return d.getDay() !== 0;
  });
}

/** Number of non-Sunday days in the inclusive range. */
export function countWorkingDays(fromDate: string, toDate: string): number {
  return workingDateRange(fromDate, toDate).length;
}
