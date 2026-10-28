import { memo, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';

/* =========================================================
   PAGE CONFIGURATION
   ========================================================= */

const PAGE_METADATA = {
  '/': {
    title: 'Dashboard',
    subtitle: 'Here is your financial overview.',
    icon: LayoutDashboard,
  },
  '/transactions': {
    title: 'Transactions',
    subtitle: 'Manage your income and expenses.',
    icon: Wallet,
  },
  '/budget': {
    title: 'Budget & Savings',
    subtitle: 'Plan your spending and savings goals.',
    icon: Wallet,
  },
  '/debt': {
    title: 'Debt Manager',
    subtitle: 'Keep track of your outstanding balances.',
    icon: Wallet,
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Manage your application preferences.',
    icon: Settings,
  },
};

/* =========================================================
   NAVBAR
   ========================================================= */

function Navbar({
  userName = '',
  onMenuClick,
  onAddTransaction,
  onSearch,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const profileRef = useRef(null);
  const notificationsRef = useRef(null);

  const currentPage = PAGE_METADATA[location.pathname] ?? {
    title: 'FinTrack',
    subtitle: 'Manage your personal finances.',
    icon: LayoutDashboard,
  };

  const PageIcon = currentPage.icon;
  const displayName = userName.trim() || 'My Account';

  /* ---------------------------------------------------------
     Search
     --------------------------------------------------------- */

  function handleSearchChange(event) {
    const value = event.target.value;

    setSearchValue(value);

    // Send search text to the parent component.
    onSearch?.(value);
  }

  function clearSearch() {
    setSearchValue('');
    onSearch?.('');
  }

  function handleSearchSubmit(event) {
    event.preventDefault();

    if (!searchValue.trim()) {
      return;
    }

    if (location.pathname !== '/transactions') {
      navigate('/transactions');
    }
  }

  /* ---------------------------------------------------------
     Close dropdowns when clicking outside
     --------------------------------------------------------- */

  useEffect(() => {
    function handlePointerDown(event) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setIsProfileOpen(false);
      }

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  /* ---------------------------------------------------------
     Keyboard shortcuts
     --------------------------------------------------------- */

  useEffect(() => {
    function handleKeyDown(event) {
      const target = event.target;

      const isTyping =
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
        );

      if (
        event.key === '/' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isTyping
      ) {
        event.preventDefault();

        document.getElementById('fintrack-search')?.focus();
      }

      if (event.key === 'Escape') {
        setIsProfileOpen(false);
        setIsNotificationsOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  /* ---------------------------------------------------------
     Profile actions
     --------------------------------------------------------- */

  function handleProfileNavigation(path) {
    setIsProfileOpen(false);
    navigate(path);
  }

  /* ---------------------------------------------------------
     Render
     --------------------------------------------------------- */

  return (
    <header className="navbar">
      <div className="navbar__main">
        {/* Mobile sidebar toggle */}
        <button
          type="button"
          className="navbar__menu-button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          aria-controls="fintrack-sidebar"
          title="Open menu"
        >
          <Menu size={21} aria-hidden="true" />
        </button>

        {/* Current page */}
        <div className="navbar__page">
          <div className="navbar__page-heading">
            <span className="navbar__page-icon" aria-hidden="true">
              <PageIcon size={18} />
            </span>

            <p className="navbar__page-title">
              {currentPage.title}
            </p>
          </div>

          <p className="navbar__page-subtitle">
            {currentPage.subtitle}
          </p>
        </div>
      </div>

      <div className="navbar__actions">
        {/* Search */}
        <form
          className="navbar__search"
          role="search"
          onSubmit={handleSearchSubmit}
        >
          <Search
            size={18}
            className="navbar__search-icon"
            aria-hidden="true"
          />

          <input
            id="fintrack-search"
            type="search"
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search transactions..."
            aria-label="Search transactions"
            autoComplete="off"
          />

          {searchValue && (
            <button
              type="button"
              className="navbar__search-clear"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <X size={15} aria-hidden="true" />
            </button>
          )}

          {!searchValue && (
            <kbd className="navbar__shortcut" aria-hidden="true">
              /
            </kbd>
          )}
        </form>

        {/* Notifications */}
        <div
          className="navbar__dropdown-container"
          ref={notificationsRef}
        >
          <button
            type="button"
            className={[
              'navbar__icon-button',
              isNotificationsOpen ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              setIsNotificationsOpen((previous) => !previous);
              setIsProfileOpen(false);
            }}
            aria-label="Notifications"
            aria-expanded={isNotificationsOpen}
            title="Notifications"
          >
            <Bell size={19} aria-hidden="true" />
          </button>

          {isNotificationsOpen && (
            <div className="navbar__dropdown navbar__notifications">
              <div className="navbar__dropdown-header">
                <h2>Notifications</h2>
              </div>

              <div className="navbar__notification-empty">
                <Bell size={22} aria-hidden="true" />

                <p>No notifications yet</p>

                <span>
                  Budget alerts and reminders will appear here.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick-add transaction */}
        <button
          type="button"
          className="btn btn-primary navbar__add-button"
          onClick={onAddTransaction}
        >
          <Plus size={18} strokeWidth={2.5} aria-hidden="true" />

          <span>Add transaction</span>
        </button>

        {/* Profile menu */}
        <div
          className="navbar__dropdown-container"
          ref={profileRef}
        >
          <button
            type="button"
            className={[
              'navbar__profile',
              isProfileOpen ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              setIsProfileOpen((previous) => !previous);
              setIsNotificationsOpen(false);
            }}
            aria-label="Open profile menu"
            aria-expanded={isProfileOpen}
          >
            <span className="navbar__avatar" aria-hidden="true">
              <UserRound size={20} />
            </span>

            <span className="navbar__profile-info">
              <span className="navbar__profile-name">
                {displayName}
              </span>

              <span className="navbar__profile-role">
                Personal finance
              </span>
            </span>

            <ChevronDown
              size={15}
              className="navbar__profile-chevron"
              aria-hidden="true"
            />
          </button>

          {isProfileOpen && (
            <div className="navbar__dropdown navbar__profile-menu">
              <div className="navbar__dropdown-user">
                <span className="navbar__avatar" aria-hidden="true">
                  <UserRound size={20} />
                </span>

                <div>
                  <p>{displayName}</p>
                  <span>FinTrack user</span>
                </div>
              </div>

              <div className="navbar__dropdown-divider" />

              <button
                type="button"
                className="navbar__dropdown-item"
                onClick={() => handleProfileNavigation('/settings')}
              >
                <Settings size={17} aria-hidden="true" />
                Settings
              </button>

              <div className="navbar__dropdown-divider" />

              <button
                type="button"
                className="navbar__dropdown-item navbar__dropdown-item--muted"
                onClick={() => {
                  setIsProfileOpen(false);
                }}
                title="Authentication is not implemented yet"
              >
                <LogOut size={17} aria-hidden="true" />
                Sign out
                <span className="navbar__coming-soon">
                  Soon
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default memo(Navbar);