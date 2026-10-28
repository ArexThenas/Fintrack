import { useOutletContext } from 'react-router-dom';

const EMPTY_TRANSACTIONS = [];

function notConnected(action) {
  return () => {
    throw new Error(`Transaction ${action} is not connected yet.`);
  };
}

/** Transaction data and actions provided by AppLayout. */
export function useTransactions() {
  const context = useOutletContext() ?? {};

  return {
    transactions: Array.isArray(context.transactions)
      ? context.transactions
      : EMPTY_TRANSACTIONS,
    loading: Boolean(context.loading),
    error: context.error || '',
    refresh: context.refresh ?? (() => { }),

    // Data actions
    addTransaction: context.addTransaction ?? notConnected('creation'),
    updateTransaction: context.updateTransaction ?? notConnected('updates'),
    deleteTransaction: context.deleteTransaction ?? notConnected('deletion'),

    // UI actions (open the add / edit / delete flows)
    onAddTransaction: context.onAddTransaction,
    onEditTransaction: context.onEditTransaction,
    onDeleteTransaction: context.onDeleteTransaction,

    searchQuery: context.searchQuery || '',
    onSearchChange: context.onSearchChange ?? (() => { }),
  };
}

export default useTransactions;
