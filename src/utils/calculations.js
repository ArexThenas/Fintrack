import {
  isSameMonth,
  isSameYear,
  parseDate,
  startOfDay,
  toDateKey,
  toMonthKey,
} from './dates.js';
import { getPaymentMethodLabel } from '../data/defaultData.js';

/* =========================================================
   Rules shared by the dashboard, charts and budgets
   ========================================================= */

const VALID_TRANSACTION_TYPES = new Set(['income', 'expense']);

// Cancelled and failed payments are kept as a record but never counted.
const EXCLUDED_STATUSES = new Set(['cancelled', 'failed']);

function toAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

export function isCountableTransaction(transaction) {
  return Boolean(
    transaction &&
    VALID_TRANSACTION_TYPES.has(transaction.type) &&
    !EXCLUDED_STATUSES.has(String(transaction.status ?? '').toLowerCase()) &&
    toAmount(transaction.amount) > 0 &&
    parseDate(transaction.date),
  );
}

/* =========================================================
   Totals
   ========================================================= */

/** Income, expenses and net balance for a transaction list. */
export function calculateTotals(transactions = []) {
  const totals = { income: 0, expenses: 0, balance: 0 };

  for (const transaction of transactions) {
    if (!isCountableTransaction(transaction)) continue;

    const amount = toAmount(transaction.amount);

    if (transaction.type === 'income') {
      totals.income += amount;
    } else {
      totals.expenses += amount;
    }
  }

  totals.balance = totals.income - totals.expenses;
  return totals;
}

/**
 * Dashboard metrics for all time, the current month and the current year.
 * "Balance" is recorded income minus recorded expenses, not a bank balance.
 */
export function calculateDashboardSummary(
  transactions = [],
  referenceDate = new Date(),
) {
  const valid = transactions.filter(isCountableTransaction);

  const allTime = calculateTotals(valid);
  const currentMonth = calculateTotals(
    valid.filter((item) => isSameMonth(item.date, referenceDate)),
  );
  const currentYear = calculateTotals(
    valid.filter((item) => isSameYear(item.date, referenceDate)),
  );

  return {
    income: allTime.income,
    expenses: allTime.expenses,
    balance: allTime.balance,
    monthlyIncome: currentMonth.income,
    monthlyExpenses: currentMonth.expenses,
    monthlyBalance: currentMonth.balance,
    yearlyIncome: currentYear.income,
    yearlyExpenses: currentYear.expenses,
    yearlyBalance: currentYear.balance,
    transactionCount: valid.length,
  };
}

/* =========================================================
   Chart data
   ========================================================= */

/** Income/expenses per month for the last N months (oldest first). */
export function groupTransactionsByMonth(
  transactions = [],
  { referenceDate = new Date(), months = 6 } = {},
) {
  const count = Math.max(1, Math.min(120, Math.floor(Number(months) || 6)));
  const result = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() - offset,
      1,
    );

    result.push({
      key: toMonthKey(date),
      year: date.getFullYear(),
      month: date.getMonth(),
      income: 0,
      expenses: 0,
      balance: 0,
    });
  }

  const indexByKey = new Map(result.map((item, index) => [item.key, index]));

  for (const transaction of transactions) {
    if (!isCountableTransaction(transaction)) continue;

    const index = indexByKey.get(toMonthKey(transaction.date));

    if (index === undefined) continue;

    const item = result[index];
    const amount = toAmount(transaction.amount);

    if (transaction.type === 'income') {
      item.income += amount;
    } else {
      item.expenses += amount;
    }

    item.balance = item.income - item.expenses;
  }

  return result;
}

/** Expenses grouped by category, largest first. period: month | year | all */
export function calculateExpensesByCategory(
  transactions = [],
  { period = 'month', referenceDate = new Date() } = {},
) {
  const totals = new Map();

  for (const transaction of transactions) {
    if (!isCountableTransaction(transaction)) continue;
    if (transaction.type !== 'expense') continue;
    if (period === 'month' && !isSameMonth(transaction.date, referenceDate)) continue;
    if (period === 'year' && !isSameYear(transaction.date, referenceDate)) continue;

    const category = String(transaction.category || 'Other').trim() || 'Other';

    totals.set(category, (totals.get(category) || 0) + toAmount(transaction.amount));
  }

  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** Expense total for every day of the reference month. */
export function calculateDailyExpenses(
  transactions = [],
  referenceDate = new Date(),
) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const elapsedDays = Math.max(1, referenceDate.getDate());

  const values = Array.from({ length: daysInMonth }, () => 0);

  for (const transaction of transactions) {
    if (!isCountableTransaction(transaction)) continue;
    if (transaction.type !== 'expense') continue;

    const date = parseDate(transaction.date);

    if (date.getFullYear() !== year || date.getMonth() !== month) continue;

    values[date.getDate() - 1] += toAmount(transaction.amount);
  }

  const total = values.reduce((sum, amount) => sum + amount, 0);
  const elapsedTotal = values
    .slice(0, elapsedDays)
    .reduce((sum, amount) => sum + amount, 0);

  return {
    labels: values.map((_, index) => String(index + 1)),
    values,
    total,
    averagePerDay: elapsedTotal / elapsedDays,
  };
}

/* =========================================================
   Budgets
   ========================================================= */

/** [start, end) range for a budget period, or null for "all time". */
export function getBudgetPeriodRange(period = 'monthly', referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  if (period === 'monthly' || period === 'month') {
    return [new Date(year, month, 1), new Date(year, month + 1, 1)];
  }

  if (period === 'yearly' || period === 'year') {
    return [new Date(year, 0, 1), new Date(year + 1, 0, 1)];
  }

  if (period === 'weekly' || period === 'week') {
    // Weeks run Monday → Sunday.
    const start = startOfDay(referenceDate);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return [start, end];
  }

  return null;
}

/** Total expenses in one category during the budget's current period. */
export function calculateBudgetSpending(
  transactions = [],
  category,
  period = 'monthly',
  referenceDate = new Date(),
) {
  const normalizedCategory = String(category || '').trim().toLowerCase();

  if (!normalizedCategory) return 0;

  const range = getBudgetPeriodRange(period, referenceDate);

  return transactions.reduce((total, transaction) => {
    if (!isCountableTransaction(transaction)) return total;
    if (transaction.type !== 'expense') return total;

    const transactionCategory = String(transaction.category || 'Other')
      .trim()
      .toLowerCase();

    if (transactionCategory !== normalizedCategory) return total;

    if (range) {
      const date = parseDate(transaction.date);

      if (date < range[0] || date >= range[1]) return total;
    }

    return total + toAmount(transaction.amount);
  }, 0);
}

/** Attach the current-period `spent` figure to each budget. */
export function withBudgetSpending(budgets = [], transactions = [], referenceDate = new Date()) {
  return budgets.map((budget) => ({
    ...budget,
    spent: calculateBudgetSpending(
      transactions,
      budget.category,
      budget.period,
      referenceDate,
    ),
  }));
}

/* =========================================================
   Debts
   ========================================================= */

/** Aggregate debt figures. Dates are compared as local calendar days. */
export function calculateDebtSummary(debts = [], referenceDate = new Date()) {
  const today = startOfDay(referenceDate);

  return debts.reduce(
    (summary, debt) => {
      const principal = toAmount(debt?.principal ?? debt?.amount);
      const paid = Math.min(toAmount(debt?.amountPaid), principal);

      const outstanding =
        debt?.outstanding !== undefined && debt?.outstanding !== null
          ? Math.min(toAmount(debt.outstanding), principal || Infinity)
          : Math.max(0, principal - paid);

      summary.totalPrincipal += principal;
      summary.totalPaid += paid;
      summary.totalOutstanding += outstanding;

      if (outstanding > 0) {
        summary.activeDebts += 1;

        const dueDate = parseDate(debt?.dueDate);

        if (dueDate && startOfDay(dueDate) < today) {
          summary.overdueDebts += 1;
        }
      }

      return summary;
    },
    {
      totalPrincipal: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      activeDebts: 0,
      overdueDebts: 0,
    },
  );
}

/* =========================================================
   Lists
   ========================================================= */

function compareNewestFirst(a, b) {
  const byDate = String(toDateKey(b.date)).localeCompare(String(toDateKey(a.date)));

  if (byDate !== 0) return byDate;

  return String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''));
}

/** Most recent transactions first. */
export function getRecentTransactions(transactions = [], limit = 5) {
  const safeLimit = Math.max(0, Math.floor(Number(limit) || 0));

  return transactions
    .filter((transaction) => transaction && parseDate(transaction.date))
    .sort(compareNewestFirst)
    .slice(0, safeLimit);
}

/** Filter by text query, type, category, payment method and date range. */
export function filterTransactions(
  transactions = [],
  {
    query = '',
    type = 'all',
    category = 'all',
    paymentMethod = 'all',
    startDate = '',
    endDate = '',
  } = {},
) {
  const normalizedQuery = String(query).trim().toLowerCase();

  return transactions.filter((transaction) => {
    if (!transaction || typeof transaction !== 'object') return false;

    if (type !== 'all' && transaction.type !== type) return false;

    if (
      category !== 'all' &&
      String(transaction.category || 'Other') !== category
    ) {
      return false;
    }

    if (paymentMethod !== 'all' && transaction.paymentMethod !== paymentMethod) {
      return false;
    }

    if (startDate || endDate) {
      const dateKey = toDateKey(transaction.date);

      if (!dateKey) return false;
      if (startDate && dateKey < startDate) return false;
      if (endDate && dateKey > endDate) return false;
    }

    if (!normalizedQuery) return true;

    const searchable = [
      transaction.description,
      transaction.category,
      transaction.paymentMethod,
      getPaymentMethodLabel(transaction.paymentMethod),
      transaction.type,
      transaction.status,
      transaction.notes,
      transaction.amount,
      transaction.date,
    ]
      .filter((part) => part !== undefined && part !== null && part !== '')
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}

export { toDateKey as getLocalDateKey, toMonthKey as getLocalMonthKey };
