import Decimal from 'decimal.js';

export type TransactionType = 'compra' | 'venta';

/** Un registro individual e inmutable de compra o venta. Nunca se sobrescribe: editar crea una actualización del mismo id, eliminar lo borra por completo. */
export interface Transaction {
  id: string;
  tickerSymbol: string;
  type: TransactionType;
  quantity: Decimal;
  pricePerShare: Decimal;
  fees: Decimal;
  date: Date;
  notes?: string;
  createdAt: Date;
}

/** Datos que el usuario captura en el formulario, antes de asignarle id/createdAt. */
export type TransactionInput = Omit<Transaction, 'id' | 'createdAt'>;
