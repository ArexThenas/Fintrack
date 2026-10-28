/**
 * UPI payment-intent helpers.
 *
 * These build and validate "upi://pay?..." links. A link only asks a UPI
 * app to open with the details filled in; it does not move money or prove
 * that a payment succeeded.
 */

const DEFAULT_CURRENCY = 'INR';
const MAX_AMOUNT = 10000000;

// local-part@provider, e.g. name@okbank
const UPI_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}@[a-zA-Z0-9.-]{2,64}$/;

/**
 * Check the format of a UPI ID. This does not confirm that the ID exists.
 */
export function isValidUpiId(value) {
  if (typeof value !== 'string') return false;

  const upiId = value.trim();

  if (upiId.length < 3 || upiId.length > 255) return false;

  return UPI_ID_PATTERN.test(upiId);
}

/**
 * Validate and normalize a payment amount (in rupees).
 * Throws an Error with a user-friendly message when invalid.
 */
export function validateUpiAmount(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    throw new Error('Enter a payment amount.');
  }

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('The payment amount must be greater than zero.');
  }

  if (amount > MAX_AMOUNT) {
    throw new Error('The payment amount exceeds the supported limit.');
  }

  // At most two decimal places. A tolerance avoids floating-point noise
  // (1.15 * 100 === 114.99999999999999).
  const paise = amount * 100;

  if (Math.abs(paise - Math.round(paise)) > 1e-6) {
    throw new Error('The amount cannot have more than two decimal places.');
  }

  return amount;
}

function normalizeText(value, fieldName, maxLength = 80) {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be text.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} cannot exceed ${maxLength} characters.`);
  }

  return normalized;
}

/**
 * Build a UPI payment-intent URL.
 *
 * Required: payeeVpa (recipient UPI ID), payeeName, amount (INR)
 * Optional: note (≤ 80 chars), transactionReference (≤ 35 chars)
 */
export function buildUpiPaymentUrl({
  payeeVpa,
  payeeName,
  amount,
  note = '',
  currency = DEFAULT_CURRENCY,
  transactionReference = '',
} = {}) {
  if (!isValidUpiId(payeeVpa)) {
    throw new Error('Enter a validly formatted recipient UPI ID.');
  }

  const normalizedPayeeName = normalizeText(payeeName, 'Recipient name', 80);
  const normalizedAmount = validateUpiAmount(amount);

  if (currency !== DEFAULT_CURRENCY) {
    throw new Error('UPI payments currently support INR only.');
  }

  if (typeof note !== 'string') {
    throw new Error('Payment note must be text.');
  }

  if (note.length > 80) {
    throw new Error('Payment note cannot exceed 80 characters.');
  }

  if (typeof transactionReference !== 'string') {
    throw new Error('Transaction reference must be text.');
  }

  if (transactionReference.length > 35) {
    throw new Error('Transaction reference cannot exceed 35 characters.');
  }

  const params = new URLSearchParams({
    pa: payeeVpa.trim(),
    pn: normalizedPayeeName,
    am: normalizedAmount.toFixed(2),
    cu: DEFAULT_CURRENCY,
  });

  const normalizedNote = note.trim();
  if (normalizedNote) params.set('tn', normalizedNote);

  const normalizedReference = transactionReference.trim();
  if (normalizedReference) params.set('tr', normalizedReference);

  return `upi://pay?${params.toString()}`;
}

/**
 * Parse and validate a UPI payment-intent URL.
 * Useful for checking a generated link before opening it.
 */
export function parseUpiPaymentUrl(paymentUrl) {
  if (typeof paymentUrl !== 'string') {
    throw new Error('Payment URL must be text.');
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(paymentUrl);
  } catch {
    throw new Error('The payment URL is invalid.');
  }

  if (parsedUrl.protocol !== 'upi:' || parsedUrl.hostname !== 'pay') {
    throw new Error('The URL is not a supported UPI payment link.');
  }

  const params = parsedUrl.searchParams;
  const payeeVpa = params.get('pa');
  const payeeName = params.get('pn');
  const currency = params.get('cu');

  if (!isValidUpiId(payeeVpa)) {
    throw new Error('The payment URL has an invalid recipient UPI ID.');
  }

  if (!payeeName?.trim()) {
    throw new Error('The payment URL is missing the recipient name.');
  }

  if (currency !== DEFAULT_CURRENCY) {
    throw new Error('The payment URL must use INR.');
  }

  return {
    payeeVpa,
    payeeName,
    amount: validateUpiAmount(params.get('am')),
    currency,
    note: params.get('tn') || '',
    transactionReference: params.get('tr') || '',
  };
}

export default {
  isValidUpiId,
  validateUpiAmount,
  buildUpiPaymentUrl,
  parseUpiPaymentUrl,
};
