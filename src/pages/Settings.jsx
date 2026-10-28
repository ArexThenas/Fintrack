import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  UserRound,
  Palette,
  IndianRupee,
  Database,
  Download,
  Trash2,
  Save,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Sparkles,
} from 'lucide-react';

import { DEFAULT_SETTINGS } from '../data/defaultData.js';
import { SUPPORTED_CURRENCIES } from '../utils/format.js';
import { exportBackup } from '../utils/storage.js';

function SettingsSection({ icon: Icon, title, description, children }) {
  return (
    <section className="fin-card settings-section">
      <div className="settings-section-heading">
        <div className="settings-section-icon">
          <Icon size={19} aria-hidden="true" />
        </div>

        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <div className="settings-section-content">{children}</div>
    </section>

  );
}

function Field({ label, hint, children }) {
  return (
    <div className="settings-field">
      <label className="settings-label">{label}</label>
      {children}
      {hint && <p className="settings-hint">{hint}</p>} </div>
  );
}

export default function Settings() {
  const context = useOutletContext() ?? {};
  const {
    transactions = [],
    budgets = [],
    debts = [],
    settings: savedSettings,
    onSaveSettings,
    onResetData,
    onImportData,
    onLoadSampleData,
  } = context;

  const importInputRef = useRef(null);

  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...(savedSettings ?? {}) }));
  const [savedMessage, setSavedMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  // Keep the form in sync after an import or reset replaces saved settings.
  useEffect(() => {
    setSettings({ ...DEFAULT_SETTINGS, ...(savedSettings ?? {}) });
  }, [savedSettings]);

  useEffect(() => {
    if (!savedMessage) return undefined;

    const timer = window.setTimeout(() => setSavedMessage(''), 3000);
    return () => window.clearTimeout(timer);

  }, [savedMessage]);

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();

    try {
      if (!onSaveSettings) throw new Error('Settings storage is not connected.');

      await onSaveSettings(settings);

      setSavedMessage('Your settings have been saved.');
    } catch (error) {
      console.error('Could not save settings:', error);
      setSavedMessage('Settings could not be saved. Please try again.');
    }

  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(exportBackup(), null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `fintrack-backup-${new Date().toISOString().slice(0, 10)}.json`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];

    // Allow choosing the same file again later.
    event.target.value = '';

    if (!file) return;

    if (
      !window.confirm(
        'Importing replaces all current transactions, budgets, debts and settings. Continue?'
      )
    ) {
      return;
    }

    try {
      if (!onImportData) throw new Error('Import is not connected.');

      onImportData(JSON.parse(await file.text()));
      setResetMessage('Backup imported successfully.');
    } catch (error) {
      console.error('Could not import backup:', error);
      setResetMessage(
        error instanceof SyntaxError
          ? 'That file is not valid JSON.'
          : error.message || 'The backup could not be imported.'
      );
    }
  }

  function handleLoadSample() {
    try {
      onLoadSampleData?.();
      setResetMessage('Sample data added. Reset your data to remove it.');
    } catch (error) {
      setResetMessage(error.message || 'Sample data could not be added.');
    }
  }

  async function handleReset() {
    try {
      if (onResetData) {
        await onResetData();
      } else {
        [
          'fintrack_transactions',
          'fintrack_budgets',
          'fintrack_debts',
          'fintrack_settings',
        ].forEach((key) => localStorage.removeItem(key));
      }

      setSettings(DEFAULT_SETTINGS);
      setConfirmReset(false);
      setResetMessage('Local FinTrack data has been reset.');
    } catch (error) {
      console.error('Could not reset FinTrack data:', error);
      setResetMessage('Data could not be reset. Please try again.');
    }

  }

  const dataCounts = [
    { label: 'Transactions', value: transactions.length },
    { label: 'Budgets', value: budgets.length },
    { label: 'Debts', value: debts.length },
  ];

  return (
    <div className="settings-page page-enter">
      <header className="page-heading">
        <div>
          <span className="eyebrow">PREFERENCES</span>
          <h1>Settings</h1>
          <p>Personalize FinTrack and manage your financial data.</p>
        </div>
      </header>

      {savedMessage && (
        <div className="settings-notice" role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          {savedMessage}
        </div>
      )}

      {resetMessage && (
        <div className="settings-notice" role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          {resetMessage}
          <button
            type="button"
            className="settings-notice-dismiss"
            onClick={() => setResetMessage('')}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSave}>
        <SettingsSection
          icon={UserRound}
          title="Personal profile"
          description="Customize the profile details displayed in your workspace."
        >
          <div className="settings-fields-grid">
            <Field label="Display name">
              <input
                className="form-control"
                type="text"
                value={settings.name}
                onChange={(event) => updateSetting('name', event.target.value)}
                placeholder="Enter your name"
                maxLength={80}
                autoComplete="name"
              />
            </Field>

            <Field label="Email address" hint="Optional. This is stored locally in this browser.">
              <input
                className="form-control"
                type="email"
                value={settings.email}
                onChange={(event) => updateSetting('email', event.target.value)}
                placeholder="you@example.com"
                maxLength={254}
                autoComplete="email"
              />
            </Field>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={IndianRupee}
          title="Regional preferences"
          description="Choose the currency used to display financial amounts."
        >
          <div className="settings-fields-grid">
            <Field
              label="Default currency"
              hint="Changing this setting changes how amounts are displayed; it does not convert stored values."
            >
              <select
                className="form-control"
                value={settings.currency}
                onChange={(event) => updateSetting('currency', event.target.value)}
              >
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <option key={currency.value} value={currency.value}>
                    {currency.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Palette}
          title="Appearance"
          description="Choose how FinTrack looks on your device."
        >
          <div className="settings-fields-grid">
            <Field label="Color theme">
              <div className="settings-theme-options">
                {[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ].map((theme) => (
                  <label
                    key={theme.value}
                    className={`settings-theme-option ${settings.theme === theme.value ? 'is-selected' : ''
                      }`}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={theme.value}
                      checked={settings.theme === theme.value}
                      onChange={() => updateSetting('theme', theme.value)}
                    />
                    <span>{theme.label}</span>
                  </label>
                ))}
              </div>
            </Field>

            <label className="settings-toggle-row">
              <span>
                <strong>Compact tables</strong>
                <small>Use a denser layout for transaction lists.</small>
              </span>

              <input
                type="checkbox"
                checked={Boolean(settings.compactMode)}
                onChange={(event) =>
                  updateSetting('compactMode', event.target.checked)
                }
              />
            </label>
          </div>
        </SettingsSection>

        <div className="settings-save-row">
          <p>Your preferences are saved in this browser.</p>

          <button className="btn btn-primary" type="submit">
            <Save size={16} aria-hidden="true" />
            Save settings
          </button>
        </div>
      </form>

      <SettingsSection
        icon={Database}
        title="Your data"
        description="Export a backup of your local financial records or reset the app."
      >
        <div className="settings-data-summary">
          {dataCounts.map((item) => (
            <div className="settings-data-stat" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="settings-data-actions">
          <div className="settings-data-action-copy">
            <strong>Export a backup</strong>
            <p>
              Download your settings, transactions, budgets, and debts as a
              JSON file.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExport}
          >
            <Download size={16} aria-hidden="true" />
            Export data
          </button>
        </div>

        <div className="settings-data-actions">
          <div className="settings-data-action-copy">
            <strong>Import a backup</strong>
            <p>
              Restore data from a FinTrack backup file. This replaces
              everything currently stored in this browser.
            </p>
          </div>

          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={handleImport}
            tabIndex={-1}
          />

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload size={16} aria-hidden="true" />
            Import data
          </button>
        </div>

        <div className="settings-data-actions">
          <div className="settings-data-action-copy">
            <strong>Load sample data</strong>
            <p>
              Fill an empty workspace with example transactions, budgets and a
              debt so you can explore the app.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLoadSample}
            disabled={dataCounts.some((item) => item.value > 0)}
          >
            <Sparkles size={16} aria-hidden="true" />
            Load samples
          </button>
        </div>

        <div className="settings-data-actions settings-danger-zone">
          <div className="settings-data-action-copy">
            <strong>Reset local data</strong>
            <p>
              Remove locally stored FinTrack records from this browser. Export
              a backup first if you may need these records later.
            </p>
          </div>

          {!confirmReset ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setConfirmReset(true)}
            >
              <Trash2 size={16} aria-hidden="true" />
              Reset data
            </button>
          ) : (
            <div className="settings-reset-confirm">
              <p>
                <AlertTriangle size={16} aria-hidden="true" />
                This action cannot be undone.
              </p>

              <button
                type="button"
                className="btn btn-danger"
                onClick={handleReset}
              >
                <RotateCcw size={16} aria-hidden="true" />
                Confirm reset
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </SettingsSection>

      <div className="settings-privacy-note">
        <ShieldCheck size={18} aria-hidden="true" />
        <div>
          <strong>Your privacy matters</strong>
          <p>
            This version is designed for browser-local storage. Do not store
            banking passwords, UPI PINs, or other payment credentials in
            FinTrack. A downloaded backup may contain sensitive financial
            information, so keep it somewhere secure.
          </p>
        </div>
      </div>
    </div>

  );
}
