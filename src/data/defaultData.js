import { toDateKey } from '../utils/dates.js';

/* =========================================================
   Shared constants
   Every form, filter, chart and table reads from here, so
   categories and payment methods always match.
   ========================================================= */

export const TRANSACTION_TYPES = Object.freeze({
  INCOME: 'income',
  EXPENSE: 'expense',
});

export const PAYMENT_METHODS = Object.freeze([
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Debit / Credit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'other', label: 'Other' },
]);

export const INCOME_CATEGORIES = Object.freeze([
  'Salary',
  'Freelance',
  'Business',
  'Investments',
  'Interest',
  'Rental Income',
  'Gifts',
  'Other',
]);

export const EXPENSE_CATEGORIES = Object.freeze([
  'Food',
  'Groceries',
  'Transport',
  'Shopping',
  'Bills',
  'Housing',
  'Healthcare',
  'Education',
  'Entertainment',
  'Travel',
  'Subscriptions',
  'Personal Care',
  'Family',
  'Investments',
  'Other',
]);

export const BUDGET_PERIODS = Object.freeze([
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]);

export const TRANSACTION_STATUSES = Object.freeze([
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
]);

export const DEFAULT_SETTINGS = Object.freeze({
  name: '',
  email: '',
  currency: 'INR',
  theme: 'light',
  compactMode: false,
});

export function getPaymentMethodLabel(value) {
  return PAYMENT_METHODS.find((method) => method.value === value)?.label ?? value ?? 'Other';
}

export function getBudgetPeriodLabel(value) {
  return BUDGET_PERIODS.find((period) => period.value === value)?.label ?? 'Monthly';
}

/* =========================================================
   Factories
   ========================================================= */

/** A fresh settings object (never mutate the shared defaults). */
export function createDefaultSettings() {
  return { ...DEFAULT_SETTINGS };
}

export function createEmptyFinancialData() {
  return {
    transactions: [],
    budgets: [],
    debts: [],
  };
}

/** Unique local record ID, e.g. "txn-3f2a…". */
export function createRecordId(prefix = 'record') {
  const safePrefix =
    String(prefix || 'record')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '') || 'record';

  const randomId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

  return `${safePrefix}-${randomId}`;
}

function stamp() {
  const now = new Date().toISOString();
  return { createdAt: now, updatedAt: now };
}

/**
 * Create a transaction record with standard defaults.
 * This only builds a record; it never initiates a payment.
 */
export function createTransactionRecord({
  type,
  amount,
  category = 'Other',
  description = '',
  date = toDateKey(),
  paymentMethod = 'other',
  notes = '',
  status = 'completed',
} = {}) {
  if (!['income', 'expense'].includes(type)) {
    throw new Error('Transaction type must be income or expense.');
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Transaction amount must be greater than zero.');
  }

  const dateKey = toDateKey(date);

  if (!dateKey) {
    throw new Error('Transaction date is invalid.');
  }

  if (!PAYMENT_METHODS.some((method) => method.value === paymentMethod)) {
    throw new Error('Unsupported payment method.');
  }

  if (!TRANSACTION_STATUSES.some((item) => item.value === status)) {
    throw new Error('Unsupported transaction status.');
  }

  return {
    id: createRecordId('txn'),
    type,
    amount: Math.round(numericAmount * 100) / 100,
    category: String(category || 'Other').trim() || 'Other',
    description: String(description || '').trim(),
    date: dateKey,
    paymentMethod,
    notes: String(notes || '').trim(),
    status,
    ...stamp(),
  };
}

export function createBudgetRecord({
  category,
  limit,
  period = 'monthly',
} = {}) {
  const normalizedCategory = String(category || '').trim();
  const numericLimit = Number(limit);

  if (!normalizedCategory) {
    throw new Error('Budget category is required.');
  }

  if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
    throw new Error('Budget limit must be greater than zero.');
  }

  if (!BUDGET_PERIODS.some((item) => item.value === period)) {
    throw new Error('Unsupported budget period.');
  }

  return {
    id: createRecordId('budget'),
    category: normalizedCategory,
    limit: Math.round(numericLimit * 100) / 100,
    period,
    ...stamp(),
  };
}

export function createDebtRecord({
  name,
  lender = '',
  principal,
  amountPaid = 0,
  dueDate = '',
  notes = '',
} = {}) {
  const normalizedName = String(name || '').trim();
  const numericPrincipal = Number(principal);
  const numericPaid = Number(amountPaid);

  if (!normalizedName) {
    throw new Error('Debt name is required.');
  }

  if (!Number.isFinite(numericPrincipal) || numericPrincipal <= 0) {
    throw new Error('Debt principal must be greater than zero.');
  }

  if (
    !Number.isFinite(numericPaid) ||
    numericPaid < 0 ||
    numericPaid > numericPrincipal
  ) {
    throw new Error('Amount paid must be between zero and the principal.');
  }

  if (dueDate && !toDateKey(dueDate)) {
    throw new Error('Debt due date is invalid.');
  }

  const roundedPrincipal = Math.round(numericPrincipal * 100) / 100;
  const roundedPaid = Math.round(numericPaid * 100) / 100;

  return {
    id: createRecordId('debt'),
    name: normalizedName,
    lender: String(lender || '').trim(),
    principal: roundedPrincipal,
    amountPaid: roundedPaid,
    outstanding: Math.round((roundedPrincipal - roundedPaid) * 100) / 100,
    dueDate: dueDate ? toDateKey(dueDate) : '',
    notes: String(notes || '').trim(),
    ...stamp(),
  };
}

/**
 * Sample records so a new user can preview the dashboard.
 * Dates are always on or before today.
 */
export function createDemoData(referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const today = referenceDate.getDate();

  // A day in the current month, never later than today.
  const thisMonth = (day) => toDateKey(new Date(year, month, Math.min(day, today)));
  // A day in an earlier month.
  const monthsAgo = (count, day) => toDateKey(new Date(year, month - count, day));

  const expense = (amount, category, description, date, paymentMethod) =>
    createTransactionRecord({ type: 'expense', amount, category, description, date, paymentMethod });

  const income = (amount, category, description, date, paymentMethod) =>
    createTransactionRecord({ type: 'income', amount, category, description, date, paymentMethod });

  const transactions = [
    income(65000, 'Salary', 'Monthly salary', thisMonth(1), 'bank_transfer'),
    expense(2500, 'Groceries', 'Weekly groceries', thisMonth(4), 'upi'),
    expense(1200, 'Transport', 'Travel and commuting', thisMonth(7), 'upi'),
    expense(3500, 'Bills', 'Electricity and internet', thisMonth(10), 'bank_transfer'),
    expense(1800, 'Food', 'Dining out', thisMonth(12), 'card'),
    expense(799, 'Subscriptions', 'Streaming plan', thisMonth(15), 'card'),

    income(65000, 'Salary', 'Monthly salary', monthsAgo(1, 1), 'bank_transfer'),
    income(8000, 'Freelance', 'Design project', monthsAgo(1, 18), 'upi'),
    expense(9000, 'Housing', 'Rent', monthsAgo(1, 3), 'bank_transfer'),
    expense(6200, 'Groceries', 'Groceries', monthsAgo(1, 14), 'upi'),
    expense(4100, 'Shopping', 'Clothes', monthsAgo(1, 22), 'card'),

    income(65000, 'Salary', 'Monthly salary', monthsAgo(2, 1), 'bank_transfer'),
    expense(9000, 'Housing', 'Rent', monthsAgo(2, 3), 'bank_transfer'),
    expense(5400, 'Groceries', 'Groceries', monthsAgo(2, 12), 'upi'),
    expense(3000, 'Travel', 'Weekend trip', monthsAgo(2, 25), 'card'),
  ];

  const budgets = [
    createBudgetRecord({ category: 'Groceries', limit: 8000, period: 'monthly' }),
    createBudgetRecord({ category: 'Transport', limit: 4000, period: 'monthly' }),
    createBudgetRecord({ category: 'Food', limit: 5000, period: 'monthly' }),
  ];

  const debts = [
    createDebtRecord({
      name: 'Personal loan',
      lender: 'Example lender',
      principal: 50000,
      amountPaid: 10000,
    }),
  ];

  return { transactions, budgets, debts };
}

export default {
  TRANSACTION_TYPES,
  PAYMENT_METHODS,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  BUDGET_PERIODS,
  TRANSACTION_STATUSES,
  DEFAULT_SETTINGS,
  getPaymentMethodLabel,
  getBudgetPeriodLabel,
  createDefaultSettings,
  createEmptyFinancialData,
  createRecordId,
  createTransactionRecord,
  createBudgetRecord,
  createDebtRecord,
  createDemoData,
};
