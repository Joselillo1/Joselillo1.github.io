import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { ExpenseEntry, ExpenseInput } from '../models/ExpenseEntry';
import { expenseRepository } from '../services/expenseRepository';
import { validateExpense } from '../services/expenseValidation';
import { ValidationResult } from '../services/transactionValidation';

interface ExpensesStore {
  expenses: ExpenseEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
  addExpense: (input: ExpenseInput) => Promise<ValidationResult>;
  updateExpense: (id: string, input: ExpenseInput) => Promise<ValidationResult>;
  deleteExpense: (id: string) => Promise<void>;
}

const ExpensesContext = createContext<ExpensesStore | undefined>(undefined);

/**
 * Única fuente de verdad de los gastos extra en memoria (cuota del banco, del
 * broker, plataformas de noticias/datos, etc.) — mismo patrón que TransactionsStore,
 * como Context para que todas las pantallas lean/escriban por el mismo lado.
 */
export function ExpensesProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const all = await expenseRepository.getAll();
      setExpenses(all);
    } catch (error) {
      // La tabla `expenses` es nueva: si todavía no corriste la migración en
      // Supabase (supabase/add_expenses_table.sql), no rompemos el resto de la
      // app — la sección de Gastos extra queda vacía hasta que la corras.
      console.warn('No se pudieron cargar los gastos extra (¿falta correr la migración de Supabase?):', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addExpense = useCallback(async (input: ExpenseInput): Promise<ValidationResult> => {
    const result = validateExpense(input);
    if (!result.valid) return result;
    await expenseRepository.create(input);
    await refresh();
    return result;
  }, [refresh]);

  const updateExpense = useCallback(
    async (id: string, input: ExpenseInput): Promise<ValidationResult> => {
      const result = validateExpense(input);
      if (!result.valid) return result;
      await expenseRepository.update(id, input);
      await refresh();
      return result;
    },
    [refresh]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      await expenseRepository.delete(id);
      await refresh();
    },
    [refresh]
  );

  return (
    <ExpensesContext.Provider value={{ expenses, loading, refresh, addExpense, updateExpense, deleteExpense }}>
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpensesStore(): ExpensesStore {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpensesStore debe usarse dentro de <ExpensesProvider>');
  return ctx;
}
