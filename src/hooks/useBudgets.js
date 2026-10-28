import { useOutletContext } from 'react-router-dom';

const EMPTY_BUDGETS = [];

function notConnected(action) {
  return () => {
    throw new Error(`Budget ${action} is not connected yet.`);
  };
}

/** Budget data and actions provided by AppLayout. */
export function useBudgets() {
  const context = useOutletContext() ?? {};

  return {
    budgets: Array.isArray(context.budgets) ? context.budgets : EMPTY_BUDGETS,
    loading: Boolean(context.loading),
    error: context.error || '',
    refresh: context.refresh ?? (() => { }),

    addBudget: context.addBudget ?? notConnected('creation'),
    updateBudget: context.updateBudget ?? notConnected('updates'),
    deleteBudget: context.deleteBudget ?? notConnected('deletion'),

    // Create-or-update, used by the Budget page's form.
    onSaveBudget: context.onSaveBudget ?? notConnected('saving'),
    onDeleteBudget: context.onDeleteBudget ?? notConnected('deletion'),
  };
}

export default useBudgets;
