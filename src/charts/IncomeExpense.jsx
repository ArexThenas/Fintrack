import { useMemo } from 'react';
import { groupTransactionsByMonth } from '../utils/calculations.js';
import {
  formatAxisTick,
  formatCurrencyCompact as formatCurrency,
} from '../utils/format.js';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
);

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export default function IncomeExpense({
  transactions = [],
  currency,
  monthsToShow = 6,
}) {
  const monthlyData = useMemo(
    () =>
      groupTransactionsByMonth(transactions, {
        months: Math.max(1, Math.min(12, Number(monthsToShow) || 6)),
      }).map((month) => ({
        ...month,
        label: `${MONTHS[month.month]} ${String(month.year).slice(-2)}`,
      })),
    [transactions, monthsToShow],
  );

  const totalIncome = monthlyData.reduce(
    (sum, month) => sum + month.income,
    0,
  );

  const totalExpenses = monthlyData.reduce(
    (sum, month) => sum + month.expenses,
    0,
  );

  const netBalance = totalIncome - totalExpenses;

  const chartData = {
    labels: monthlyData.map((month) => month.label),
    datasets: [
      {
        label: 'Income',
        data: monthlyData.map((month) => month.income),
        backgroundColor: '#14b8a6',
        borderRadius: 5,
        borderSkipped: false,
        maxBarThickness: 28,
      },
      {
        label: 'Expenses',
        data: monthlyData.map((month) => month.expenses),
        backgroundColor: '#fb7185',
        borderRadius: 5,
        borderSkipped: false,
        maxBarThickness: 28,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          padding: 18,
        },
      },
      tooltip: {
        callbacks: {
          label(context) {
            return ` ${context.dataset.label}: ${formatCurrency(context.raw, currency)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        border: {
          display: false,
          dash: [4, 4],
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.15)',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 11,
          },
          callback: formatAxisTick,
        },
      },
    },

  };

  return (
    <section className="fin-card chart-card">
      <div className="chart-card-header">
        <div>
          <h2>Income vs Expenses</h2>
          <p>Compare your cash flow over the last {monthlyData.length} months.</p>
        </div>
      </div>

      <div className="income-expense-summary">
        <div>
          <span className="summary-dot summary-dot-income" />
          <span>Total income</span>
          <strong>{formatCurrency(totalIncome, currency)}</strong>
        </div>

        <div>
          <span className="summary-dot summary-dot-expense" />
          <span>Total expenses</span>
          <strong>{formatCurrency(totalExpenses, currency)}</strong>
        </div>

        <div>
          <span>Net difference</span>
          <strong className={netBalance >= 0 ? 'text-success' : 'text-danger'}>
            {formatCurrency(netBalance, currency)}
          </strong>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="chart-empty-state">
          <strong>Your cash flow chart is waiting</strong>
          <p>Add income or expense transactions to see your monthly comparison.</p>
        </div>
      ) : (
        <div className="income-expense-chart-container">
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}
    </section>

  );
}
