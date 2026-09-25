import Decimal from 'decimal.js';

/**
 * Un aporte (o retiro) de capital hecho después del capital inicial. Positivo = metiste más
 * dinero; negativo = sacaste dinero. Solo sirve de base para los % de rentabilidad: no toca
 * ninguna transacción ni la ganancia.
 */
export interface CapitalDeposit {
  id: string;
  amount: Decimal;
  date: Date;
  notes?: string;
  createdAt: Date;
}

export type CapitalDepositInput = Omit<CapitalDeposit, 'id' | 'createdAt'>;
