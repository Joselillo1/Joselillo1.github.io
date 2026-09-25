import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import Decimal from 'decimal.js';
import { CapitalDeposit, CapitalDepositInput } from '../models/CapitalDeposit';
import { capitalRepository } from '../services/capitalRepository';
import { INITIAL_CAPITAL } from '../services/investmentConfig';

interface CapitalStore {
  deposits: CapitalDeposit[];
  /** Capital inicial + todos los aportes (− retiros): la base del % total. */
  totalCapital: Decimal;
  loading: boolean;
  loadError: string | null;
  refresh: () => Promise<void>;
  addDeposit: (input: CapitalDepositInput) => Promise<void>;
  deleteDeposit: (id: string) => Promise<void>;
}

const CapitalContext = createContext<CapitalStore | undefined>(undefined);

/** Aportes de capital: si la tabla no existe o falla la carga, la app sigue con el capital inicial solo. */
export function CapitalProvider({ children }: { children: ReactNode }) {
  const [deposits, setDeposits] = useState<CapitalDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setDeposits(await capitalRepository.getAll());
      setLoadError(null);
    } catch (error) {
      console.warn('No se pudieron cargar los aportes de capital:', error);
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addDeposit = useCallback(
    async (input: CapitalDepositInput) => {
      await capitalRepository.create(input);
      await refresh();
    },
    [refresh]
  );

  const deleteDeposit = useCallback(
    async (id: string) => {
      await capitalRepository.delete(id);
      await refresh();
    },
    [refresh]
  );

  const totalCapital = useMemo(
    () => deposits.reduce((sum, d) => sum.plus(d.amount), INITIAL_CAPITAL),
    [deposits]
  );

  return (
    <CapitalContext.Provider value={{ deposits, totalCapital, loading, loadError, refresh, addDeposit, deleteDeposit }}>
      {children}
    </CapitalContext.Provider>
  );
}

export function useCapitalStore(): CapitalStore {
  const ctx = useContext(CapitalContext);
  if (!ctx) throw new Error('useCapitalStore debe usarse dentro de <CapitalProvider>');
  return ctx;
}
