import { useMemo } from 'react';
import { calculateExpensesByCategory } from '../utils/calculations.js';
import { formatCurrencyCompact as formatCurrency } from '../utils/format.js';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const CATEGORY_COLORS = [
  '#6366f1',
  '#14b8a6',
  '#f59e0b',
  '#f43f5e',
  '#8b5cf6',
  '#0ea5e9',
  '#84cc16',
  '#f97316',
  '#64748b',
  '#ec4899',
];

export default function ExpensePie({
  transactions = [],
  currency,
  period = 'month',
}) {
  const categoryTotals = useMemo(
    () =>
      calculateExpensesByCategory(transactions, { period }).map(
        ({ category, amount }) => [category, amount],
      ),
    [transactions, period],
  );

  const totalExpenses = categoryTotals.reduce(
    (total, [, amount]) => total + amount,
    0,
  );

  const chartData = {
    labels: categoryTotals.map(([category]) => category),
    datasets: [
      {
        data: categoryTotals.map(([, amount]) => amount),
        backgroundColor: categoryTotals.map(
          (_, index) => CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        ),
        borderWidth: 0,
        hoverOffset: 7,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label(context) {
            const amount = Number(context.raw) || 0;
            const percentage = totalExpenses
              ? ((amount / totalExpenses) * 100).toFixed(1)
              : '0.0';

            return ` ${context.label}: ${formatCurrency(amount, currency)} (${percentage}%)`;
          },
        },
      },
    },

  };

  return (
    <section className="fin-card chart-card">
      <div className="chart-card-header">
        <div>
          <h2>Expense Breakdown</h2>
          <p>
            {period === 'year'
              ? 'Spending by category this year'
              : period === 'all'
                ? 'Spending by category across all records'
                : 'Spending by category this month'} </p>
        </div>

        <span className="chart-total">
          {formatCurrency(totalExpenses, currency)}
        </span>
      </div>

      {categoryTotals.length === 0 ? (
        <div className="chart-empty-state">
          <div className="chart-empty-icon">◔</div>
          <strong>No expenses to display</strong>
          <p>Add an expense to see your spending breakdown.</p>
        </div>
      ) : (
        <>
          <div
            className="expense-doughnut-container"
            role="img"
            aria-label={`Expense breakdown chart. Total expenses: ${formatCurrency(totalExpenses, currency)}.`}
          >
            <Doughnut data={chartData} options={chartOptions} />
            <div className="expense-doughnut-center" aria-hidden="true">
              <span>Total spent</span>
              <strong>{formatCurrency(totalExpenses, currency)}</strong>
            </div>
          </div>

          <div className="expense-category-legend">
            {categoryTotals.map(([category, amount], index) => {
              const percentage = totalExpenses
                ? (amount / totalExpenses) * 100
                : 0;

              return (
                <div className="expense-legend-item" key={category}>
                  <span
                    className="expense-legend-dot"
                    style={{
                      backgroundColor:
                        CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                    }}
                    aria-hidden="true"
                  />

                  <span className="expense-legend-name">{category}</span>

                  <span className="expense-legend-percentage">
                    {percentage.toFixed(0)}%
                  </span>

                  <strong className="expense-legend-amount">
                    {formatCurrency(amount, currency)}
                  </strong>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>

  );
}