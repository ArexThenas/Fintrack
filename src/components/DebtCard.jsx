import { memo, useMemo } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Pencil,
  Wallet,
} from 'lucide-react';
import { formatCurrency } from '../utils/format.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toAmount(value) {
  const amount = Number(value);

  return Number.isFinite(amount) && amount > 0
    ? amount
    : 0;
}

function parseLocalDate(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  date.setHours(0, 0, 0, 0);

  return date;
}

function formatDate(value) {
  const date = parseLocalDate(value);

  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getDebtStatus(outstanding, dueDate, today = new Date()) {
  const remaining = toAmount(outstanding);

  if (remaining === 0) {
    return {
      level: 'paid',
      label: 'Fully paid',
      message: 'This debt has been fully repaid.',
      Icon: CheckCircle2,
    };
  }

  const due = parseLocalDate(dueDate);

  if (due) {
    const currentDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    const daysRemaining = Math.round(
      (due.getTime() - currentDate.getTime()) / DAY_IN_MS
    );

    if (daysRemaining < 0) {
      return {
        level: 'overdue',
        label: 'Overdue',
        message: `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'
          }.`,
        Icon: AlertCircle,
      };
    }

    if (daysRemaining === 0) {
      return {
        level: 'due-today',
        label: 'Due today',
        message: 'This debt is due today.',
        Icon: AlertCircle,
      };
    }

    if (daysRemaining <= 7) {
      return {
        level: 'due-soon',
        label: 'Due soon',
        message: `Due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'
          }.`,
        Icon: Clock3,
      };
    }

  }

  return {
    level: 'active',
    label: 'In progress',
    message: 'Keep tracking your repayments.',
    Icon: Wallet,
  };
}

function resolveDebtAmounts({
  principal,
  amountPaid,
  outstanding,
}) {
  const originalPrincipal = toAmount(principal);

  let repaid;
  let remaining;

  if (outstanding !== undefined && outstanding !== null) {
    remaining = Math.min(
      originalPrincipal || toAmount(outstanding),
      toAmount(outstanding)
    );

    repaid =
      amountPaid !== undefined && amountPaid !== null
        ? toAmount(amountPaid)
        : Math.max(0, originalPrincipal - remaining);

  } else {
    repaid = Math.min(
      originalPrincipal,
      toAmount(amountPaid)
    );

    remaining = Math.max(0, originalPrincipal - repaid);

  }

  if (originalPrincipal > 0) {
    repaid = Math.min(repaid, originalPrincipal);
    remaining = Math.min(remaining, originalPrincipal);
  }

  const progress =
    originalPrincipal > 0
      ? Math.min(
        100,
        Math.max(0, (repaid / originalPrincipal) * 100)
      )
      : 0;

  return {
    principal: originalPrincipal,
    repaid,
    remaining,
    progress,
  };
}

function DebtCard({
  debt,
  name,
  lender,
  principal,
  amountPaid,
  outstanding,
  dueDate,
  currency,
  onEdit,
  onRepay,
  onViewDetails,
  className = '',
}) {
  const record = debt ?? {};

  const debtName =
    name || record.name || 'Unnamed debt';

  const debtLender =
    lender || record.lender || 'Lender not specified';

  const resolvedPrincipal =
    principal ?? record.principal;

  const resolvedPaid =
    amountPaid ?? record.amountPaid;

  const resolvedOutstanding =
    outstanding ?? record.outstanding;

  const resolvedDueDate =
    dueDate ?? record.dueDate;

  const amounts = useMemo(
    () =>
      resolveDebtAmounts({
        principal: resolvedPrincipal,
        amountPaid: resolvedPaid,
        outstanding: resolvedOutstanding,
      }),
    [
      resolvedPrincipal,
      resolvedPaid,
      resolvedOutstanding,
    ]
  );

  const status = useMemo(
    () => getDebtStatus(amounts.remaining, resolvedDueDate),
    [amounts.remaining, resolvedDueDate]
  );

  const StatusIcon = status.Icon;

  const formattedDueDate = formatDate(resolvedDueDate);

  const cardClassName = [
    'debt-card',
    `debt-card--${status.level}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const debtForCallback = {
    ...record,
    name: debtName,
    lender: debtLender,
    principal: amounts.principal,
    amountPaid: amounts.repaid,
    outstanding: amounts.remaining,
    dueDate: resolvedDueDate || '',
  };

  return (
    <article className={cardClassName}>
      <header className="debt-card__header">
        <div className="debt-card__identity">
          <span className="debt-card__icon" aria-hidden="true">
            <Wallet size={21} />
          </span>

          <div className="debt-card__identity-text">
            <h3 className="debt-card__title">
              {debtName}
            </h3>

            <p className="debt-card__lender">
              {debtLender}
            </p>
          </div>
        </div>

        {onEdit && (
          <button
            type="button"
            className="icon-button"
            onClick={() => onEdit(debtForCallback)}
            aria-label={`Edit ${debtName}`}
          >
            <Pencil size={17} aria-hidden="true" />
          </button>
        )}
      </header>

      <section className="debt-card__balance">
        <p className="debt-card__label">
          Outstanding balance
        </p>

        <p className="debt-card__amount">
          {formatCurrency(amounts.remaining, { currency })}
        </p>

        <span
          className={`debt-status debt-status--${status.level}`}
          role="status"
        >
          <StatusIcon size={15} aria-hidden="true" />
          {status.label}
        </span>
      </section>

      <div className="debt-card__summary">
        <div>
          <p className="debt-card__label">
            Original amount
          </p>

          <p className="debt-card__summary-value">
            {formatCurrency(amounts.principal, { currency })}
          </p>
        </div>

        <div>
          <p className="debt-card__label">
            Amount repaid
          </p>

          <p className="debt-card__summary-value debt-card__summary-value--paid">
            {formatCurrency(amounts.repaid, { currency })}
          </p>
        </div>
      </div>

      <section className="debt-card__repayment">
        <div className="debt-card__progress-heading">
          <span>Repayment progress</span>
          <span>{amounts.progress.toFixed(1)}%</span>
        </div>

        <div
          className="debt-progress"
          role="progressbar"
          aria-label={`${debtName} repayment progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(amounts.progress)}
          aria-valuetext={`${amounts.progress.toFixed(1)}% repaid`}
        >
          <div
            className="debt-progress__fill"
            style={{ width: `${amounts.progress}%` }}
          />
        </div>

        <p className="debt-card__status-message">
          {status.message}
        </p>
      </section>

      {formattedDueDate && (
        <div className="debt-card__metadata">
          <span className="debt-card__due-date">
            <CalendarDays size={15} aria-hidden="true" />
            <span>Due {formattedDueDate}</span>
          </span>
        </div>
      )}

      <footer className="debt-card__footer">
        {amounts.remaining > 0 && onRepay && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onRepay(debtForCallback)}
          >
            Record repayment
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}

        {onViewDetails && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onViewDetails(debtForCallback)}
          >
            Details
          </button>
        )}

        {amounts.remaining === 0 && !onViewDetails && (
          <span className="debt-card__footer-note">
            <CheckCircle2 size={16} aria-hidden="true" />
            Debt fully repaid
          </span>
        )}
      </footer>
    </article>

  );
}

export {
  formatDate,
  getDebtStatus,
  resolveDebtAmounts,
};

export default memo(DebtCard);
