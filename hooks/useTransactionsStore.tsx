import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { Transaction, TransactionInput } from '../models/Transaction';
import { transactionRepository } from '../services/transactionRepository';
import { validateTransaction, ValidationResult } from '../services/transactionValidation';

interface TransactionsStore {
  transactions: Transaction[];
  loading: boolean;
  refresh: () => Promise<void>;
  addTransaction: (input: TransactionInput) => Promise<ValidationResult>;
  updateTransaction: (id: string, input: TransactionInput) => Promise<ValidationResult>;
  deleteTransaction: (id: string) => Promise<void>;
}

const TransactionsContext = createContext<TransactionsStore | undefined>(undefined);

/**
 * Única fuente de verdad de las transacciones en memoria. Centralizarlo en un
 * Context evita que cada pantalla tenga su propia copia desincronizada tras
 * crear/editar/borrar — todas leen y escriben a través de este mismo store.
 */
export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await transactionRepository.getAll();
    setTransactions(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTransaction = useCallback(
    async (input: TransactionInput): Promise<ValidationResult> => {
      const existing = transactions.filter((t) => t.tickerSymbol === input.tickerSymbol);
      const result = validateTransaction(input, existing);
      if (!result.valid) return result;
      await transactionRepository.create(input);
      await refresh();
      return result;
    },
    [transactions, refresh]
  );

  const updateTransaction = useCallback(
    async (id: string, input: TransactionInput): Promise<ValidationResult> => {
      const existing = transactions.filter((t) => t.tickerSymbol === input.tickerSymbol && t.id !== id);
      const result = validateTransaction(input, existing);
      if (!result.valid) return result;
      await transactionRepository.update(id, input);
      await refresh();
      return result;
    },
    [transactions, refresh]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      await transactionRepository.delete(id);
      await refresh();
    },
    [refresh]
  );

  return (
    <TransactionsContext.Provider
      value={{ transactions, loading, refresh, addTransaction, updateTransaction, deleteTransaction }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactionsStore(): TransactionsStore {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactionsStore debe usarse dentro de <TransactionsProvider>');
  return ctx;
}
