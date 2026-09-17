import Decimal from 'decimal.js';

/** Categorías de gastos extra (no ligados a una compra/venta puntual). */
export type ExpenseCategory = 'banco' | 'broker' | 'noticias' | 'otro';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  banco: 'Cuota de manejo bancario',
  broker: 'Cuota de manejo del broker',
  noticias: 'Plataforma de noticias/datos',
  otro: 'Otro',
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['banco', 'broker', 'noticias', 'otro'];

/**
 * Un gasto extra: costos de mantener la operación de inversión que NO son parte de
 * una compra/venta (cuota del banco, del broker, suscripción a una plataforma de
 * noticias/datos, etc.). Se lleva aparte de las Transaction — no afecta el costo
 * promedio ni la P&L de ninguna acción.
 */
export interface ExpenseEntry {
  id: string;
  category: ExpenseCategory;
  /** Detalle libre. Recomendado siempre; obligatorio cuando category = 'otro'. */
  description: string;
  amount: Decimal;
  date: Date;
  notes?: string;
  createdAt: Date;
}

export type ExpenseInput = Omit<ExpenseEntry, 'id' | 'createdAt'>;
