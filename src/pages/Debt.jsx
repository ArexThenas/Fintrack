import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Plus,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';

import StatCard from '../components/StatCard.jsx';
import DebtCard from '../components/DebtCard.jsx';
import { calculateDebtSummary } from '../utils/calculations.js';
import { toDateKey } from '../utils/dates.js';
import { formatCurrency, getCurrencySymbol } from '../utils/format.js';

function DebtFormModal({
  initialDebt,
  onClose,
  onSave,
}) {
  const isEditing = Boolean(initialDebt?.id);

  const [form, setForm] = useState(() => ({
    name: initialDebt?.name || '',
    lender: initialDebt?.lender || '',
    principal:
      initialDebt?.principal != null
        ? String(initialDebt.principal)
        : '',
    amountPaid:
      initialDebt?.amountPaid != null
        ? String(initialDebt.amountPaid)
        : '0',
    dueDate: initialDebt?.dueDate || '',
    notes: initialDebt?.notes || '',
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

    const principal = Number(form.principal);
    const amountPaid = Number(form.amountPaid);

    if (!form.name.trim()) {
      setError('Enter a name for this debt.');
      return;
    }

    if (form.name.trim().length > 100) {
      setError('The debt name must be 100 characters or fewer.');
      return;
    }

    if (
      !Number.isFinite(principal) ||
      principal <= 0 ||
      principal > 1000000000000
    ) {
      setError('Enter a valid original debt amount.');
      return;
    }

    if (
      !Number.isFinite(amountPaid) ||
      amountPaid < 0 ||
      amountPaid > principal
    ) {
      setError(
        `The amount repaid must be between ${getCurrencySymbol()}0 and the original debt amount.`
      );
      return;
    }

    if (form.dueDate) {
      const date = new Date(`${form.dueDate}T00:00:00`);

      if (Number.isNaN(date.getTime())) {
        setError('Enter a valid due date.');
        return;
      }
    }

    if (form.notes.length > 500) {
      setError('Notes must be 500 characters or fewer.');
      return;
    }

    const debt = {
      id: initialDebt?.id,
      name: form.name.trim(),
      lender: form.lender.trim(),
      principal: Number(principal.toFixed(2)),
      amountPaid: Number(amountPaid.toFixed(2)),
      outstanding: Number(
        Math.max(0, principal - amountPaid).toFixed(2)
      ),
      dueDate: form.dueDate,
      notes: form.notes.trim(),
      createdAt:
        initialDebt?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setError('');

    try {
      await onSave(debt);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save this debt.'
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
      className="modal-panel debt-form-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="debt-form-title"
    > <header className="modal-panel__header">
          <div>
            <span className="eyebrow">DEBT MANAGER</span>

            <h2 id="debt-form-title">
              {isEditing ? 'Edit debt' : 'Add a debt'}
            </h2>

            <p>
              Record the amount owed and your repayment progress.
            </p>
          </div>

          <button
            type="button"
            className="icon-button"
            aria-label="Close debt form"
            onClick={onClose}
            disabled={isSaving}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <form
          className="debt-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="form-field">
            <label htmlFor="debt-name">
              Debt or loan name
            </label>

            <input
              id="debt-name"
              name="name"
              value={form.name}
              onChange={updateField}
              placeholder="e.g. Personal loan"
              maxLength={100}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="debt-lender">
              Lender or person
              <span className="form-label__optional">
                Optional
              </span>
            </label>

            <input
              id="debt-lender"
              name="lender"
              value={form.lender}
              onChange={updateField}
              placeholder="e.g. Bank or person's name"
              maxLength={100}
            />
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="debt-principal">
                Original amount ({getCurrencySymbol()})
              </label>

              <input
                id="debt-principal"
                name="principal"
                type="number"
                min="0.01"
                max="1000000000000"
                step="0.01"
                inputMode="decimal"
                value={form.principal}
                onChange={updateField}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="debt-paid">
                Amount repaid ({getCurrencySymbol()})
              </label>

              <input
                id="debt-paid"
                name="amountPaid"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.amountPaid}
                onChange={updateField}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="debt-due-date">
              <CalendarDays size={15} aria-hidden="true" />
              Due date
              <span className="form-label__optional">
                Optional
              </span>
            </label>

            <input
              id="debt-due-date"
              name="dueDate"
              type="date"
              value={form.dueDate}
              onChange={updateField}
            />
          </div>

          <div className="form-field">
            <label htmlFor="debt-notes">
              Notes
              <span className="form-label__optional">
                Optional
              </span>
            </label>

            <textarea
              id="debt-notes"
              name="notes"
              rows={3}
              maxLength={500}
              value={form.notes}
              onChange={updateField}
              placeholder="Add repayment details or reminders..."
            />
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
                  : 'Add debt'}
            </button>
          </div>
        </form>
      </section>
    </div>

  );
}

function RepaymentModal({
  debt,
  onClose,
  onSave,
}) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const outstanding = Math.max(
    0,
    Number(debt.outstanding) ||
    Number(debt.principal) - Number(debt.amountPaid) ||
    0
  );

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSaving) return;

    const repayment = Number(amount);

    if (
      !Number.isFinite(repayment) ||
      repayment <= 0 ||
      repayment > outstanding
    ) {
      setError(
        `Enter a repayment greater than ${getCurrencySymbol()}0 and no more than ${formatCurrency(outstanding)}.`
      );
      return;
    }

    const amountPaid = Number(
      (Number(debt.amountPaid || 0) + repayment).toFixed(2)
    );

    const updatedDebt = {
      ...debt,
      amountPaid,
      outstanding: Number(
        Math.max(0, Number(debt.principal) - amountPaid).toFixed(2)
      ),
      updatedAt: new Date().toISOString(),
      lastRepayment: {
        amount: Number(repayment.toFixed(2)),
        date: toDateKey(),
      },
    };

    setIsSaving(true);
    setError('');

    try {
      await onSave(updatedDebt);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to record the repayment.'
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
      className="modal-panel repayment-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="repayment-title"
    > <header className="modal-panel__header">
          <div>
            <span className="eyebrow">REPAYMENT</span>

            <h2 id="repayment-title">
              Record a repayment
            </h2>

            <p>{debt.name}</p>
          </div>

          <button
            type="button"
            className="icon-button"
            aria-label="Close repayment form"
            onClick={onClose}
            disabled={isSaving}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="repayment-modal__balance">
          <span>Outstanding balance</span>

          <strong>{formatCurrency(outstanding)}</strong>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="repayment-amount">
              Repayment amount ({getCurrencySymbol()})
            </label>

            <input
              id="repayment-amount"
              type="number"
              min="0.01"
              max={outstanding}
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError('');
              }}
              placeholder="Enter repayment amount"
              required
            />
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
              disabled={isSaving || outstanding <= 0}
            >
              {isSaving ? 'Saving...' : 'Record repayment'}
            </button>
          </div>
        </form>
      </section>
    </div>

  );
}

function Debt() {
  const outletContext = useOutletContext() ?? {};

  const {
    debts = [],
    onSaveDebt,
    onDeleteDebt,
  } = outletContext;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [repaymentDebt, setRepaymentDebt] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pageError, setPageError] = useState('');

  const summary = useMemo(() => calculateDebtSummary(debts), [debts]);

  async function saveDebt(debt) {
    if (typeof onSaveDebt !== 'function') {
      throw new Error(
        'Debt storage is not connected yet. Complete the storage integration before saving.'
      );
    }

    await onSaveDebt(debt);

  }

  async function deleteDebt() {
    if (!pendingDelete) return;

    if (typeof onDeleteDebt !== 'function') {
      setPageError(
        'Debt deletion is not connected to storage yet.'
      );
      return;
    }

    try {
      await onDeleteDebt(pendingDelete.id);
      setPendingDelete(null);
      setPageError('');
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : 'Unable to delete this debt.'
      );
    }

  }

  return (
    <div className="debt-page page-enter">
      <header className="page-heading">
        <div>
          <span className="eyebrow">STAY ON TOP OF REPAYMENTS</span>

          <h1>Debt Manager</h1>

          <p>
            Track what you owe and see your progress toward
            becoming debt-free.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setEditingDebt(null);
            setIsFormOpen(true);
            setPageError('');
          }}
        >
          <Plus size={18} aria-hidden="true" />
          Add debt
        </button>
      </header>

      <section
        className="debt-summary-grid"
        aria-label="Debt summary"
      >
        <StatCard
          title="Total debt"
          value={summary.totalPrincipal}
          icon={Wallet}
          variant="balance"
          description="Original recorded amounts"
        />

        <StatCard
          title="Total repaid"
          value={summary.totalPaid}
          icon={ArrowDownLeft}
          variant="income"
          description="Recorded repayments"
        />

        <StatCard
          title="Outstanding"
          value={summary.totalOutstanding}
          icon={ArrowUpRight}
          variant="expense"
          description="Remaining debt balance"
        />

        <StatCard
          title="Overdue debts"
          value={summary.overdueDebts}
          format="number"
          icon={AlertCircle}
          variant="expense"
          description="Past-due outstanding records"
        />
      </section>

      {pageError && (
        <div className="form-alert" role="alert">
          {pageError}
        </div>
      )}

      <section className="debt-section">
        <div className="dashboard-section-header">
          <div>
            <span className="eyebrow">YOUR DEBTS</span>

            <h2>Loans and repayments</h2>

            <p>
              Review balances, due dates, and repayment progress.
            </p>
          </div>

          <span className="debt-count">
            {debts.length}{' '}
            {debts.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {debts.length > 0 ? (
          <div className="debt-grid">
            {debts.map((debt) => (
              <div className="debt-grid__item" key={debt.id}>
                <DebtCard
                  debt={debt}
                  onEdit={(record) => {
                    setEditingDebt(record);
                    setIsFormOpen(true);
                    setPageError('');
                  }}
                  onRepay={(record) => {
                    setRepaymentDebt(record);
                    setPageError('');
                  }}
                />

                <button
                  type="button"
                  className="debt-grid__delete"
                  onClick={() => setPendingDelete(debt)}
                  aria-label={`Delete ${debt.name}`}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  Delete debt
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-state__icon">
              <Wallet size={25} aria-hidden="true" />
            </span>

            <h3>No debts recorded</h3>

            <p>
              Add a loan or borrowed amount to start tracking
              repayments.
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditingDebt(null);
                setIsFormOpen(true);
              }}
            >
              <Plus size={17} aria-hidden="true" />
              Add your first debt
            </button>
          </div>
        )}
      </section>

      {isFormOpen && (
        <DebtFormModal
          initialDebt={editingDebt}
          onClose={() => {
            setIsFormOpen(false);
            setEditingDebt(null);
          }}
          onSave={saveDebt}
        />
      )}

      {repaymentDebt && (
        <RepaymentModal
          debt={repaymentDebt}
          onClose={() => setRepaymentDebt(null)}
          onSave={saveDebt}
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
            aria-labelledby="delete-debt-title"
          >
            <span className="delete-confirmation__icon">
              <Trash2 size={22} aria-hidden="true" />
            </span>

            <h2 id="delete-debt-title">
              Delete this debt?
            </h2>

            <p>
              Delete the record for{' '}
              <strong>{pendingDelete.name}</strong>? This
              removes the debt record from FinTrack.
            </p>

            <div className="modal-panel__actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPendingDelete(null)}
              >
                Keep debt
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={deleteDebt}
              >
                <Trash2 size={16} aria-hidden="true" />
                Delete debt
              </button>
            </div>
          </section>
        </div>
      )}
    </div>

  );
}

export default Debt;
