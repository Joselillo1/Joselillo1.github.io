import Decimal from 'decimal.js';
import { supabase } from './supabaseClient';
import { generateUUID } from './uuid';
import { IncomeCategory, IncomeEntry, IncomeInput } from '../models/IncomeEntry';

const TABLE = 'income';

/** Fila cruda tal como vive en Supabase: el monto como TEXT, igual que en transactions, para no perder precisión. */
interface IncomeRow {
  id: string;
  category: string;
  symbol: string | null;
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

function rowToIncome(row: IncomeRow): IncomeEntry {
  return {
    id: row.id,
    category: row.category as IncomeCategory,
    symbol: row.symbol ?? undefined,
    description: row.description,
    amount: new Decimal(row.amount),
    date: parseLocalDate(row.date),
    notes: row.notes ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

function inputToRow(input: IncomeInput) {
  return {
    category: input.category,
    symbol: input.symbol ?? null,
    description: input.description,
    amount: input.amount.toString(),
    date: toDateOnly(input.date),
    notes: input.notes ?? null,
  };
}

export const incomeRepository = {
  async getAll(): Promise<IncomeEntry[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as IncomeRow[]).map(rowToIncome);
  },

  async create(input: IncomeInput): Promise<IncomeEntry> {
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

  /** Actualiza los campos editables de un ingreso existente; id y createdAt nunca cambian. */
  async update(id: string, input: IncomeInput): Promise<void> {
    const { error } = await supabase.from(TABLE).update(inputToRow(input)).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  /** Usado solo por el restaurador de respaldos: preserva id y created_at, ignora los que ya existan (idempotente). */
  async bulkInsert(income: IncomeEntry[]): Promise<void> {
    if (income.length === 0) return;
    const rows = income.map((i) => ({
      id: i.id,
      ...inputToRow(i),
      created_at: i.createdAt.toISOString(),
    }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
  },

  /** Borra permanentemente todos los ingresos DEL USUARIO ACTUAL (RLS limita el alcance). Usado por el borrado seguro en Ajustes. */
  async deleteAll(): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  },
};
