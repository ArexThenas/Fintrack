import { useCallback, useEffect, useRef, useState } from 'react';

import {
  STORAGE_KEYS,
  clearAllData,
  importBackup,
  loadData,
  saveData,
} from '../utils/storage.js';

import {
  createDefaultSettings,
  createDemoData,
  createEmptyFinancialData,
  createRecordId,
} from '../data/defaultData.js';

const COLLECTIONS = ['transactions', 'budgets', 'debts'];

const ID_PREFIXES = {
  transactions: 'txn',
  budgets: 'budget',
  debts: 'debt',
};

const KEY_TO_NAME = {
  [STORAGE_KEYS.transactions]: 'transactions',
  [STORAGE_KEYS.budgets]: 'budgets',
  [STORAGE_KEYS.debts]: 'debts',
  [STORAGE_KEYS.settings]: 'settings',
};

function readAll() {
  return {
    transactions: loadData('transactions'),
    budgets: loadData('budgets'),
    debts: loadData('debts'),
    settings: { ...createDefaultSettings(), ...loadData('settings') },
  };
}

function assertCollection(collection) {
  if (!COLLECTIONS.includes(collection)) {
    throw new Error(`Unsupported FinTrack collection: ${collection}`);
  }
}

function assertPlainObject(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(message);
  }
}

/**
 * The single source of truth for FinTrack's data.
 *
 * Every operation runs synchronously against `stateRef` (the latest data),
 * writes to localStorage, then publishes the result to React. Two operations
 * in the same tick therefore see each other's changes, and storage failures
 * are thrown to the caller so forms can show them.
 */
export default function useFinTrackData() {
  const [state, setState] = useState(() => ({ ...readAll(), error: '' }));
  const stateRef = useRef(state);

  const commit = useCallback((patch) => {
    stateRef.current = { ...stateRef.current, ...patch };
    setState(stateRef.current);
  }, []);

  /* Keep several open tabs in sync. The event fires in the OTHER tabs. */
  useEffect(() => {
    function handleStorage(event) {
      // A null key means localStorage.clear() was called.
      if (event.key !== null && !KEY_TO_NAME[event.key]) return;

      commit(readAll());
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [commit]);

  const clearError = useCallback(() => commit({ error: '' }), [commit]);

  const refresh = useCallback(() => commit({ ...readAll(), error: '' }), [commit]);

  /** Persist one collection, publish it, and surface failures. */
  const write = useCallback(
    (collection, records) => {
      try {
        saveData(collection, records);
      } catch (error) {
        commit({ error: error.message });
        throw error;
      }

      commit({ [collection]: records, error: '' });
      return records;
    },
    [commit],
  );

  /* ---------- Generic record operations ---------- */

  const addRecord = useCallback(
    (collection, input) => {
      assertCollection(collection);
      assertPlainObject(input, 'A record must be an object.');

      const now = new Date().toISOString();
      const record = {
        ...input,
        id: input.id ?? createRecordId(ID_PREFIXES[collection]),
        createdAt: input.createdAt ?? now,
        updatedAt: now,
      };

      const current = stateRef.current[collection];

      if (current.some((item) => String(item.id) === String(record.id))) {
        throw new Error('A record with this ID already exists.');
      }

      write(collection, [...current, record]);
      return record;
    },
    [write],
  );

  const updateRecord = useCallback(
    (collection, id, changes) => {
      assertCollection(collection);

      const current = stateRef.current[collection];
      const existing = current.find((item) => String(item.id) === String(id));

      if (!existing) {
        throw new Error('The record could not be found.');
      }

      const patch = typeof changes === 'function' ? changes(existing) : changes;
      assertPlainObject(patch, 'The record update is invalid.');

      const updated = {
        ...existing,
        ...patch,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };

      write(
        collection,
        current.map((item) => (String(item.id) === String(id) ? updated : item)),
      );

      return updated;
    },
    [write],
  );

  const deleteRecord = useCallback(
    (collection, id) => {
      assertCollection(collection);

      const current = stateRef.current[collection];
      const next = current.filter((item) => String(item.id) !== String(id));

      if (next.length === current.length) return false;

      write(collection, next);
      return true;
    },
    [write],
  );

  /** Update the record if its ID exists, otherwise add it. */
  const saveRecord = useCallback(
    (collection, record) => {
      assertCollection(collection);
      assertPlainObject(record, 'A record must be an object.');

      const exists =
        record.id != null &&
        stateRef.current[collection].some(
          (item) => String(item.id) === String(record.id),
        );

      return exists
        ? updateRecord(collection, record.id, record)
        : addRecord(collection, record);
    },
    [addRecord, updateRecord],
  );

  /* ---------- Named operations used by the UI ---------- */

  const addTransaction = useCallback((tx) => addRecord('transactions', tx), [addRecord]);
  const updateTransaction = useCallback((id, changes) => updateRecord('transactions', id, changes), [updateRecord]);
  const deleteTransaction = useCallback((id) => deleteRecord('transactions', id), [deleteRecord]);
  const saveTransaction = useCallback((tx) => saveRecord('transactions', tx), [saveRecord]);

  const addBudget = useCallback((budget) => addRecord('budgets', budget), [addRecord]);
  const updateBudget = useCallback((id, changes) => updateRecord('budgets', id, changes), [updateRecord]);
  const deleteBudget = useCallback((id) => deleteRecord('budgets', id), [deleteRecord]);
  const saveBudget = useCallback((budget) => saveRecord('budgets', budget), [saveRecord]);

  const addDebt = useCallback((debt) => addRecord('debts', debt), [addRecord]);
  const updateDebt = useCallback((id, changes) => updateRecord('debts', id, changes), [updateRecord]);
  const deleteDebt = useCallback((id) => deleteRecord('debts', id), [deleteRecord]);
  const saveDebt = useCallback((debt) => saveRecord('debts', debt), [saveRecord]);

  const saveSettings = useCallback(
    (changes) => {
      assertPlainObject(changes, 'Settings must be an object.');

      const next = { ...createDefaultSettings(), ...stateRef.current.settings, ...changes };

      try {
        saveData('settings', next);
      } catch (error) {
        commit({ error: error.message });
        throw error;
      }

      commit({ settings: next, error: '' });
      return next;
    },
    [commit],
  );

  /** Erase every record and restore default settings. */
  const resetData = useCallback(() => {
    try {
      clearAllData();
    } catch (error) {
      commit({ error: error.message });
      throw error;
    }

    commit({
      ...createEmptyFinancialData(),
      settings: createDefaultSettings(),
      error: '',
    });

    return true;
  }, [commit]);

  /** Replace all data with the contents of a parsed backup file. */
  const importData = useCallback(
    (backup) => {
      try {
        importBackup(backup);
      } catch (error) {
        commit({ error: error.message });
        throw error;
      }

      commit({ ...readAll(), error: '' });
      return true;
    },
    [commit],
  );

  /** Fill an empty workspace with sample records. */
  const loadSampleData = useCallback(() => {
    const { transactions, budgets, debts } = stateRef.current;

    if (transactions.length || budgets.length || debts.length) {
      throw new Error('Sample data can only be added to an empty workspace.');
    }

    const demo = createDemoData();

    write('transactions', demo.transactions);
    write('budgets', demo.budgets);
    write('debts', demo.debts);

    return true;
  }, [write]);

  return {
    transactions: state.transactions,
    budgets: state.budgets,
    debts: state.debts,
    settings: state.settings,
    loading: false,
    error: state.error,
    clearError,
    refresh,

    addTransaction,
    updateTransaction,
    deleteTransaction,
    saveTransaction,

    addBudget,
    updateBudget,
    deleteBudget,
    saveBudget,

    addDebt,
    updateDebt,
    deleteDebt,
    saveDebt,

    saveSettings,
    resetData,
    importData,
    loadSampleData,
  };
}
