import Decimal from 'decimal.js';
import { database } from './database';
import { Transaction } from '../models/Transaction';

/**
 * Lee la base de datos SQLite local vieja (de antes de la sincronización en la nube).
 * Se usa SOLO una vez, desde el botón "Migrar mis datos a la nube" en Ajustes — el
 * resto de la app ya no lee ni escribe en SQLite, todo pasa por Supabase
 * (ver transactionRepository.ts).
 */
interface LegacyRow {
  id: string;
  ticker_symbol: string;
  type: string;
  quantity: string;
  price_per_share: string;
  fees: string;
  date: string;
  notes: string | null;
  created_at: string;
}

export const legacyLocalRepository = {
  async getAll(): Promise<Transaction[]> {
    const db = await database.open();
    const rows = await db.getAllAsync<LegacyRow>('SELECT * FROM transactions ORDER BY date ASC, created_at ASC');
    return rows.map((row) => ({
      id: row.id,
      tickerSymbol: row.ticker_symbol,
      type: row.type as Transaction['type'],
      quantity: new Decimal(row.quantity),
      pricePerShare: new Decimal(row.price_per_share),
      fees: new Decimal(row.fees),
      date: new Date(row.date),
      notes: row.notes ?? undefined,
      createdAt: new Date(row.created_at),
    }));
  },
};
