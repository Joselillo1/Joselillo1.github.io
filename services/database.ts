import * as SQLite from 'expo-sqlite';

const DB_NAME = 'inversiones.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Abre (o crea) la base de datos y aplica el esquema. quantity/price_per_share/fees
 * se guardan como TEXT (no REAL) porque SQLite no tiene tipo decimal nativo: usamos
 * el string serializado de un Decimal (decimal.js) para no perder precisión monetaria.
 */
function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY NOT NULL,
          ticker_symbol TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('compra', 'venta')),
          quantity TEXT NOT NULL,
          price_per_share TEXT NOT NULL,
          fees TEXT NOT NULL DEFAULT '0',
          date TEXT NOT NULL,
          notes TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_transactions_ticker ON transactions (ticker_symbol);
        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date);
      `);
      return db;
    });
  }
  return dbPromise;
}

export const database = { open: openDatabase };
