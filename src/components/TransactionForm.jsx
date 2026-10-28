import { useId, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  LoaderCircle,
  ReceiptText,
  Tag,
  Wallet,
} from 'lucide-react';

import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
} from '../data/defaultData.js';
import { toDateKey } from '../utils/dates.js';
import { getCurrencySymbol } from '../utils/format.js';

const MAX_AMOUNT = 1000000000000;

function categoriesFor(type) {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

function createInitialForm(transaction) {
  if (transaction) {
    return {
      type: transaction.type === 'income' ? 'income' : 'expense',
      amount: String(transaction.amount ?? ''),
      category: transaction.category || 'Other',
      description: transaction.description || '',
      date: toDateKey(transaction.date) || toDateKey(),
      paymentMethod: transaction.paymentMethod || 'other',
      notes: transaction.notes || '',
    };
  }

  return {
    type: 'expense',
    amount: '',
    category: EXPENSE_CATEGORIES[0],
    description: '',
    date: toDateKey(),
    paymentMethod: 'upi',
    notes: '',
  };
}

function validateTransaction(form) {
  const errors = {};
  const amount = Number(form.amount);

  if (form.amount.trim() === '' || !Number.isFinite(amount) || amount <= 0) {
    errors.amount = `Enter an amount greater than ${getCurrencySymbol()}0.`;
  } else if (amount > MAX_AMOUNT) {
    errors.amount = 'The amount exceeds the supported limit.';
  }

  if (!form.category) {
    errors.category = 'Select a category.';
  }

  if (!form.date) {
    errors.date = 'Select a transaction date.';
  } else if (!toDateKey(form.date)) {
    errors.date = 'Enter a valid date.';
  } else if (form.date > toDateKey()) {
    errors.date = 'The date cannot be in the future.';
  }

  if (!form.paymentMethod) {
    errors.paymentMethod = 'Select a payment method.';
  }

  if (form.description.length > 100) {
    errors.description = 'Description must be 100 characters or fewer.';
  }

  if (form.notes.length > 500) {
    errors.notes = 'Notes must be 500 characters or fewer.';
  }

  return errors;
}

/**
 * Add or edit a transaction.
 *
 * Props
 *  - initialTransaction: pass an existing record to edit it
 *  - onSubmit(transaction): async save handler; throw to show an error
 *  - onSubmitSuccess(transaction): called after a successful save
 *  - onCancel(): shows a Cancel button when provided
 */
function TransactionForm({
  initialTransaction = null,
  onSubmitSuccess,
  onCancel,
  onSubmit,
}) {
  const id = useId();
  const isEditing = Boolean(initialTransaction?.id);

  const [form, setForm] = useState(() => createInitialForm(initialTransaction));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Keep a legacy/unknown category selectable while editing.
  const categories = useMemo(() => {
    const list = categoriesFor(form.type);

    return list.includes(form.category) ? list : [form.category, ...list];
  }, [form.type, form.category]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => {
      const updated = { ...current, [name]: value };

      // Switching income/expense: fall back to a valid category.
      if (name === 'type' && !categoriesFor(value).includes(current.category)) {
        updated.category = categoriesFor(value)[0];
      }

      return updated;
    });

    setErrors((current) => ({ ...current, [name]: undefined }));
    setSubmitError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    const validationErrors = validateTransaction(form);
    setErrors(validationErrors);
    setSubmitError('');

    if (Object.keys(validationErrors).length > 0) return;

    const transaction = {
      // Editing keeps the original id, status and timestamps.
      ...(isEditing ? initialTransaction : { status: 'completed' }),
      type: form.type,
      amount: Number(Number(form.amount).toFixed(2)),
      category: form.category,
      description: form.description.trim(),
      date: form.date,
      paymentMethod: form.paymentMethod,
      notes: form.notes.trim(),
    };

    setIsSubmitting(true);

    try {
      if (typeof onSubmit !== 'function') {
        throw new Error('Transaction storage is not connected.');
      }

      const saved = await onSubmit(transaction);

      if (!isEditing) {
        setForm(createInitialForm(null));
      }

      setErrors({});
      onSubmitSuccess?.(saved ?? transaction);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to save the transaction. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const amountId = `${id}-amount`;
  const categoryId = `${id}-category`;
  const dateId = `${id}-date`;
  const methodId = `${id}-payment-method`;
  const descriptionId = `${id}-description`;
  const notesId = `${id}-notes`;

  return (
    <form className="transaction-form" onSubmit={handleSubmit} noValidate>
      <fieldset
        className="transaction-form__type-selector"
        disabled={isSubmitting}
      >
        <legend className="form-label">Transaction type</legend>

        <div className="transaction-type-options">
          <button
            type="button"
            className={`transaction-type-option ${form.type === 'expense' ? 'is-active' : ''}`}
            aria-pressed={form.type === 'expense'}
            onClick={() => updateField({ target: { name: 'type', value: 'expense' } })}
          >
            <ArrowUpRight size={18} aria-hidden="true" />
            <span>Expense</span>
          </button>

          <button
            type="button"
            className={`transaction-type-option ${form.type === 'income' ? 'is-active' : ''}`}
            aria-pressed={form.type === 'income'}
            onClick={() => updateField({ target: { name: 'type', value: 'income' } })}
          >
            <ArrowDownLeft size={18} aria-hidden="true" />
            <span>Income</span>
          </button>
        </div>
      </fieldset>

      <div className="form-field">
        <label className="form-label" htmlFor={amountId}>
          Amount
        </label>

        <div className={`amount-input ${errors.amount ? 'has-error' : ''}`}>
          <span className="amount-input__symbol" aria-hidden="true">
            {getCurrencySymbol()}
          </span>

          <input
            id={amountId}
            name="amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            max={MAX_AMOUNT}
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={updateField}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? `${amountId}-error` : undefined}
            autoFocus
            required
          />
        </div>

        {errors.amount && (
          <p className="form-error" id={`${amountId}-error`} role="alert">
            {errors.amount}
          </p>
        )}
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor={categoryId}>
          <Tag size={15} aria-hidden="true" />
          Category
        </label>

        <select
          id={categoryId}
          name="category"
          value={form.category}
          onChange={updateField}
          aria-invalid={Boolean(errors.category)}
          required
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        {errors.category && (
          <p className="form-error" role="alert">
            {errors.category}
          </p>
        )}
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor={descriptionId}>
          <ReceiptText size={15} aria-hidden="true" />
          Description
          <span className="form-label__optional">Optional</span>
        </label>

        <input
          id={descriptionId}
          name="description"
          type="text"
          placeholder="e.g. Lunch, electricity bill..."
          maxLength={100}
          value={form.description}
          onChange={updateField}
          aria-invalid={Boolean(errors.description)}
        />

        {errors.description && (
          <p className="form-error" role="alert">
            {errors.description}
          </p>
        )}
      </div>

      <div className="form-grid">
        <div className="form-field">
          <label className="form-label" htmlFor={dateId}>
            <CalendarDays size={15} aria-hidden="true" />
            Date
          </label>

          <input
            id={dateId}
            name="date"
            type="date"
            max={toDateKey()}
            value={form.date}
            onChange={updateField}
            aria-invalid={Boolean(errors.date)}
            required
          />

          {errors.date && (
            <p className="form-error" role="alert">
              {errors.date}
            </p>
          )}
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor={methodId}>
            <Wallet size={15} aria-hidden="true" />
            Payment method
          </label>

          <select
            id={methodId}
            name="paymentMethod"
            value={form.paymentMethod}
            onChange={updateField}
            aria-invalid={Boolean(errors.paymentMethod)}
            required
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>

          {errors.paymentMethod && (
            <p className="form-error" role="alert">
              {errors.paymentMethod}
            </p>
          )}
        </div>
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor={notesId}>
          Notes
          <span className="form-label__optional">Optional</span>
        </label>

        <textarea
          id={notesId}
          name="notes"
          rows={3}
          placeholder="Add any additional details..."
          maxLength={500}
          value={form.notes}
          onChange={updateField}
          aria-invalid={Boolean(errors.notes)}
        />

        <span className="form-character-count">{form.notes.length}/500</span>

        {errors.notes && (
          <p className="form-error" role="alert">
            {errors.notes}
          </p>
        )}
      </div>

      <p className="form-hint" role="note">
        This only records a transaction. It does not send money — use
        “Pay via UPI” on the Transactions page to start a payment.
      </p>

      {submitError && (
        <div className="form-alert" role="alert">
          {submitError}
        </div>
      )}

      <div className="transaction-form__actions">
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}

        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <LoaderCircle size={17} className="spin" aria-hidden="true" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 size={17} aria-hidden="true" />
              {isEditing ? 'Save changes' : 'Save transaction'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export { validateTransaction };
export default TransactionForm;
