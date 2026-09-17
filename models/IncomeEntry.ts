import Decimal from 'decimal.js';

/** Categorías de ingresos (no ligados a una compra/venta puntual). */
export type IncomeCategory = 'dividendo' | 'interes' | 'otro';

export const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  dividendo: 'Dividendo',
  interes: 'Interés',
  otro: 'Otro',
};

export const INCOME_CATEGORIES: IncomeCategory[] = ['dividendo', 'interes', 'otro'];

/**
 * Un ingreso: dinero recibido que NO viene de vender una posición (dividendo,
 * interés de una cuenta, etc.). Se lleva aparte de las Transaction — no afecta
 * el costo promedio de ninguna acción, pero sí suma a la ganancia neta del
 * portafolio, igual que los gastos extra restan.
 */
export interface IncomeEntry {
  id: string;
  category: IncomeCategory;
  /** Ticker opcional al que está ligado el ingreso (ej. dividendo de AAPL). */
  symbol?: string;
  /** Detalle libre. Recomendado siempre; obligatorio cuando category = 'otro'. */
  description: string;
  amount: Decimal;
  date: Date;
  notes?: string;
  createdAt: Date;
}

export type IncomeInput = Omit<IncomeEntry, 'id' | 'createdAt'>;
