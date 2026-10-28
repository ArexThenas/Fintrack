import { useEffect, useId, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';

import { buildUpiPaymentUrl, isValidUpiId } from '../utils/upi.js';
import { toDateKey } from '../utils/dates.js';
import { formatCurrency } from '../utils/format.js';

// UPI payments are always in rupees, whatever display currency is selected.
const UPI_CURRENCY = 'INR';
const MAX_AMOUNT = 10000000;
const MAX_NAME_LENGTH = 80;
const MAX_NOTE_LENGTH = 80;

function createReference() {
  return `FT${Date.now().toString(36)}`.toUpperCase().slice(0, 35);
}

/**
 * Hands a payment request to the user's UPI app.
 *
 * FinTrack cannot see whether the payment succeeded, so after the UPI app
 * opens the user reports the outcome and it is recorded as a transaction.
 * UPI links only open on devices that have a UPI app installed (phones).
 *
 * Props
 *  - amount, payeeName, payeeUpiId, transactionNote: optional prefill values
 *  - category: category for the recorded transaction (default "Other")
 *  - onPaymentResult(transaction): async; saves the recorded outcome
 *  - onClose(): close the dialog
 */
function PaymentModal({
  isOpen = true,
  onClose,
  amount = '',
  payeeName = '',
  payeeUpiId = '',
  transactionNote = '',
  category = 'Other',
  onPaymentResult,
}) {
  const id = useId();

  const [amountInput, setAmountInput] = useState(amount ? String(amount) : '');
  const [upiId, setUpiId] = useState(payeeUpiId);
  const [recipientName, setRecipientName] = useState(payeeName);
  const [note, setNote] = useState(transactionNote);
  const [paymentState, setPaymentState] = useState('review');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [reference] = useState(createReference);

  const numericAmount = Number(amountInput);
  const validAmount =
    amountInput.trim() !== '' &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= MAX_AMOUNT;

  // Reset the form each time the dialog is (re)opened with new prefill values.
  useEffect(() => {
    if (!isOpen) return;

    setAmountInput(amount ? String(amount) : '');
    setUpiId(payeeUpiId);
    setRecipientName(payeeName);
    setNote(transactionNote);
    setPaymentState('review');
    setError('');
    setIsSaving(false);
  }, [isOpen, amount, payeeUpiId, payeeName, transactionNote]);

  // Lock page scroll and allow Escape to close.
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSaving) {
        onClose?.();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const amountFieldId = `${id}-amount`;
  const recipientId = `${id}-recipient`;
  const upiIdField = `${id}-upi-id`;
  const noteId = `${id}-note`;

  function validatePayment() {
    if (!validAmount) {
      setError('Enter a valid payment amount.');
      return false;
    }

    if (!isValidUpiId(upiId.trim())) {
      setError('Enter a valid UPI ID, such as name@bank.');
      return false;
    }

    if (!recipientName.trim()) {
      setError('Enter the recipient name.');
      return false;
    }

    setError('');
    return true;
  }

  function launchPayment() {
    if (!validatePayment()) return;

    try {
      const paymentUrl = buildUpiPaymentUrl({
        payeeVpa: upiId.trim(),
        payeeName: recipientName.trim(),
        amount: numericAmount,
        note: note.trim(),
        currency: UPI_CURRENCY,
        transactionReference: reference,
      });

      setPaymentState('awaiting-result');

      // Opens a compatible UPI app if one is installed. This does not
      // verify that the payment was completed.
      window.location.href = paymentUrl;
    } catch (launchError) {
      setPaymentState('review');
      setError(
        launchError instanceof Error
          ? launchError.message
          : 'Unable to open a UPI payment app.',
      );
    }
  }

  async function recordResult(status) {
    if (!['completed', 'failed', 'cancelled'].includes(status)) return;
    if (isSaving) return;

    setIsSaving(true);
    setError('');

    const result = {
      type: 'expense',
      amount: Number(numericAmount.toFixed(2)),
      category,
      description: note.trim() || `UPI payment to ${recipientName.trim()}`,
      paymentMethod: 'upi',
      payeeName: recipientName.trim(),
      payeeUpiId: upiId.trim(),
      transactionReference: reference,
      date: toDateKey(),
      status,
      statusSource: 'user-reported',
    };

    try {
      if (typeof onPaymentResult !== 'function') {
        throw new Error('Payment tracking is not connected.');
      }

      await onPaymentResult(result);
      onClose?.();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save the payment result.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="modal-overlay payment-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose?.();
        }
      }}
    >
      <section
        className="modal-panel payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
      >
        <header className="modal-panel__header">
          <div>
            <span className="eyebrow">FINTRACK PAYMENTS</span>

            <h2 id={`${id}-title`}>
              {paymentState === 'awaiting-result'
                ? 'Did your payment go through?'
                : 'Pay via UPI'}
            </h2>

            <p id={`${id}-description`}>
              {paymentState === 'awaiting-result'
                ? 'Tell FinTrack what happened so it can record the payment.'
                : 'Review the recipient and amount before continuing.'}
            </p>
          </div>

          <button
            type="button"
            className="icon-button"
            aria-label="Close payment window"
            onClick={() => onClose?.()}
            disabled={isSaving}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="payment-modal__amount">
          <span className="payment-modal__amount-label">Payment amount</span>

          <strong>
            {validAmount
              ? formatCurrency(numericAmount, { currency: UPI_CURRENCY })
              : '—'}
          </strong>
        </div>

        {paymentState === 'review' ? (
          <div className="payment-modal__body">
            <div className="form-field">
              <label className="form-label" htmlFor={amountFieldId}>
                Amount (₹)
              </label>

              <input
                id={amountFieldId}
                type="number"
                inputMode="decimal"
                min="0.01"
                max={MAX_AMOUNT}
                step="0.01"
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                placeholder="0.00"
                autoFocus={!amount}
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor={recipientId}>
                Recipient name
              </label>

              <input
                id={recipientId}
                type="text"
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                maxLength={MAX_NAME_LENGTH}
                autoComplete="name"
                placeholder="Enter recipient name"
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor={upiIdField}>
                Recipient UPI ID
              </label>

              <input
                id={upiIdField}
                type="text"
                value={upiId}
                onChange={(event) => setUpiId(event.target.value)}
                maxLength={100}
                autoComplete="off"
                placeholder="name@bank"
                spellCheck={false}
                autoCapitalize="none"
                required
              />

              <p className="form-hint">
                Check the UPI ID carefully before opening your payment app.
              </p>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor={noteId}>
                Payment note
                <span className="form-label__optional">Optional</span>
              </label>

              <input
                id={noteId}
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={MAX_NOTE_LENGTH}
                placeholder="What is this payment for?"
              />
            </div>

            <div className="payment-modal__security">
              <ShieldCheck size={19} aria-hidden="true" />

              <p>
                FinTrack never asks for your UPI PIN or bank password. Enter
                sensitive payment credentials only inside your trusted payment
                app. UPI apps open on phones and tablets that have one
                installed.
              </p>
            </div>

            {error && (
              <div className="form-alert" role="alert">
                <AlertCircle size={17} aria-hidden="true" />
                {error}
              </div>
            )}

            <div className="payment-modal__actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onClose?.()}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={launchPayment}
                disabled={!validAmount}
              >
                <Smartphone size={17} aria-hidden="true" />
                Open UPI app
                <ExternalLink size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <div className="payment-modal__body">
            <div className="payment-modal__return-notice">
              <AlertCircle size={21} aria-hidden="true" />

              <p>
                FinTrack cannot automatically verify the result from your
                payment app. Check your payment app or bank before recording
                the outcome below.
              </p>
            </div>

            {error && (
              <div className="form-alert" role="alert">
                {error}
              </div>
            )}

            <div className="payment-modal__result-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => recordResult('completed')}
                disabled={isSaving}
              >
                {isSaving ? (
                  <LoaderCircle size={17} className="spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 size={17} aria-hidden="true" />
                )}
                I confirmed payment
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => recordResult('failed')}
                disabled={isSaving}
              >
                Payment failed
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => recordResult('cancelled')}
                disabled={isSaving}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Cancelled
              </button>

              <button
                type="button"
                className="payment-modal__back"
                onClick={() => {
                  setPaymentState('review');
                  setError('');
                }}
                disabled={isSaving}
              >
                Back to payment details
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default PaymentModal;
