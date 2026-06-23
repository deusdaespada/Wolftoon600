// Helpers for <input type="datetime-local"> ↔ ISO conversions.
// datetime-local always represents local wall-clock time (no timezone).
// new Date("YYYY-MM-DDTHH:mm") parses as local — so .toISOString() correctly
// converts to UTC. The tricky part is producing a "min" attribute or default
// value: we must format the LOCAL time, not call toISOString() (UTC).

const pad = (n: number) => String(n).padStart(2, '0');

/** Local time formatted for <input type="datetime-local">. */
export const toLocalDatetimeInput = (date: Date = new Date()): string => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** Parse a datetime-local string into a Date (local timezone). Returns null if invalid. */
export const parseLocalDatetimeInput = (value: string): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

/** Convert a datetime-local input to ISO (UTC) safely. Empty → null. */
export const localDatetimeToIso = (value: string): string | null => {
  const d = parseLocalDatetimeInput(value);
  return d ? d.toISOString() : null;
};

/** Convert an ISO/UTC date back to datetime-local string in user's timezone. */
export const isoToLocalDatetimeInput = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : toLocalDatetimeInput(d);
};
