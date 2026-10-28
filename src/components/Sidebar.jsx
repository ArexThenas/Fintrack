import { memo, useCallback, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import {
  ArrowLeftRight,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  PiggyBank,
  Settings,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';

/* =========================================================
   NAVIGATION CONFIGURATION
   ========================================================= */

const PRIMARY_NAVIGATION = [
  {
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: 'Transactions',
    path: '/transactions',
    icon: ArrowLeftRight,
  },
  {
    label: 'Budget & Savings',
    path: '/budget',
    icon: Wallet,
    badge: 'Plan',
  },
  {
    label: 'Debt Manager',
    path: '/debt',
    icon: CreditCard,
  },
];

const SECONDARY_NAVIGATION = [
  {
    label: 'Settings',
    path: '/settings',
    icon: Settings,
  },
];

/* =========================================================
   BRAND
   ========================================================= */

function SidebarBrand({ onClose }) {
  return (
    <div className="sidebar__brand">
      <NavLink
        to="/"
        className="sidebar__brand-link"
        aria-label="FinTrack home"
        onClick={onClose}
      >
        <span className="sidebar__brand-icon" aria-hidden="true">
          <TrendingUp size={23} strokeWidth={2.5} />
        </span>

        <span className="sidebar__brand-text">
          <span className="sidebar__brand-name">
            FinTrack
          </span>

          <span className="sidebar__brand-caption">
            PERSONAL FINANCE
          </span>
        </span>
      </NavLink>

      <button
        type="button"
        className="sidebar__close"
        onClick={onClose}
        aria-label="Close navigation menu"
      >
        <X size={20} aria-hidden="true" />
      </button>
    </div>
  );
}

/* =========================================================
   NAVIGATION SECTION
   ========================================================= */

function NavigationSection({
  title,
  items,
  onNavigate,
}) {
  return (
    <section className="sidebar__section">
      <h2 className="sidebar__section-label">
        {title}
      </h2>

      <ul className="sidebar__menu">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <li
              className="sidebar__menu-item"
              key={item.path}
            >
              <NavLink
                to={item.path}
                end={item.end ?? false}
                onClick={onNavigate}
                className={({ isActive }) =>
                  [
                    'sidebar__link',
                    isActive ? 'is-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                }
              >
                <Icon
                  className="sidebar__link-icon"
                  size={19}
                  strokeWidth={1.9}
                  aria-hidden="true"
                />

                <span className="sidebar__link-label">
                  {item.label}
                </span>

                {item.badge && (
                  <span className="sidebar__link-badge">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* =========================================================
   FINANCIAL INSIGHT CARD
   ========================================================= */

function SidebarInsight({ onNavigate }) {
  return (
    <section
      className="sidebar__insight"
      aria-labelledby="sidebar-insight-title"
    >
      <div className="sidebar__insight-icon" aria-hidden="true">
        <PiggyBank size={21} />
      </div>

      <h2
        id="sidebar-insight-title"
        className="sidebar__insight-title"
      >
        Build better habits
      </h2>

      <p className="sidebar__insight-description">
        Track your spending and stay on top of your financial goals.
      </p>

      <NavLink
        to="/budget"
        className="sidebar__insight-link"
        onClick={onNavigate}
      >
        View your budget
        <span aria-hidden="true">→</span>
      </NavLink>
    </section>
  );
}

/* =========================================================
   SIDEBAR FOOTER
   ========================================================= */

function SidebarFooter() {
  return (
    <footer className="sidebar__footer">
      <div className="sidebar__footer-divider" />

      <div className="sidebar__help">
        <CircleHelp
          size={19}
          aria-hidden="true"
        />

        <div>
          <p className="sidebar__help-title">
            Need help?
          </p>

          <p className="sidebar__help-description">
            Your finances, simplified.
          </p>
        </div>
      </div>

      <p className="sidebar__version">
        FINTRACK · VERSION 1.0
      </p>
    </footer>
  );
}

/* =========================================================
   MAIN SIDEBAR
   ========================================================= */

function Sidebar({
  isOpen = false,
  onClose,
}) {
  const location = useLocation();

  const closeSidebar = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // Close the mobile sidebar whenever the route changes.
  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  // Prevent background scrolling while the mobile menu is open.
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Close the mobile menu with the Escape key.
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeSidebar]);

  return (
    <>
      <button
        type="button"
        className={[
          'sidebar-backdrop',
          isOpen ? 'is-visible' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={closeSidebar}
        aria-label="Close navigation menu"
        aria-hidden={!isOpen}
        tabIndex={isOpen ? 0 : -1}
      />

      <aside
        id="fintrack-sidebar"
        className={[
          'sidebar',
          isOpen ? 'sidebar--open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Main navigation"
        aria-hidden={!isOpen && undefined}
      >
        <SidebarBrand onClose={closeSidebar} />

        <nav className="sidebar__navigation">
          <NavigationSection
            title="WORKSPACE"
            items={PRIMARY_NAVIGATION}
            onNavigate={closeSidebar}
          />

          <NavigationSection
            title="PREFERENCES"
            items={SECONDARY_NAVIGATION}
            onNavigate={closeSidebar}
          />
        </nav>

        <div className="sidebar__bottom">
          <SidebarInsight onNavigate={closeSidebar} />
          <SidebarFooter />
        </div>
      </aside>
    </>
  );
}

export default memo(Sidebar);