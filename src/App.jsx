import { lazy, useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import AppLayout from './components/AppLayout.jsx';

/**
 * FinTrack routes.
 *
 * Pages are lazy-loaded to keep the first download small. The Suspense
 * boundary lives inside AppLayout so the sidebar stays on screen while a
 * page loads.
 */
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Transactions = lazy(() => import('./pages/Transactions.jsx'));
const Budget = lazy(() => import('./pages/Budget.jsx'));
const Debt = lazy(() => import('./pages/Debt.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

/** Scroll to the top when navigating to another route. */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

function NotFound() {
  return (
    <main className="not-found page-enter">
      <div className="not-found__content">
        <span className="not-found__code">404</span>

        <h1>Page not found</h1>

        <p>The page you’re looking for doesn’t exist or may have been moved.</p>

        <Link to="/" className="btn btn-primary">
          Return to Dashboard
        </Link>
      </div>
    </main>
  );
}

function App() {
  return (
    <>
      <ScrollToTop />

      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/debt" element={<Debt />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </>
  );
}

export default App;
