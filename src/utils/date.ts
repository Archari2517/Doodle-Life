/**
 * Local-date helpers.
 *
 * IMPORTANT: Never use `date.toISOString().split('T')[0]` to get a "YYYY-MM-DD"
 * string for a Date that represents a LOCAL calendar day (e.g. `new Date()`,
 * `new Date(y, m, d)`, or a Date after `.setDate(...)`). `toISOString()` first
 * converts the Date to UTC, which shifts the date backward by one day for any
 * positive UTC-offset timezone (e.g. Bangkok, UTC+7) whenever local time is
 * before the UTC offset catches up (e.g. midnight–7am in Bangkok), and can
 * shift dates around month/day-grid boundaries too.
 *
 * Always build "YYYY-MM-DD" strings from the LOCAL year/month/date fields
 * instead, using `toLocalDateStr` below.
 */
export function toLocalDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Today's date as "YYYY-MM-DD" in the user's local timezone. */
export function getLocalTodayStr(): string {
  return toLocalDateStr(new Date());
}
