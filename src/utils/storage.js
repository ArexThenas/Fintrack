/**
 * Browser-local persistence for FinTrack.
 *
 * Everything lives in localStorage under the "fintrack_" prefix.
 * Nothing is sent to a server.
 */

const STORAGE_PREFIX = 'fintrack_';

export const STORAGE_KEYS = Object.freeze({
  transactions: `${STORAGE_PREFIX}transactions`,
  budgets: `${STORAGE_PREFIX}budgets`,
  debts: `${STORAGE_PREFIX}debts`,
  settings: `${STORAGE_PREFIX}settings`,
});

const COLLECTIONS = ['transactions', 'budgets', 'debts'];

const DEFAULT_VALUES = Object.freeze({
  transactions: [],
  budgets: [],
  debts: [],
  settings: {
    name: '',
    email: '',
    currency: 'INR',
    theme: 'light',
    compactMode: false,
  },
});

function isBrowser() {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    // Accessing localStorage can throw when storage is blocked.
    return false;
  }
}

function getStorageKey(key) {
  if (Object.prototype.hasOwnProperty.call(STORAGE_KEYS, key)) {
    return STORAGE_KEYS[key];
  }

  throw new Error(`Unknown FinTrack storage key: ${String(key)}`);
}

function cloneDefault(key) {
  return JSON.parse(JSON.stringify(DEFAULT_VALUES[key] ?? null));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateValue(key, value) {
  if (COLLECTIONS.includes(key)) {
    if (!Array.isArray(value)) {
      throw new TypeError(`FinTrack ${key} must be an array.`);
    }

    return value;
  }

  if (key === 'settings') {
    if (!isPlainObject(value)) {
      throw new TypeError('FinTrack settings must be an object.');
    }

    return value;
  }

  return value;
}

/**
 * Read a value from localStorage.
 * Returns a fresh default if the key is missing or the stored JSON is invalid.
 */
export function loadData(key) {
  const storageKey = getStorageKey(key);

  if (!isBrowser()) return cloneDefault(key);

  try {
    const raw = window.localStorage.getItem(storageKey);

    if (raw === null) return cloneDefault(key);

    return validateValue(key, JSON.parse(raw));
  } catch (error) {
    console.error(`FinTrack could not load "${key}":`, error);
    return cloneDefault(key);
  }
}

/**
 * Save a value to localStorage.
 * Throws on failure so callers can show a useful message.
 */
export function saveData(key, value) {
  const storageKey = getStorageKey(key);
  const validated = validateValue(key, value);

  if (!isBrowser()) {
    throw new Error('Browser storage is unavailable.');
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(validated));
    return validated;
  } catch (error) {
    console.error(`FinTrack could not save "${key}":`, error);
    throw new Error(
      'Could not save your data. Browser storage may be full or disabled.',
      { cause: error },
    );
  }
}

/** Remove FinTrack's stored data (leaves unrelated site data alone). */
export function clearAllData() {
  if (!isBrowser()) {
    throw new Error('Browser storage is unavailable.');
  }

  try {
    Object.values(STORAGE_KEYS).forEach((storageKey) => {
      window.localStorage.removeItem(storageKey);
    });
  } catch (error) {
    console.error('FinTrack could not clear stored data:', error);
    throw new Error('Could not clear all FinTrack data.', { cause: error });
  }
}

/** Build an exportable JSON backup. */
export function exportBackup() {
  return {
    app: 'FinTrack',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    transactions: loadData('transactions'),
    budgets: loadData('budgets'),
    debts: loadData('debts'),
    settings: loadData('settings'),
  };
}

function assertValidRecords(name, records) {
  records.forEach((record, index) => {
    if (
      !isPlainObject(record) ||
      record.id === undefined ||
      record.id === null ||
      String(record.id).trim() === ''
    ) {
      throw new TypeError(
        `The backup is not valid: ${name} entry ${index + 1} is missing an ID.`,
      );
    }
  });

  const ids = new Set(records.map((record) => String(record.id)));

  if (ids.size !== records.length) {
    throw new TypeError(`The backup is not valid: ${name} contains duplicate IDs.`);
  }
}

/**
 * Restore data from a parsed backup object.
 * Every section is validated before anything is written.
 */
export function importBackup(backup) {
  if (!isPlainObject(backup)) {
    throw new TypeError('The backup file must contain a JSON object.');
  }

  const transactions = validateValue('transactions', backup.transactions ?? []);
  const budgets = validateValue('budgets', backup.budgets ?? []);
  const debts = validateValue('debts', backup.debts ?? []);
  const settings = validateValue(
    'settings',
    backup.settings ?? DEFAULT_VALUES.settings,
  );

  assertValidRecords('transactions', transactions);
  assertValidRecords('budgets', budgets);
  assertValidRecords('debts', debts);

  const nextData = {
    transactions,
    budgets,
    debts,
    settings: { ...DEFAULT_VALUES.settings, ...settings },
  };

  Object.entries(nextData).forEach(([key, value]) => saveData(key, value));

  return nextData;
}

export default {
  STORAGE_KEYS,
  loadData,
  saveData,
  clearAllData,
  exportBackup,
  importBackup,
};
