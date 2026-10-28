import { memo, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Pencil,
  Wallet,
} from 'lucide-react';
import { formatCurrency } from '../utils/format.js';
import { getBudgetPeriodLabel } from '../data/defaultData.js';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getBudgetStatus(spent, limit, warningThreshold) {
  if (limit <= 0) {
    return {
      level: 'unset',
      label: 'No budget set',
      message: 'Set a budget to track your spending.',
    };
  }

  const percentage = (spent / limit) * 100;

  if (percentage >= 100) {
    return {
      level: 'over',
      label: 'Budget exceeded',
      message: 'You have reached or exceeded this budget.',
    };
  }

  if (percentage >= warningThreshold) {
    return {
      level: 'warning',
      label: 'Near budget limit',
      message: 'Your spending is approaching the budget limit.',
    };
  }

  return {
    level: 'healthy',
    label: 'On track',
    message: 'Your spending is within the budget.',
  };
}

function BudgetCard({
  budget,
  category,
  limit,
  spent = 0,
  currency,
  warningThreshold = 80,
  onEdit,
  onViewDetails,
  className = '',
}) {
  const normalizedLimit = Math.max(0, Number(limit ?? budget?.limit) || 0);
  const normalizedSpent = Math.max(0, Number(spent ?? budget?.spent) || 0);

  const resolvedCategory =
    category || budget?.category || 'General';

  const remaining = normalizedLimit - normalizedSpent;

  const percentage =
    normalizedLimit > 0
      ? (normalizedSpent / normalizedLimit) * 100
      : 0;

  const progress = clamp(percentage, 0, 100);

  const threshold = clamp(
    Number(warningThreshold) || 80,
    1,
    100
  );

  const status = useMemo(
    () =>
      getBudgetStatus(
        normalizedSpent,
        normalizedLimit,
        threshold
      ),
    [normalizedSpent, normalizedLimit, threshold]
  );

  const statusIcon =
    status.level === 'over' || status.level === 'warning'
      ? AlertTriangle
      : CheckCircle2;

  const StatusIcon = statusIcon;

  const cardClassName = [
    'budget-card',
    `budget-card--${status.level}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={cardClassName}>
      <div className="budget-card__header">
        <div className="budget-card__identity">
          <span className="budget-card__icon">
            <Wallet size={20} aria-hidden="true" />
          </span>

          <div>
            <h3 className="budget-card__title">
              {resolvedCategory}
            </h3>

            <p className="budget-card__subtitle">
              {getBudgetPeriodLabel(budget?.period)} budget
            </p>
          </div>
        </div>

        {onEdit && (
          <button
            type="button"
            className="icon-button"
            onClick={() =>
              onEdit(budget || {
                category: resolvedCategory,
                limit: normalizedLimit,
                spent: normalizedSpent,
              })
            }
            aria-label={`Edit ${resolvedCategory} budget`}
          >
            <Pencil size={17} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="budget-card__amounts">
        <div>
          <p className="budget-card__label">Spent</p>

          <p className="budget-card__spent">
            {formatCurrency(normalizedSpent, { currency })}
          </p>
        </div>

        <div className="budget-card__limit">
          <p className="budget-card__label">Budget</p>

          <p className="budget-card__limit-value">
            {formatCurrency(normalizedLimit, { currency })}
          </p>
        </div>
      </div>

      <div
        className="budget-progress"
        role="progressbar"
        aria-label={`${resolvedCategory} budget used`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-valuetext={`${percentage.toFixed(1)}% of budget used`}
      >
        <div
          className={`budget-progress__fill budget-progress__fill--${status.level}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="budget-card__progress-label">
        <span>{percentage.toFixed(1)}% used</span>

        <span>
          {normalizedLimit > 0
            ? `${Math.max(0, 100 - percentage).toFixed(1)}% remaining`
            : 'Set a budget limit'}
        </span>
      </div>

      <div className={`budget-card__status budget-card__status--${status.level}`}>
        <StatusIcon size={17} aria-hidden="true" />

        <div>
          <p className="budget-card__status-title">
            {status.label}
          </p>

          <p className="budget-card__status-message">
            {status.message}
          </p>
        </div>
      </div>

      <div className="budget-card__footer">
        <div>
          <p className="budget-card__label">
            {remaining >= 0 ? 'Remaining' : 'Over budget'}
          </p>

          <p
            className={`budget-card__remaining ${remaining < 0
              ? 'budget-card__remaining--negative'
              : ''
              }`}
          >
            {formatCurrency(Math.abs(remaining), { currency })}
          </p>
        </div>

        {onViewDetails && (
          <button
            type="button"
            className="btn btn-secondary budget-card__details"
            onClick={() =>
              onViewDetails(budget || {
                category: resolvedCategory,
                limit: normalizedLimit,
                spent: normalizedSpent,
              })
            }
          >
            Details
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>

  );
}

export { getBudgetStatus };
export default memo(BudgetCard);
