import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import Decimal from 'decimal.js';
import { Transaction } from '../models/Transaction';
import { ExpenseCategory, ExpenseEntry } from '../models/ExpenseEntry';
import { IncomeCategory, IncomeEntry } from '../models/IncomeEntry';
import { transactionRepository } from './transactionRepository';
import { expenseRepository } from './expenseRepository';
import { incomeRepository } from './incomeRepository';

async function writeAndShare(fileName: string, contents: string, mimeType: string): Promise<string> {
  const file = new File(Paths.document, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: 'Guardar respaldo' });
  }
  return file.uri;
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export const backupService = {
  /** Exporta transacciones + gastos extra + ingresos a un JSON completo (id, montos y fechas incluidos) y ofrece compartirlo/guardarlo. */
  async exportJSON(): Promise<string> {
    const [transactions, expenses, income] = await Promise.all([
      transactionRepository.getAll(),
      expenseRepository.getAll(),
      incomeRepository.getAll(),
    ]);
    const payload = {
      version: 3,
      exportedAt: new Date().toISOString(),
      transactions: transactions.map((t) => ({
        id: t.id,
        tickerSymbol: t.tickerSymbol,
        type: t.type,
        quantity: t.quantity.toString(),
        pricePerShare: t.pricePerShare.toString(),
        fees: t.fees.toString(),
        date: t.date.toISOString(),
        notes: t.notes ?? null,
        createdAt: t.createdAt.toISOString(),
      })),
      expenses: expenses.map((e) => ({
        id: e.id,
        category: e.category,
        description: e.description,
        amount: e.amount.toString(),
        date: e.date.toISOString(),
        notes: e.notes ?? null,
        createdAt: e.createdAt.toISOString(),
      })),
      income: income.map((i) => ({
        id: i.id,
        category: i.category,
        symbol: i.symbol ?? null,
        description: i.description,
        amount: i.amount.toString(),
        date: i.date.toISOString(),
        notes: i.notes ?? null,
        createdAt: i.createdAt.toISOString(),
      })),
    };
    return writeAndShare(
      `respaldo-inversiones-${Date.now()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
  },

  /** Exporta a CSV, útil para abrir en Excel/Sheets. */
  async exportCSV(): Promise<string> {
    const transactions = await transactionRepository.getAll();
    const header = ['id', 'ticker', 'tipo', 'cantidad', 'precio', 'comision', 'fecha', 'notas', 'creado'].join(',');
    const rows = transactions.map((t) =>
      [
        t.id,
        t.tickerSymbol,
        t.type,
        t.quantity.toString(),
        t.pricePerShare.toString(),
        t.fees.toString(),
        t.date.toISOString(),
        csvEscape(t.notes ?? ''),
        t.createdAt.toISOString(),
      ].join(',')
    );
    return writeAndShare(`respaldo-inversiones-${Date.now()}.csv`, [header, ...rows].join('\n'), 'text/csv');
  },

  /** Abre el selector de archivos, lee un respaldo JSON y restaura transacciones + gastos extra (ignora lo que ya exista por id). */
  async importJSON(): Promise<number> {
    const pick = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
    if (pick.canceled || !pick.assets?.[0]) return 0;

    const file = new File(pick.assets[0].uri);
    const content = await file.text();
    const payload = JSON.parse(content);
    if (!payload || !Array.isArray(payload.transactions)) {
      throw new Error('El archivo de respaldo no tiene el formato esperado.');
    }

    const transactions: Transaction[] = payload.transactions.map((raw: Record<string, unknown>) => ({
      id: String(raw.id),
      tickerSymbol: String(raw.tickerSymbol),
      type: raw.type === 'venta' ? 'venta' : 'compra',
      quantity: new Decimal(String(raw.quantity)),
      pricePerShare: new Decimal(String(raw.pricePerShare)),
      fees: new Decimal(String(raw.fees ?? 0)),
      date: new Date(String(raw.date)),
      notes: raw.notes ? String(raw.notes) : undefined,
      createdAt: new Date(String(raw.createdAt ?? raw.date)),
    }));
    await transactionRepository.bulkInsert(transactions);

    // Respaldos viejos (version 1) no tienen `expenses` — se omite sin romper la importación.
    const rawExpenses = Array.isArray(payload.expenses) ? payload.expenses : [];
    const expenses: ExpenseEntry[] = rawExpenses.map((raw: Record<string, unknown>) => ({
      id: String(raw.id),
      category: (['banco', 'broker', 'noticias', 'otro'] as ExpenseCategory[]).includes(raw.category as ExpenseCategory)
        ? (raw.category as ExpenseCategory)
        : 'otro',
      description: String(raw.description ?? ''),
      amount: new Decimal(String(raw.amount)),
      date: new Date(String(raw.date)),
      notes: raw.notes ? String(raw.notes) : undefined,
      createdAt: new Date(String(raw.createdAt ?? raw.date)),
    }));
    if (expenses.length > 0) await expenseRepository.bulkInsert(expenses);

    // Respaldos viejos (version 1 y 2) no tienen `income` — se omite sin romper la importación.
    const rawIncome = Array.isArray(payload.income) ? payload.income : [];
    const income: IncomeEntry[] = rawIncome.map((raw: Record<string, unknown>) => ({
      id: String(raw.id),
      category: (['dividendo', 'interes', 'otro'] as IncomeCategory[]).includes(raw.category as IncomeCategory)
        ? (raw.category as IncomeCategory)
        : 'otro',
      symbol: raw.symbol ? String(raw.symbol) : undefined,
      description: String(raw.description ?? ''),
      amount: new Decimal(String(raw.amount)),
      date: new Date(String(raw.date)),
      notes: raw.notes ? String(raw.notes) : undefined,
      createdAt: new Date(String(raw.createdAt ?? raw.date)),
    }));
    if (income.length > 0) await incomeRepository.bulkInsert(income);

    return transactions.length + expenses.length + income.length;
  },

  /** Borrado seguro: elimina permanentemente todas las transacciones, gastos extra E ingresos guardados en el dispositivo. */
  async wipeAllData(): Promise<void> {
    await Promise.all([transactionRepository.deleteAll(), expenseRepository.deleteAll(), incomeRepository.deleteAll()]);
  },
};
