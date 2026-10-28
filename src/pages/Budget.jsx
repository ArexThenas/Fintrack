import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Plus,
  Target,
  Trash2,
  X,
} from 'lucide-react';

import StatCard from '../components/StatCard.jsx';
import BudgetCard from '../components/BudgetCard.jsx';
import { EXPENSE_CATEGORIES, BUDGET_PERIODS } from '../data/defaultData.js';
import { withBudgetSpending } from '../utils/calculations.js';
import { getCurrencySymbol } from '../utils/format.js';

const INITIAL_FORM = {
  category: EXPENSE_CATEGORIES[0],
  limit: '',
  period: 'monthly',
};

function BudgetFormModal({
  initialBudget,
  existingBudgets,
  onClose,
  onSave,
}) {
  const isEditing = Boolean(initialBudget?.id);

  const [form, setForm] = useState(() => ({
    ...INITIAL_FORM,
    category:
      initialBudget?.category || INITIAL_FORM.category,
    limit:
      initialBudget?.limit != null
        ? String(initialBudget.limit)
        : '',
    period: initialBudget?.period || 'monthly',
  }));

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError('');

  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSaving) return;

    const limit = Number(form.limit);

    if (
      form.limit.trim() === '' ||
      !Number.isFinite(limit) ||
      limit <= 0 ||
      limit > 1000000000000
    ) {
      setError(`Enter a valid budget greater than ${getCurrencySymbol()}0.`);
      return;
    }

    const duplicate = existingBudgets.some(
      (budget) =>
        budget.category === form.category &&
        budget.period === form.period &&
        budget.id !== initialBudget?.id
    );

    if (duplicate) {
      setError(
        'A budget already exists for this category and period.'
      );
      return;
    }

    const budget = {
      id: initialBudget?.id,
      category: form.category,
      limit: Number(limit.toFixed(2)),
      period: form.period,
      createdAt:
        initialBudget?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setError('');

    try {
      await onSave(budget);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save this budget.'
      );
    } finally {
      setIsSaving(false);
    }

  }

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose();
        }
      }}
    > <section
      className="modal-panel budget-form-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-form-title"
    > <header className="modal-panel__header">
          <div>
            <span className="eyebrow">BUDGET PLANNER</span>

            <h2 id="budget-form-title">
              {isEditing ? 'Edit budget' : 'Create budget'}
            </h2>

            <p>
              Set a spending limit for a category.
            </p>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close budget form"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <form
          className="budget-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="form-field">
            <label htmlFor="budget-category">
              Category
            </label>

            <select
              id="budget-category"
              name="category"
              value={form.category}
              onChange={updateField}
              disabled={isEditing}
              required
            >
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="budget-limit">
              Budget limit ({getCurrencySymbol()})
            </label>

            <input
              id="budget-limit"
              name="limit"
              type="number"
              min="0.01"
              max="1000000000000"
              step="0.01"
              inputMode="decimal"
              placeholder="e.g. 5000"
              value={form.limit}
              onChange={updateField}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="budget-period">
              Budget period
            </label>

            <select
              id="budget-period"
              name="period"
              value={form.period}
              onChange={updateField}
              required
            >
              {BUDGET_PERIODS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="form-alert" role="alert">
              {error}
            </div>
          )}

          <div className="modal-panel__actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving
                ? 'Saving...'
                : isEditing
                  ? 'Save changes'
                  : 'Create budget'}
            </button>
          </div>
        </form>
      </section>
    </div>

  );
}

function Budget() {
  const outletContext = useOutletContext() ?? {};

  const {
    transactions = [],
    budgets = [],
    onSaveBudget,
    onDeleteBudget,
  } = outletContext;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pageError, setPageError] = useState('');

  const enrichedBudgets = useMemo(
    () => withBudgetSpending(budgets, transactions),
    [budgets, transactions]
  );

  const summary = useMemo(() => {
    const totalLimit = enrichedBudgets.reduce(
      (sum, budget) => sum + Math.max(0, Number(budget.limit) || 0),
      0
    );

    const totalSpent = enrichedBudgets.reduce(
      (sum, budget) => sum + budget.spent,
      0
    );

    const exceededCount = enrichedBudgets.filter(
      (budget) => budget.spent > Number(budget.limit)
    ).length;

    return {
      totalLimit,
      totalSpent,
      remaining: totalLimit - totalSpent,
      exceededCount,
    };

  }, [enrichedBudgets]);

  function openCreateForm() {
    setEditingBudget(null);
    setIsFormOpen(true);
    setPageError('');
  }

  function openEditForm(budget) {
    setEditingBudget(budget);
    setIsFormOpen(true);
    setPageError('');
  }

  async function handleSaveBudget(budget) {
    if (typeof onSaveBudget !== 'function') {
      throw new Error(
        'Budget storage is not connected yet. Complete the storage integration before saving.'
      );
    }

    await onSaveBudget(budget);

  }

  async function handleDeleteBudget() {
    if (!pendingDelete) return;

    setPageError('');

    if (typeof onDeleteBudget !== 'function') {
      setPageError(
        'Budget deletion is not connected to storage yet.'
      );
      return;
    }

    try {
      await onDeleteBudget(pendingDelete.id);
      setPendingDelete(null);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : 'Unable to delete this budget.'
      );
    }

  }

  return (
    <div className="budget-page page-enter">
      <header className="page-heading">
        <div>
          <span className="eyebrow">PLAN YOUR SPENDING</span>

          <h1>Budgets & Savings</h1>

          <p>
            Set limits, track spending, and stay in control of
            your money.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreateForm}
        >
          <Plus size={18} aria-hidden="true" />
          Create budget
        </button>
      </header>

      <section
        className="budget-summary-grid"
        aria-label="Budget summary"
      >
        <StatCard
          title="Total budget"
          value={summary.totalLimit}
          icon={Target}
          variant="balance"
          description="Combined budget limits"
        />

        <StatCard
          title="Total spent"
          value={summary.totalSpent}
          icon={CircleDollarSign}
          variant="expense"
          description="Spending in the current period"
        />

        <StatCard
          title="Remaining budget"
          value={summary.remaining}
          icon={CheckCircle2}
          variant="savings"
          description="Budget minus tracked spending"
        />

        <StatCard
          title="Over-budget categories"
          value={summary.exceededCount}
          format="number"
          icon={AlertTriangle}
          variant="expense"
          description="Categories exceeding their limits"
        />
      </section>

      {pageError && (
        <div className="form-alert" role="alert">
          {pageError}
        </div>
      )}

      <section className="budget-section">
        <div className="dashboard-section-header">
          <div>
            <span className="eyebrow">YOUR PLAN</span>

            <h2>Category budgets</h2>

            <p>
              Monitor spending against your assigned limits.
            </p>
          </div>

          <span className="budget-count">
            {enrichedBudgets.length}{' '}
            {enrichedBudgets.length === 1
              ? 'budget'
              : 'budgets'}
          </span>
        </div>

        {enrichedBudgets.length > 0 ? (
          <div className="budget-grid">
            {enrichedBudgets.map((budget) => (
              <div
                className="budget-grid__item"
                key={budget.id}
              >
                <BudgetCard
                  budget={budget}
                  category={budget.category}
                  limit={budget.limit}
                  spent={budget.spent}
                  onEdit={() => openEditForm(budget)}
                />

                <button
                  type="button"
                  className="budget-grid__delete"
                  onClick={() => setPendingDelete(budget)}
                  aria-label={`Delete ${budget.category} budget`}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  Delete budget
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-state__icon">
              <Target size={25} aria-hidden="true" />
            </span>

            <h3>No budgets created yet</h3>

            <p>
              Create your first budget to monitor spending by
              category.
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateForm}
            >
              <Plus size={17} aria-hidden="true" />
              Create your first budget
            </button>
          </div>
        )}
      </section>

      {isFormOpen && (
        <BudgetFormModal
          initialBudget={editingBudget}
          existingBudgets={budgets}
          onClose={() => {
            setIsFormOpen(false);
            setEditingBudget(null);
          }}
          onSave={handleSaveBudget}
        />
      )}

      {pendingDelete && (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPendingDelete(null);
            }
          }}
        >
          <section
            className="modal-panel delete-confirmation"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-budget-title"
            aria-describedby="delete-budget-description"
          >
            <span className="delete-confirmation__icon">
              <Trash2 size={22} aria-hidden="true" />
            </span>

            <h2 id="delete-budget-title">
              Delete this budget?
            </h2>

            <p id="delete-budget-description">
              Remove the budget for{' '}
              <strong>{pendingDelete.category}</strong>?
              Existing transactions will not be deleted.
            </p>

            <div className="modal-panel__actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPendingDelete(null)}
              >
                Keep budget
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteBudget}
              >
                Delete budget
              </button>
            </div>
          </section>
        </div>
      )}
    </div>

  );
}

export default Budget;
