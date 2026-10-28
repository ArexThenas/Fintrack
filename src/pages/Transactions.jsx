import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowDownUp,
  ArrowUpRight,
  CalendarDays,
  Download,
  Filter,
  Plus,
  Search,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react';

import StatCard from '../components/StatCard.jsx';
import TransactionTable from '../components/TransactionTable.jsx';
import { calculateTotals, filterTransactions } from '../utils/calculations.js';
import { getPaymentMethodLabel } from '../data/defaultData.js';
import { toDateKey } from '../utils/dates.js';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All transactions' },
  { value: 'income', label: 'Income only' },
  { value: 'expense', label: 'Expenses only' },
];

function downloadCsv(transactions) {
  const headers = [
    'Date',
    'Description',
    'Type',
    'Category',
    'Payment Method',
    'Amount',
    'Status',
    'Notes',
  ];

  const escapeCsv = (value) => {
    const text = String(value ?? '');
    return `"${text.replaceAll('"', '""')}"`;
  };

  const rows = transactions.map((transaction) => [
    transaction.date,
    transaction.description,
    transaction.type,
    transaction.category,
    getPaymentMethodLabel(transaction.paymentMethod),
    transaction.amount,
    transaction.status,
    transaction.notes,
  ]);

  const csv = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF', csv], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `fintrack-transactions-${toDateKey()}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function Transactions() {
  const outletContext = useOutletContext() ?? {};

  const {
    transactions = [],
    onDeleteTransaction,
    onEditTransaction,
    searchQuery = '',
    onSearchChange,
    onAddTransaction,
    onStartPayment,
  } = outletContext;

  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const categories = useMemo(
    () =>
      [...new Set(
        transactions
          .map((transaction) => transaction.category)
          .filter(Boolean)
      )].sort(),
    [transactions]
  );

  const paymentMethods = useMemo(
    () =>
      [...new Set(
        transactions
          .map((transaction) => transaction.paymentMethod)
          .filter(Boolean)
      )].sort(),
    [transactions]
  );

  const filteredTransactions = useMemo(
    () =>
      filterTransactions(transactions, {
        query: `${searchQuery} ${localSearch}`,
        type: typeFilter,
        category: categoryFilter,
        paymentMethod: paymentFilter,
        startDate,
        endDate,
      }),
    [
      transactions,
      searchQuery,
      localSearch,
      typeFilter,
      categoryFilter,
      paymentFilter,
      startDate,
      endDate,
    ]
  );

  const summary = useMemo(
    () => calculateTotals(filteredTransactions),
    [filteredTransactions]
  );

  const resetFilters = () => {
    setTypeFilter('all');
    setCategoryFilter('all');
    setPaymentFilter('all');
    setStartDate('');
    setEndDate('');
    setLocalSearch('');
    onSearchChange?.('');
  };

  async function confirmDelete() {
    if (!pendingDelete || !onDeleteTransaction) {
      setPendingDelete(null);
      return;
    }

    setDeleteError('');

    try {
      await onDeleteTransaction(pendingDelete.id);
      setPendingDelete(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'Unable to delete this transaction.'
      );
    }

  }

  return (
    <div className="transactions-page page-enter">
      <header className="page-heading">
        <div>
          <span className="eyebrow">
            MONEY ACTIVITY </span>

          <h1>Transactions</h1>

          <p>
            Review and manage your income and expenses.
          </p>
        </div>

        <div className="page-heading__actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              downloadCsv(filteredTransactions)
            }
            disabled={filteredTransactions.length === 0}
          >
            <Download size={17} aria-hidden="true" />
            Export CSV
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onStartPayment?.()}
            disabled={!onStartPayment}
          >
            <Smartphone size={17} aria-hidden="true" />
            Pay via UPI
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onAddTransaction}
          >
            <Plus size={18} aria-hidden="true" />
            Add transaction
          </button>
        </div>
      </header>

      <section
        className="transactions-summary"
        aria-label="Transaction totals"
      >
        <StatCard
          title="Filtered income"
          value={summary.income}
          icon={ArrowDownLeft}
          variant="income"
        />

        <StatCard
          title="Filtered expenses"
          value={summary.expenses}
          icon={ArrowUpRight}
          variant="expense"
        />

        <StatCard
          title="Net amount"
          value={summary.income - summary.expenses}
          icon={Wallet}
          variant="balance"
        />
      </section>

      <section className="transactions-workspace">
        <div className="transactions-toolbar">
          <label className="transaction-search">
            <Search size={17} aria-hidden="true" />

            <input
              type="search"
              value={localSearch}
              onChange={(event) =>
                setLocalSearch(event.target.value)
              }
              placeholder="Search description, category, notes..."
              aria-label="Search all transactions"
            />
          </label>

          <button
            type="button"
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'
              }`}
            onClick={() =>
              setShowFilters((visible) => !visible)
            }
            aria-expanded={showFilters}
          >
            <Filter size={17} aria-hidden="true" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="transactions-filters">
            <div className="form-field">
              <label htmlFor="transaction-type-filter">
                Type
              </label>

              <select
                id="transaction-type-filter"
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value)
                }
              >
                {FILTER_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="transaction-category-filter">
                Category
              </label>

              <select
                id="transaction-category-filter"
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
              >
                <option value="all">All categories</option>

                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="transaction-payment-filter">
                Payment method
              </label>

              <select
                id="transaction-payment-filter"
                value={paymentFilter}
                onChange={(event) =>
                  setPaymentFilter(event.target.value)
                }
              >
                <option value="all">All methods</option>

                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="transaction-start-date">
                <CalendarDays size={14} aria-hidden="true" />
                From
              </label>

              <input
                id="transaction-start-date"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) =>
                  setStartDate(event.target.value)
                }
              />
            </div>

            <div className="form-field">
              <label htmlFor="transaction-end-date">
                To
              </label>

              <input
                id="transaction-end-date"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) =>
                  setEndDate(event.target.value)
                }
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetFilters}
            >
              <X size={16} aria-hidden="true" />
              Clear filters
            </button>
          </div>
        )}

        <TransactionTable
          transactions={filteredTransactions}
          showSearch={false}
          showPagination
          title="All transactions"
          emptyMessage="Try changing your search or filters."
          onEdit={onEditTransaction}
          onDelete={(transaction) => {
            setDeleteError('');
            setPendingDelete(transaction);
          }}
        />
      </section>

      {pendingDelete && (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPendingDelete(null);
              setDeleteError('');
            }
          }}
        >
          <section
            className="modal-panel delete-confirmation"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-transaction-title"
            aria-describedby="delete-transaction-description"
          >
            <div className="delete-confirmation__icon">
              <ArrowDownUp size={22} aria-hidden="true" />
            </div>

            <h2 id="delete-transaction-title">
              Delete transaction?
            </h2>

            <p id="delete-transaction-description">
              This will remove{' '}
              <strong>
                {pendingDelete.description ||
                  pendingDelete.category ||
                  'this transaction'}
              </strong>{' '}
              from your records. This action cannot be undone.
            </p>

            {deleteError && (
              <p className="form-error" role="alert">
                {deleteError}
              </p>
            )}

            <div className="modal-panel__actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setPendingDelete(null);
                  setDeleteError('');
                }}
              >
                Keep transaction
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={!onDeleteTransaction}
              >
                Delete transaction
              </button>
            </div>
          </section>
        </div>
      )}
    </div>

  );
}

export default Transactions;
