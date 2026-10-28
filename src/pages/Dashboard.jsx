import { useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Plus,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import StatCard from '../components/StatCard.jsx';
import BudgetCard from '../components/BudgetCard.jsx';
import TransactionTable from '../components/TransactionTable.jsx';

import ExpensePie from '../charts/ExpensePie.jsx';
import IncomeExpense from '../charts/IncomeExpense.jsx';
import SpendingTrend from '../charts/SpendingTrend.jsx';

import { useTransactions } from '../hooks/useTransactions.js';
import { useBudgets } from '../hooks/useBudgets.js';
import {
  calculateDashboardSummary,
  getRecentTransactions,
  withBudgetSpending,
} from '../utils/calculations.js';
import { formatDate } from '../utils/format.js';

function getGreeting(name) {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = String(name ?? '').trim().split(/\s+/)[0];

  return firstName ? `${period}, ${firstName}!` : `${period}!`;
}

function DashboardSectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="dashboard-section-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}

        <h2>{title}</h2>

        {description && <p>{description}</p>}
      </div>

      {action}
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="dashboard-loading page-enter" role="status" aria-live="polite">
      <div className="page-loader__spinner" />
      <p>Loading your financial overview...</p>
    </div>
  );
}

function DashboardError({ message, onRetry }) {
  return (
    <div className="dashboard-error" role="alert">
      <h2>Unable to load your dashboard</h2>

      <p>{message || 'Something went wrong while loading your financial data.'}</p>

      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

function Dashboard() {
  const outletContext = useOutletContext() ?? {};
  const { searchQuery = '', onAddTransaction, settings } = outletContext;

  const {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
    refresh: refreshTransactions,
  } = useTransactions();

  const { budgets, loading: budgetsLoading } = useBudgets();

  const summary = useMemo(
    () => calculateDashboardSummary(transactions),
    [transactions],
  );

  const recentTransactions = useMemo(
    () => getRecentTransactions(transactions, 5),
    [transactions],
  );

  const activeBudgets = useMemo(
    () => withBudgetSpending(budgets.slice(0, 3), transactions),
    [budgets, transactions],
  );

  if (transactionsLoading || budgetsLoading) {
    return <DashboardLoading />;
  }

  if (transactionsError) {
    return (
      <DashboardError
        message={
          typeof transactionsError === 'string'
            ? transactionsError
            : transactionsError.message
        }
        onRetry={refreshTransactions}
      />
    );
  }

  return (
    <div className="dashboard-page page-enter">
      <section className="dashboard-welcome">
        <div className="dashboard-welcome__copy">
          <span className="eyebrow">YOUR FINANCIAL OVERVIEW</span>

          <h1>{getGreeting(settings?.name)}</h1>

          <p>Here’s what’s happening with your money today.</p>
        </div>

        <div className="dashboard-welcome__actions">
          <span className="dashboard-date">
            <CalendarDays size={17} aria-hidden="true" />
            {formatDate(new Date(), {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>

          <button type="button" className="btn btn-primary" onClick={onAddTransaction}>
            <Plus size={18} aria-hidden="true" />
            Add transaction
          </button>
        </div>
      </section>

      <section className="dashboard-stats" aria-label="Financial summary">
        <StatCard
          title="Total balance"
          value={summary.balance}
          icon={Wallet}
          variant="balance"
          description="Net recorded income and expenses"
        />

        <StatCard
          title="Total income"
          value={summary.income}
          icon={ArrowDownRight}
          variant="income"
          description="All recorded income"
        />

        <StatCard
          title="Total expenses"
          value={summary.expenses}
          icon={ArrowUpRight}
          variant="expense"
          description="All recorded expenses"
        />

        <StatCard
          title="Saved this month"
          value={summary.monthlyBalance}
          icon={TrendingUp}
          variant="savings"
          description="This month’s income minus expenses"
        />
      </section>

      <section className="dashboard-charts">
        <div className="dashboard-panel dashboard-panel--bare dashboard-panel--large">
          <IncomeExpense transactions={transactions} />
        </div>

        <div className="dashboard-panel dashboard-panel--bare">
          <ExpensePie transactions={transactions} />
        </div>
      </section>

      <section className="dashboard-panel dashboard-panel--bare dashboard-panel--trend">
        <SpendingTrend transactions={transactions} />
      </section>

      <section className="dashboard-lower-grid">
        <div className="dashboard-panel dashboard-panel--transactions">
          <DashboardSectionHeader
            eyebrow="LATEST ACTIVITY"
            title="Recent transactions"
            description="Your five most recent recorded transactions."
            action={
              <Link to="/transactions" className="dashboard-text-link">
                View all
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            }
          />

          <TransactionTable
            transactions={recentTransactions}
            searchQuery={searchQuery}
            showSearch={false}
            showPagination={false}
            title="Latest transactions"
            emptyMessage="Add your first transaction to see it here."
          />
        </div>

        <div className="dashboard-panel dashboard-panel--budgets">
          <DashboardSectionHeader
            eyebrow="SPENDING LIMITS"
            title="Budget overview"
            description="Keep your spending on track."
            action={
              <Link to="/budget" className="dashboard-text-link">
                View all
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            }
          />

          {activeBudgets.length > 0 ? (
            <div className="dashboard-budget-list">
              {activeBudgets.map((budget) => (
                <BudgetCard
                  key={budget.id}
                  budget={budget}
                  category={budget.category}
                  limit={budget.limit}
                  spent={budget.spent}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state dashboard-empty-state">
              <span className="empty-state__icon">
                <Wallet size={22} aria-hidden="true" />
              </span>

              <h3>No budgets yet</h3>

              <p>Set a spending limit to start tracking your expenses.</p>

              <Link to="/budget" className="btn btn-secondary">
                Create a budget
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
