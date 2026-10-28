import { memo, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowDownUp,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format.js';
import { getPaymentMethodLabel } from '../data/defaultData.js';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const CATEGORY_STYLES = {
  Food: 'transaction-category--food',
  Groceries: 'transaction-category--groceries',
  Transport: 'transaction-category--transport',
  Shopping: 'transaction-category--shopping',
  Bills: 'transaction-category--bills',
  Housing: 'transaction-category--rent',
  Healthcare: 'transaction-category--health',
  Education: 'transaction-category--education',
  Entertainment: 'transaction-category--entertainment',
  Subscriptions: 'transaction-category--entertainment',
  Travel: 'transaction-category--travel',
  Salary: 'transaction-category--income',
  Freelance: 'transaction-category--income',
  Business: 'transaction-category--income',
  Investments: 'transaction-category--income',
  Interest: 'transaction-category--income',
  'Rental Income': 'transaction-category--income',
  Gifts: 'transaction-category--income',
};

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'amount-desc', label: 'Highest amount' },
  { value: 'amount-asc', label: 'Lowest amount' },
];

function getCategoryClass(category) {
  return (
    CATEGORY_STYLES[category] ||
    'transaction-category--default'
  );
}

function normalizeTransaction(transaction) {
  return {
    ...transaction,
    amount: Number(transaction.amount) || 0,
    type:
      transaction.type === 'income' ? 'income' : 'expense',
    category: transaction.category || 'Other',
    description:
      transaction.description?.trim() || transaction.category || 'Transaction',
    date: transaction.date || '',
    paymentMethod: transaction.paymentMethod || 'other',
  };
}

function TransactionRow({
  transaction,
  currency,
  onEdit,
  onDelete,
}) {
  const isIncome = transaction.type === 'income';
  const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;

  return (
    <tr>
      <td>
        <div className="transaction-cell">
          <span
            className={`transaction-cell__icon ${isIncome
              ? 'transaction-cell__icon--income'
              : 'transaction-cell__icon--expense'
              }`}
          > <Icon size={18} aria-hidden="true" />
          </span>

          <div className="transaction-cell__details">
            <span className="transaction-cell__title">
              {transaction.description}
            </span>

            <span className="transaction-cell__subtitle">
              {getPaymentMethodLabel(transaction.paymentMethod)}
            </span>
          </div>
        </div>
      </td>

      <td>
        <span
          className={`transaction-category ${getCategoryClass(
            transaction.category
          )}`}
        >
          {transaction.category}
        </span>
      </td>

      <td>
        <span className="transaction-date">
          <CalendarDays size={14} aria-hidden="true" />
          {formatDate(transaction.date)}
        </span>
      </td>

      <td>
        <span
          className={`transaction-amount ${isIncome
            ? 'transaction-amount--income'
            : 'transaction-amount--expense'
            }`}
        >
          {isIncome ? '+' : '−'}
          {formatCurrency(transaction.amount, { currency })}
        </span>
      </td>

      <td>
        {transaction.status ? (
          <span
            className={`status-badge status-badge--${String(
              transaction.status
            ).toLowerCase()}`}
          >
            {transaction.status}
          </span>
        ) : (
          <span className="status-badge status-badge--completed">
            Recorded
          </span>
        )}
      </td>

      <td>
        {(onEdit || onDelete) && (
          <div className="transaction-actions">
            {onEdit && (
              <button
                type="button"
                className="icon-button"
                aria-label={`Edit ${transaction.description}`}
                title="Edit"
                onClick={() => onEdit(transaction)}
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                className="icon-button transaction-actions__delete"
                aria-label={`Delete ${transaction.description}`}
                title="Delete"
                onClick={() => onDelete(transaction)}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </td>
    </tr>

  );
}

function TransactionTable({
  transactions = [],
  searchQuery = '',
  currency,
  onEdit,
  onDelete,
  pageSize: initialPageSize = 10,
  showSearch = true,
  showPagination = true,
  title = 'Recent transactions',
  emptyMessage = 'No transactions found.',
}) {
  const [localSearch, setLocalSearch] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(
    PAGE_SIZE_OPTIONS.includes(initialPageSize)
      ? initialPageSize
      : 10
  );

  const query = `${searchQuery} ${localSearch}`
    .trim()
    .toLowerCase();

  const filteredTransactions = useMemo(() => {
    const normalized = transactions
      .filter(
        (transaction) =>
          transaction &&
          typeof transaction === 'object' &&
          transaction.id != null
      )
      .map(normalizeTransaction)
      .filter((transaction) => {
        if (!query) return true;

        const searchableText = [
          transaction.description,
          transaction.category,
          transaction.paymentMethod,
          transaction.type,
          transaction.status,
          transaction.notes,
          transaction.amount,
          transaction.date,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(query);
      });

    normalized.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return a.date.localeCompare(b.date);

        case 'amount-desc':
          return b.amount - a.amount;

        case 'amount-asc':
          return a.amount - b.amount;

        case 'date-desc':
        default:
          return b.date.localeCompare(a.date);
      }
    });

    return normalized;

  }, [transactions, query, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / pageSize)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const visibleTransactions = useMemo(() => {
    if (!showPagination) return filteredTransactions;

    const start = (safeCurrentPage - 1) * pageSize;

    return filteredTransactions.slice(start, start + pageSize);

  }, [
    filteredTransactions,
    showPagination,
    safeCurrentPage,
    pageSize,
  ]);

  function changeSearch(value) {
    setLocalSearch(value);
    setCurrentPage(1);
  }

  function changeSort(event) {
    setSortBy(event.target.value);
    setCurrentPage(1);
  }

  function changePageSize(event) {
    setPageSize(Number(event.target.value));
    setCurrentPage(1);
  }

  const firstItem =
    filteredTransactions.length === 0
      ? 0
      : (safeCurrentPage - 1) * pageSize + 1;

  const lastItem = showPagination
    ? Math.min(
      safeCurrentPage * pageSize,
      filteredTransactions.length
    )
    : filteredTransactions.length;

  return (
    <section className="transaction-table-card">
      <div className="transaction-table-card__header">
        <div>
          <h2>{title}</h2>
          <p>
            {filteredTransactions.length}{' '}
            {filteredTransactions.length === 1
              ? 'transaction'
              : 'transactions'} </p>
        </div>

        <label className="transaction-sort">
          <span className="sr-only">Sort transactions</span>
          <ArrowDownUp size={15} aria-hidden="true" />

          <select value={sortBy} onChange={changeSort}>
            {SORT_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {showSearch && (
        <div className="transaction-table-card__toolbar">
          <label className="transaction-search">
            <Search size={17} aria-hidden="true" />

            <input
              type="search"
              value={localSearch}
              onChange={(event) =>
                changeSearch(event.target.value)
              }
              placeholder="Search transactions..."
              aria-label="Search transactions"
            />
          </label>
        </div>
      )}

      <div className="transaction-table-wrapper">
        <table className="transaction-table">
          <thead>
            <tr>
              <th scope="col">Transaction</th>
              <th scope="col">Category</th>
              <th scope="col">Date</th>
              <th scope="col">Amount</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {visibleTransactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                currency={currency}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>

        {visibleTransactions.length === 0 && (
          <div className="empty-state">
            <span className="empty-state__icon">
              <Search size={23} aria-hidden="true" />
            </span>

            <h3>No matching transactions</h3>
            <p>{emptyMessage}</p>

            {(localSearch || searchQuery) && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => changeSearch('')}
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {showPagination &&
        filteredTransactions.length > 0 && (
          <div className="transaction-table-card__footer">
            <p className="transaction-pagination__summary">
              Showing {firstItem}–{lastItem} of{' '}
              {filteredTransactions.length}
            </p>

            <div className="transaction-pagination">
              <label>
                <span className="sr-only">
                  Transactions per page
                </span>

                <select
                  value={pageSize}
                  onChange={changePageSize}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="icon-button"
                aria-label="Previous page"
                disabled={safeCurrentPage <= 1}
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.max(1, page - 1)
                  )
                }
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>

              <span
                className="transaction-pagination__page"
                aria-live="polite"
              >
                {safeCurrentPage} / {totalPages}
              </span>

              <button
                type="button"
                className="icon-button"
                aria-label="Next page"
                disabled={safeCurrentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(totalPages, page + 1)
                  )
                }
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
    </section>

  );
}

export { formatDate };
export default memo(TransactionTable);
