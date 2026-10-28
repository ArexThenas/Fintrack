import { parseDate } from './dates.js';

/**
 * Display formatting shared by every page and chart.
 *
 * The active currency is a display preference (Settings → Regional
 * preferences). AppLayout calls `setActiveCurrency` whenever it changes, so
 * components can simply call `formatCurrency(value)`.
 */

export const SUPPORTED_CURRENCIES = Object.freeze([
  { value: 'INR', label: 'Indian Rupee (₹)' },
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
]);

const LOCALE = 'en-IN';

let activeCurrency = 'INR';

export function setActiveCurrency(currency) {
  if (SUPPORTED_CURRENCIES.some((item) => item.value === currency)) {
    activeCurrency = currency;
  }
}

export function getActiveCurrency() {
  return activeCurrency;
}

export function getCurrencySymbol(currency = activeCurrency) {
  try {
    const parts = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);

    return parts.find((part) => part.type === 'currency')?.value ?? currency;
  } catch {
    return currency;
  }
}

/**
 * formatCurrency(1234.5)                      → "₹1,234.50"
 * formatCurrency(1234.5, 'USD')               → "$1,234.50"
 * formatCurrency(1234.5, { maximumFractionDigits: 0 })
 */
export function formatCurrency(value, options) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return '—';

  const settings =
    typeof options === 'string' ? { currency: options } : options ?? {};

  const {
    currency = activeCurrency,
    maximumFractionDigits = 2,
    minimumFractionDigits = 0,
  } = settings;

  try {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency,
      maximumFractionDigits,
      minimumFractionDigits: Math.min(
        minimumFractionDigits,
        maximumFractionDigits,
      ),
    }).format(amount);
  } catch {
    return new Intl.NumberFormat(LOCALE, { maximumFractionDigits }).format(
      amount,
    );
  }
}

/** Whole-currency format used by charts: ₹12,500 */
export function formatCurrencyCompact(value, currency) {
  return formatCurrency(value, { currency, maximumFractionDigits: 0 });
}

/** Axis tick label: 1500 → "2k", 250000 → "2.5L" */
export function formatAxisTick(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return value;

  if (Math.abs(amount) >= 100000) return `${(amount / 100000).toFixed(1)}L`;
  if (Math.abs(amount) >= 1000) return `${(amount / 1000).toFixed(0)}k`;

  return amount;
}

export function formatDate(
  value,
  options = { day: '2-digit', month: 'short', year: 'numeric' },
) {
  if (!value) return '—';

  const date = parseDate(value);

  if (!date) return 'Invalid date';

  return new Intl.DateTimeFormat(LOCALE, options).format(date);
}
