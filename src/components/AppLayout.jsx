import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CheckCircle2, TriangleAlert, X } from 'lucide-react';

import Sidebar from './Sidebar.jsx';
import Navbar from './Navbar.jsx';
import PageLoader from './PageLoader.jsx';
import PaymentModal from './PaymentModal.jsx';
import TransactionForm from './TransactionForm.jsx';

import useFinTrackData from '../hooks/useFinTrackData.js';
import { setActiveCurrency } from '../utils/format.js';

const NOTICE_DURATION_MS = 3500;

/**
 * Apply the saved appearance preferences to <html>:
 *  - data-theme   "light" | "dark"   ("system" follows the OS)
 *  - data-density "comfortable" | "compact"
 */
function useAppearance({ theme, compactMode }) {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');

    function apply() {
      const isDark =
        theme === 'dark' || (theme === 'system' && Boolean(media?.matches));

      root.dataset.theme = isDark ? 'dark' : 'light';
    }

    apply();

    if (theme !== 'system' || !media) return undefined;

    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.density = compactMode
      ? 'compact'
      : 'comfortable';
  }, [compactMode]);
}

/** Close a modal with Escape and stop the page behind it from scrolling. */
function useModalBehavior(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
}

function AppLayout() {
  const data = useFinTrackData();
  const location = useLocation();

  const {
    transactions,
    budgets,
    debts,
    settings,
    loading,
    error,
    clearError,
    refresh,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    saveBudget,
    deleteBudget,
    saveDebt,
    deleteDebt,
    saveSettings,
    resetData,
    importData,
    loadSampleData,
  } = data;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState('');

  // null = closed, {} = adding, { transaction } = editing
  const [transactionModal, setTransactionModal] = useState(null);
  // null = closed, otherwise optional prefill values for the UPI dialog
  const [paymentRequest, setPaymentRequest] = useState(null);

  // Set during render so every child formats with the right currency.
  setActiveCurrency(settings.currency);
  useAppearance(settings);

  /* ---------- Sidebar ---------- */

  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  /* ---------- Search ---------- */

  const handleSearch = useCallback((value) => {
    setSearchQuery(String(value ?? '').trimStart());
  }, []);

  /* ---------- Notices ---------- */

  useEffect(() => {
    if (!notice) return undefined;

    const timer = window.setTimeout(() => setNotice(''), NOTICE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /* ---------- Transaction modal ---------- */

  const openAddTransaction = useCallback(() => setTransactionModal({}), []);
  const openEditTransaction = useCallback(
    (transaction) => setTransactionModal({ transaction }),
    [],
  );
  const closeTransactionModal = useCallback(() => setTransactionModal(null), []);

  const submitTransaction = useCallback(
    (transaction) =>
      transaction.id
        ? updateTransaction(transaction.id, transaction)
        : addTransaction(transaction),
    [addTransaction, updateTransaction],
  );

  const handleTransactionSaved = useCallback(() => {
    setNotice(
      transactionModal?.transaction ? 'Transaction updated.' : 'Transaction added.',
    );
    setTransactionModal(null);
  }, [transactionModal]);

  useModalBehavior(Boolean(transactionModal), closeTransactionModal);

  /* ---------- UPI payments ---------- */

  const startPayment = useCallback((prefill = {}) => setPaymentRequest(prefill), []);
  const closePayment = useCallback(() => setPaymentRequest(null), []);

  const handlePaymentResult = useCallback(
    (result) => {
      addTransaction(result);

      setNotice(
        result.status === 'completed'
          ? 'Payment recorded.'
          : `Payment recorded as ${result.status}.`,
      );
    },
    [addTransaction],
  );

  /* ---------- Data actions exposed to pages ---------- */

  const handleDeleteTransaction = useCallback(
    (id) => {
      const deleted = deleteTransaction(id);

      if (deleted) setNotice('Transaction deleted.');

      return deleted;
    },
    [deleteTransaction],
  );

  const pageContext = useMemo(
    () => ({
      // Data
      transactions,
      budgets,
      debts,
      settings,
      loading,
      error,
      refresh,

      // Search shared with the navbar
      searchQuery,
      onSearchChange: handleSearch,

      // Transactions
      addTransaction,
      updateTransaction,
      deleteTransaction,
      onAddTransaction: openAddTransaction,
      onEditTransaction: openEditTransaction,
      onDeleteTransaction: handleDeleteTransaction,

      // Budgets (onSave adds or updates depending on whether the ID exists)
      onSaveBudget: saveBudget,
      onDeleteBudget: deleteBudget,

      // Debts
      onSaveDebt: saveDebt,
      onDeleteDebt: deleteDebt,

      // Settings and data management
      onSaveSettings: saveSettings,
      onResetData: resetData,
      onImportData: importData,
      onLoadSampleData: loadSampleData,

      // UPI
      onStartPayment: startPayment,
    }),
    [
      transactions,
      budgets,
      debts,
      settings,
      loading,
      error,
      refresh,
      searchQuery,
      handleSearch,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      openAddTransaction,
      openEditTransaction,
      handleDeleteTransaction,
      saveBudget,
      deleteBudget,
      saveDebt,
      deleteDebt,
      saveSettings,
      resetData,
      importData,
      loadSampleData,
      startPayment,
    ],
  );

  const editingTransaction = transactionModal?.transaction ?? null;

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="app-main">
        <Navbar
          userName={settings.name}
          onMenuClick={openSidebar}
          onAddTransaction={openAddTransaction}
          onSearch={handleSearch}
        />

        <main id="main-content" className="app-content" tabIndex={-1}>
          {error && (
            <div className="app-alert" role="alert">
              <TriangleAlert size={18} aria-hidden="true" />
              <span>{error}</span>
              <button
                type="button"
                className="icon-button"
                onClick={clearError}
                aria-label="Dismiss message"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Keyed by currency so every figure re-renders when it changes. */}
          <Suspense fallback={<PageLoader />}>
            <Outlet key={settings.currency} context={pageContext} />
          </Suspense>
        </main>
      </div>

      {transactionModal && (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeTransactionModal();
            }
          }}
        >
          <section
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-modal-title"
          >
            <div className="modal-panel__header">
              <div>
                <span className="eyebrow">FINTRACK</span>

                <h2 id="transaction-modal-title">
                  {editingTransaction ? 'Edit transaction' : 'Add transaction'}
                </h2>

                <p>
                  {editingTransaction
                    ? 'Update the details of this transaction.'
                    : 'Record income or an expense.'}
                </p>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={closeTransactionModal}
                aria-label="Close transaction form"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <TransactionForm
              initialTransaction={editingTransaction}
              onSubmit={submitTransaction}
              onSubmitSuccess={handleTransactionSaved}
              onCancel={closeTransactionModal}
            />
          </section>
        </div>
      )}

      {paymentRequest && (
        <PaymentModal
          amount={paymentRequest.amount}
          payeeName={paymentRequest.payeeName}
          payeeUpiId={paymentRequest.payeeUpiId}
          transactionNote={paymentRequest.note}
          category={paymentRequest.category}
          onPaymentResult={handlePaymentResult}
          onClose={closePayment}
        />
      )}

      {notice && (
        <div className="app-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} aria-hidden="true" />
          {notice}
        </div>
      )}

      <span className="sr-only" aria-live="polite">
        {location.pathname === '/'
          ? 'Dashboard page'
          : `Current page: ${location.pathname.replace('/', '').replaceAll('-', ' ')}`}
      </span>
    </div>
  );
}

export default AppLayout;
