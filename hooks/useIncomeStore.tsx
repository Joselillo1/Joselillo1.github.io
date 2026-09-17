import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { IncomeEntry, IncomeInput } from '../models/IncomeEntry';
import { incomeRepository } from '../services/incomeRepository';
import { validateIncome } from '../services/incomeValidation';
import { ValidationResult } from '../services/transactionValidation';

interface IncomeStore {
  income: IncomeEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
  addIncome: (input: IncomeInput) => Promise<ValidationResult>;
  updateIncome: (id: string, input: IncomeInput) => Promise<ValidationResult>;
  deleteIncome: (id: string) => Promise<void>;
}

const IncomeContext = createContext<IncomeStore | undefined>(undefined);

/**
 * Única fuente de verdad de los ingresos en memoria (dividendos, intereses,
 * etc.) — mismo patrón que ExpensesStore, como Context para que todas las
 * pantallas lean/escriban por el mismo lado.
 */
export function IncomeProvider({ children }: { children: ReactNode }) {
  const [income, setIncome] = useState<IncomeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const all = await incomeRepository.getAll();
      setIncome(all);
    } catch (error) {
      // La tabla `income` es nueva: si todavía no corriste la migración en
      // Supabase (supabase/add_income_table.sql), no rompemos el resto de la
      // app — la sección de Ingresos queda vacía hasta que la corras.
      console.warn('No se pudieron cargar los ingresos (¿falta correr la migración de Supabase?):', error);
      setIncome([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addIncome = useCallback(async (input: IncomeInput): Promise<ValidationResult> => {
    const result = validateIncome(input);
    if (!result.valid) return result;
    await incomeRepository.create(input);
    await refresh();
    return result;
  }, [refresh]);

  const updateIncome = useCallback(
    async (id: string, input: IncomeInput): Promise<ValidationResult> => {
      const result = validateIncome(input);
      if (!result.valid) return result;
      await incomeRepository.update(id, input);
      await refresh();
      return result;
    },
    [refresh]
  );

  const deleteIncome = useCallback(
    async (id: string) => {
      await incomeRepository.delete(id);
      await refresh();
    },
    [refresh]
  );

  return (
    <IncomeContext.Provider value={{ income, loading, refresh, addIncome, updateIncome, deleteIncome }}>
      {children}
    </IncomeContext.Provider>
  );
}

export function useIncomeStore(): IncomeStore {
  const ctx = useContext(IncomeContext);
  if (!ctx) throw new Error('useIncomeStore debe usarse dentro de <IncomeProvider>');
  return ctx;
}
