import { memo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Wallet,
} from 'lucide-react';

import { formatCurrency } from '../utils/format.js';

const VARIANT_STYLES = {
  balance: {
    className: 'stat-card--balance',
    label: 'Total balance',
  },
  income: {
    className: 'stat-card--income',
    label: 'Total income',
  },
  expense: {
    className: 'stat-card--expense',
    label: 'Total expenses',
  },
  savings: {
    className: 'stat-card--savings',
    label: 'Total savings',
  },
};

function formatPercentage(value) {
  const percentage = Number(value);

  if (!Number.isFinite(percentage)) return null;

  return `${Math.abs(percentage).toFixed(1)}%`;
}

function TrendIndicator({ trend, trendLabel }) {
  if (trend === null || trend === undefined) return null;

  const numericTrend = Number(trend);

  if (!Number.isFinite(numericTrend)) return null;

  const isPositive = numericTrend > 0;
  const isNegative = numericTrend < 0;

  const Icon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus;

  const trendClass = isPositive
    ? 'stat-card__trend--positive'
    : isNegative
      ? 'stat-card__trend--negative'
      : 'stat-card__trend--neutral';

  return (
    <div className={`stat-card__trend ${trendClass}`}>
      <Icon size={15} aria-hidden="true" />

      <span>{formatPercentage(numericTrend) ?? '0.0%'}</span>

      {trendLabel && (
        <span className="stat-card__trend-label">{trendLabel}</span>
      )}

      <span className="sr-only">
        {isPositive ? 'Increase' : isNegative ? 'Decrease' : 'No change'}
      </span>
    </div>
  );
}

/**
 * A single headline figure. `value` is formatted as currency unless
 * `format="number"` is passed (used for counts such as "over-budget categories").
 */
function StatCard({
  title,
  value = 0,
  format = 'currency',
  icon: Icon = Wallet,
  variant = 'balance',
  currency,
  trend,
  trendLabel = 'vs. previous period',
  description,
  loading = false,
  className = '',
  onClick,
}) {
  const variantConfig = VARIANT_STYLES[variant] ?? VARIANT_STYLES.balance;

  const displayTitle = title || variantConfig.label;
  const isInteractive = typeof onClick === 'function';

  const formattedValue =
    format === 'number'
      ? new Intl.NumberFormat('en-IN').format(Number(value) || 0)
      : formatCurrency(value, currency ? { currency } : undefined);

  const cardClassName = [
    'stat-card',
    variantConfig.className,
    isInteractive ? 'stat-card--interactive' : '',
    loading ? 'stat-card--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <div className="stat-card__top">
        <div className="stat-card__heading">
          <span className="stat-card__title">{displayTitle}</span>

          {description && (
            <span className="stat-card__description">{description}</span>
          )}
        </div>

        <span className="stat-card__icon">
          <Icon size={21} aria-hidden="true" />
        </span>
      </div>

      <div className="stat-card__value" aria-live={loading ? 'off' : 'polite'}>
        {loading ? (
          <span className="stat-card__skeleton" aria-label="Loading amount" />
        ) : (
          formattedValue
        )}
      </div>

      {!loading && (
        <div className="stat-card__footer">
          <TrendIndicator trend={trend} trendLabel={trendLabel} />
        </div>
      )}
    </>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        className={cardClassName}
        onClick={onClick}
        aria-label={`${displayTitle}: ${loading ? 'Loading' : formattedValue}`}
        disabled={loading}
      >
        {content}
      </button>
    );
  }

  return (
    <article className={cardClassName} aria-label={displayTitle}>
      {content}
    </article>
  );
}

export default memo(StatCard);
