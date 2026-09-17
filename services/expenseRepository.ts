import Decimal from 'decimal.js';
import { supabase } from './supabaseClient';
import { generateUUID } from './uuid';
import { ExpenseCategory, ExpenseEntry, ExpenseInput } from '../models/ExpenseEntry';

const TABLE = 'expenses';

/** Fila cruda tal como vive en Supabase: el monto como TEXT, igual que en transactions, para no perder precisión. */
interface ExpenseRow {
  id: string;
  category: string;
  description: string;
  amount: string;
  date: string; // 'YYYY-MM-DD'
  notes: string | null;
  created_at: string;
}

/** Postgres devuelve `date` como 'YYYY-MM-DD'; lo parseamos como fecha LOCAL para no correrla un día por huso horario. */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rowToExpense(row: ExpenseRow): ExpenseEntry {
  return {
    id: row.id,
    category: row.category as ExpenseCategory,
    description: row.description,
    amount: new Decimal(row.amount),
    date: parseLocalDate(row.date),
    notes: row.notes ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

function inputToRow(input: ExpenseInput) {
  return {
    category: input.category,
    description: input.description,
    amount: input.amount.toString(),
    date: toDateOnly(input.date),
    notes: input.notes ?? null,
  };
}

export const expenseRepository = {
  async getAll(): Promise<ExpenseEntry[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as ExpenseRow[]).map(rowToExpense);
  },

  async create(input: ExpenseInput): Promise<ExpenseEntry> {
    const id = generateUUID();
    const createdAt = new Date();
    const { error } = await supabase.from(TABLE).insert({
      id,
      ...inputToRow(input),
      created_at: createdAt.toISOString(),
    });
    if (error) throw error;
    return { ...input, id, createdAt };
  },

  /** Actualiza los campos editables de un gasto existente; id y createdAt nunca cambian. */
  async update(id: string, input: ExpenseInput): Promise<void> {
    const { error } = await supabase.from(TABLE).update(inputToRow(input)).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  /** Usado solo por el restaurador de respaldos: preserva id y created_at, ignora los que ya existan (idempotente). */
  async bulkInsert(expenses: ExpenseEntry[]): Promise<void> {
    if (expenses.length === 0) return;
    const rows = expenses.map((e) => ({
      id: e.id,
      ...inputToRow(e),
      created_at: e.createdAt.toISOString(),
    }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
  },

  /** Borra permanentemente todos los gastos DEL USUARIO ACTUAL (RLS limita el alcance). Usado por el borrado seguro en Ajustes. */
  async deleteAll(): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  },
};
