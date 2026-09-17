import Decimal from 'decimal.js';
import { supabase } from './supabaseClient';
import { generateUUID } from './uuid';
import { Transaction, TransactionInput } from '../models/Transaction';

const TABLE = 'transactions';

/** Fila cruda tal como vive en Supabase: los montos como TEXT (igual que antes en SQLite), para no perder precisión. */
interface TransactionRow {
  id: string;
  ticker_symbol: string;
  type: string;
  quantity: string;
  price_per_share: string;
  fees: string;
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

function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    tickerSymbol: row.ticker_symbol,
    type: row.type as Transaction['type'],
    quantity: new Decimal(row.quantity),
    pricePerShare: new Decimal(row.price_per_share),
    fees: new Decimal(row.fees),
    date: parseLocalDate(row.date),
    notes: row.notes ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

function inputToRow(input: TransactionInput) {
  return {
    ticker_symbol: input.tickerSymbol,
    type: input.type,
    quantity: input.quantity.toString(),
    price_per_share: input.pricePerShare.toString(),
    fees: input.fees.toString(),
    date: toDateOnly(input.date),
    notes: input.notes ?? null,
  };
}

export const transactionRepository = {
  async getAll(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as TransactionRow[]).map(rowToTransaction);
  },

  async getByTicker(tickerSymbol: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('ticker_symbol', tickerSymbol)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as TransactionRow[]).map(rowToTransaction);
  },

  async create(input: TransactionInput): Promise<Transaction> {
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

  /** Actualiza los campos editables de una transacción existente; id y createdAt nunca cambian. */
  async update(id: string, input: TransactionInput): Promise<void> {
    const { error } = await supabase.from(TABLE).update(inputToRow(input)).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },

  /** Usado solo por el restaurador de respaldos / migración: preserva id y created_at, ignora los que ya existan (idempotente). */
  async bulkInsert(transactions: Transaction[]): Promise<void> {
    if (transactions.length === 0) return;
    const rows = transactions.map((t) => ({
      id: t.id,
      ...inputToRow(t),
      created_at: t.createdAt.toISOString(),
    }));
    const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
  },

  /** Borra permanentemente todas las transacciones DEL USUARIO ACTUAL (RLS limita el alcance). Usado por el borrado seguro en Ajustes. */
  async deleteAll(): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  },
};
