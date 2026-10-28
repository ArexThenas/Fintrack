import { useMemo } from 'react';
import { calculateDailyExpenses } from '../utils/calculations.js';
import {
  formatAxisTick,
  formatCurrencyCompact as formatCurrency,
} from '../utils/format.js';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
);

export default function SpendingTrend({
  transactions = [],
  currency,
}) {
  const { labels, dailyTotals, totalSpent, averageDailySpend, hasSpending } =
    useMemo(() => {
      const daily = calculateDailyExpenses(transactions);

      return {
        labels: daily.labels,
        dailyTotals: daily.values,
        totalSpent: daily.total,
        averageDailySpend: daily.averagePerDay,
        hasSpending: daily.total > 0,
      };
    }, [transactions]);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Daily spending',
        data: dailyTotals,
        fill: true,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.10)',
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: '#6366f1',
        pointBorderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title(items) {
            return `Day ${items[0]?.label ?? ''}`;
          },
          label(context) {
            return ` Spent: ${formatCurrency(context.raw, currency)}`;
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
          maxTicksLimit: 10,
        },
      },
      y: {
        beginAtZero: true,
        border: {
          display: false,
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.15)',
        },
        ticks: {
          color: '#94a3b8',
          callback: formatAxisTick,
        },
      },
    },

  };

  return (
    <section className="fin-card chart-card">
      <div className="chart-card-header">
        <div>
          <h2>Spending Trend</h2>
          <p>Your daily expenses for the current month.</p>
        </div>
      </div>

      <div className="spending-trend-summary">
        <div>
          <span>Total this month</span>
          <strong>{formatCurrency(totalSpent, currency)}</strong>
        </div>

        <div>
          <span>Daily average so far</span>
          <strong>{formatCurrency(averageDailySpend, currency)}</strong>
        </div>
      </div>

      {!hasSpending ? (
        <div className="chart-empty-state">
          <strong>No spending recorded yet</strong>
          <p>Add an expense to start tracking your daily spending.</p>
        </div>
      ) : (
        <div className="spending-trend-chart-container">
          <Line data={chartData} options={chartOptions} />
        </div>
      )}
    </section>

  );
}
