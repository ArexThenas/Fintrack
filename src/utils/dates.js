/**
 * Date helpers.
 *
 * Transactions store their date as a plain "YYYY-MM-DD" string (what
 * <input type="date"> produces). `new Date("2026-10-01")` treats that string
 * as UTC midnight, which lands on the previous day for users west of UTC.
 * These helpers always read such strings as LOCAL calendar dates.
 */

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Convert a "YYYY-MM-DD" string, ISO string, timestamp, or Date into a Date.
 * Returns null when the value is not a valid date.
 */
export function parseDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const text = value.trim();
  const match = DATE_KEY_PATTERN.exec(text);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);

    // Reject impossible dates such as 2026-02-31.
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Local calendar date as "YYYY-MM-DD". Defaults to today.
 * Returns '' for invalid input.
 */
export function toDateKey(value = new Date()) {
  const date = parseDate(value);

  if (!date) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** "YYYY-MM" key for a local calendar month. */
export function toMonthKey(value = new Date()) {
  const key = toDateKey(value);
  return key ? key.slice(0, 7) : '';
}

/** Midnight (local) at the start of the given day. */
export function startOfDay(value = new Date()) {
  const date = parseDate(value);

  if (!date) return null;

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameMonth(value, reference = new Date()) {
  const date = parseDate(value);
  const ref = parseDate(reference);

  return Boolean(
    date &&
    ref &&
    date.getFullYear() === ref.getFullYear() &&
    date.getMonth() === ref.getMonth(),
  );
}

export function isSameYear(value, reference = new Date()) {
  const date = parseDate(value);
  const ref = parseDate(reference);

  return Boolean(date && ref && date.getFullYear() === ref.getFullYear());
}
