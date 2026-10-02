import Decimal from 'decimal.js';
import { supabase } from './supabaseClient';
import { generateUUID } from './uuid';
import { CapitalDeposit, CapitalDepositInput } from '../models/CapitalDeposit';

const TABLE = 'capital_deposits';

interface CapitalRow {
  id: string;
  amount: string;
  date: string; // 'YYYY-MM-DD'
  notes: string | null;
  created_at: string;
}

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

export const capitalRepository = {
  async getAll(): Promise<CapitalDeposit[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as CapitalRow[]).map((row) => ({
      id: row.id,
      amount: new Decimal(row.amount),
      date: parseLocalDate(row.date),
      notes: row.notes ?? undefined,
      createdAt: new Date(row.created_at),
    }));
  },

  async create(input: CapitalDepositInput): Promise<void> {
    const { error } = await supabase.from(TABLE).insert({
      id: generateUUID(),
      amount: input.amount.toString(),
      date: toDateOnly(input.date),
      notes: input.notes ?? null,
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  /** Usado solo por el restaurador de respaldos: preserva id y created_at, ignora los que ya existan (idempotente). */
  async bulkInsert(deposits: CapitalDeposit[]): Promise<void> {
    if (deposits.length === 0) return;
    const rows = deposits.map((d) => ({
      id: d.id,
      amount: d.amount.toString(),
      date: toDateOnly(d.date),
      notes: d.notes ?? null,
      created_at: d.createdAt.toISOString(),
    }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
  },

  /** Borra permanentemente todos los aportes DEL USUARIO ACTUAL (RLS limita el alcance). Usado por el borrado seguro en Ajustes. */
  async deleteAll(): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },
};
