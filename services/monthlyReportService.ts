import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import Decimal from 'decimal.js';
import { Transaction } from '../models/Transaction';
import { StockCatalogItem } from '../models/StockCatalogItem';
import { stockCatalogService } from './stockCatalogService';
import { computeRealizedPnLByTransaction } from './portfolioCalculations';
import { formatCurrency, formatDate, formatQuantity } from './format';

export interface MonthOption {
  year: number;
  /** 0-based (enero = 0), igual que Date.getMonth(). */
  month: number;
  label: string;
}

export interface MonthlyReportRow {
  transaction: Transaction;
  stock: StockCatalogItem;
  total: Decimal;
  /** Solo presente en ventas. */
  realizedPnL?: Decimal;
}

interface TickerGroup {
  symbol: string;
  stock: StockCatalogItem;
  rows: MonthlyReportRow[];
  totalCompras: Decimal;
  totalVentas: Decimal;
  totalRealizedPnL: Decimal;
}

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function sumTotals(rows: MonthlyReportRow[]) {
  const zero = new Decimal(0);
  const totalCompras = rows
    .filter((r) => r.transaction.type === 'compra')
    .reduce((sum, r) => sum.plus(r.total), zero);
  const totalVentas = rows
    .filter((r) => r.transaction.type === 'venta')
    .reduce((sum, r) => sum.plus(r.total), zero);
  const totalRealizedPnL = rows.reduce((sum, r) => (r.realizedPnL ? sum.plus(r.realizedPnL) : sum), zero);
  return { totalCompras, totalVentas, totalRealizedPnL };
}

/** Agrupa las filas del mes por ticker, cada grupo ordenado cronológicamente, grupos ordenados alfabéticamente. */
function groupByTicker(rows: MonthlyReportRow[]): TickerGroup[] {
  const bySymbol = new Map<string, MonthlyReportRow[]>();
  for (const row of rows) {
    const list = bySymbol.get(row.transaction.tickerSymbol);
    if (list) list.push(row);
    else bySymbol.set(row.transaction.tickerSymbol, [row]);
  }

  return Array.from(bySymbol.entries())
    .map(([symbol, groupRows]) => ({
      symbol,
      stock: groupRows[0].stock,
      rows: groupRows,
      ...sumTotals(groupRows),
    }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}

/** Nombre de hoja de Excel válido: máx 31 caracteres, sin : \ / ? * [ ] */
function sheetName(symbol: string): string {
  return symbol.replace(/[:\\/?*[\]]/g, '-').slice(0, 31);
}

export const monthlyReportService = {
  /** Lista los meses que realmente tienen transacciones, más recientes primero. */
  getAvailableMonths(transactions: Transaction[]): MonthOption[] {
    const seen = new Map<string, MonthOption>();
    for (const t of transactions) {
      const year = t.date.getFullYear();
      const month = t.date.getMonth();
      const key = `${year}-${month}`;
      if (!seen.has(key)) {
        seen.set(key, { year, month, label: `${capitalize(MONTH_NAMES[month])} ${year}` });
      }
    }
    return Array.from(seen.values()).sort((a, b) => b.year - a.year || b.month - a.month);
  },

  /**
   * Arma las filas del reporte para un mes: para calcular bien la ganancia realizada
   * de cada venta necesita el historial COMPLETO de cada ticker (no solo del mes), así
   * que agrupa por ticker primero y recién después filtra al mes pedido.
   */
  buildReportRows(allTransactions: Transaction[], year: number, month: number): MonthlyReportRow[] {
    const byTicker = new Map<string, Transaction[]>();
    for (const t of allTransactions) {
      const list = byTicker.get(t.tickerSymbol);
      if (list) list.push(t);
      else byTicker.set(t.tickerSymbol, [t]);
    }

    const rows: MonthlyReportRow[] = [];
    for (const [symbol, txs] of byTicker) {
      const realizedPnLByTx = computeRealizedPnLByTransaction(txs);
      const stock = stockCatalogService.getBySymbol(symbol);
      for (const t of txs) {
        if (t.date.getFullYear() === year && t.date.getMonth() === month) {
          rows.push({
            transaction: t,
            stock,
            total: t.quantity.times(t.pricePerShare),
            realizedPnL: t.type === 'venta' ? realizedPnLByTx.get(t.id) : undefined,
          });
        }
      }
    }

    return rows.sort((a, b) => a.transaction.date.getTime() - b.transaction.date.getTime());
  },

  /**
   * Genera un Excel con una hoja "Resumen" (una fila por acción) y luego UNA HOJA POR
   * ACCIÓN con sus propias compras/ventas — así nunca queda todo mezclado en una sola tabla.
   */
  async exportToExcel(rows: MonthlyReportRow[], year: number, month: number): Promise<string> {
    const groups = groupByTicker(rows);
    const workbook = XLSX.utils.book_new();

    const summaryData = groups.map((g) => ({
      Ticker: g.symbol,
      Nombre: g.stock.name,
      'Total comprado': g.totalCompras.toNumber(),
      'Total vendido': g.totalVentas.toNumber(),
      'Ganancia realizada': g.totalRealizedPnL.toNumber(),
      Operaciones: g.rows.length,
    }));
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    const usedNames = new Set<string>(['Resumen']);
    for (const group of groups) {
      const data = group.rows.map((r) => ({
        Fecha: r.transaction.date.toISOString().slice(0, 10),
        Tipo: r.transaction.type === 'compra' ? 'Compra' : 'Venta',
        Cantidad: r.transaction.quantity.toNumber(),
        'Precio unitario': r.transaction.pricePerShare.toNumber(),
        Comisión: r.transaction.fees.toNumber(),
        Total: r.total.toNumber(),
        'Ganancia realizada': r.realizedPnL ? r.realizedPnL.toNumber() : '',
        Notas: r.transaction.notes ?? '',
      }));

      const sheet = XLSX.utils.aoa_to_sheet([[`${group.symbol} — ${group.stock.name}`]]);
      XLSX.utils.sheet_add_json(sheet, data, { origin: 'A3' });
      XLSX.utils.sheet_add_aoa(
        sheet,
        [
          [],
          ['Total comprado', group.totalCompras.toNumber()],
          ['Total vendido', group.totalVentas.toNumber()],
          ['Ganancia realizada', group.totalRealizedPnL.toNumber()],
        ],
        { origin: -1 }
      );
      sheet['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 24 }];

      let name = sheetName(group.symbol);
      let suffix = 2;
      while (usedNames.has(name)) {
        name = sheetName(`${group.symbol}-${suffix}`);
        suffix += 1;
      }
      usedNames.add(name);

      XLSX.utils.book_append_sheet(workbook, sheet, name);
    }

    const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' }) as string;

    const fileName = `reporte-${year}-${String(month + 1).padStart(2, '0')}.xlsx`;
    const file = new File(Paths.document, fileName);
    if (file.exists) file.delete();
    file.create();
    file.write(base64, { encoding: 'base64' });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Guardar reporte Excel',
      });
    }
    return file.uri;
  },

  /** PDF con una tarjeta separada y espaciada por cada acción, cada una con su propia tabla. */
  async exportToPDF(rows: MonthlyReportRow[], year: number, month: number, label: string): Promise<string> {
    const groups = groupByTicker(rows);
    const grandTotals = sumTotals(rows);

    const sections = groups
      .map((g) => {
        const tableRows = g.rows
          .map(
            (r) => `
          <tr>
            <td>${formatDate(r.transaction.date)}</td>
            <td>${r.transaction.type === 'compra' ? 'Compra' : 'Venta'}</td>
            <td style="text-align:right">${formatQuantity(r.transaction.quantity)}</td>
            <td style="text-align:right">${formatCurrency(r.transaction.pricePerShare)}</td>
            <td style="text-align:right">${formatCurrency(r.total)}</td>
            <td style="text-align:right">${r.realizedPnL ? formatCurrency(r.realizedPnL) : '—'}</td>
          </tr>`
          )
          .join('');

        return `
        <section class="ticker-card">
          <div class="ticker-header">
            <span class="ticker-symbol">${g.symbol}</span>
            <span class="ticker-name">${g.stock.name}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th style="text-align:right">Cantidad</th>
                <th style="text-align:right">Precio</th>
                <th style="text-align:right">Total</th>
                <th style="text-align:right">Ganancia</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="ticker-footer">
            Comprado: <b>${formatCurrency(g.totalCompras)}</b> &nbsp;·&nbsp;
            Vendido: <b>${formatCurrency(g.totalVentas)}</b> &nbsp;·&nbsp;
            Ganancia realizada: <b>${formatCurrency(g.totalRealizedPnL)}</b>
          </div>
        </section>`;
      })
      .join('');

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, Helvetica, sans-serif; color: #0B1220; padding: 24px; }
            h1 { font-size: 21px; margin: 0 0 4px 0; }
            .grand-summary { font-size: 13px; color: #444; margin-bottom: 20px; }
            .ticker-card {
              border: 1px solid #E4E7EC;
              border-radius: 10px;
              padding: 14px 16px;
              margin-bottom: 18px;
              page-break-inside: avoid;
            }
            .ticker-header {
              display: flex;
              align-items: baseline;
              gap: 10px;
              margin-bottom: 10px;
              padding-bottom: 8px;
              border-bottom: 2px solid #0052FF;
            }
            .ticker-symbol { font-size: 16px; font-weight: 700; }
            .ticker-name { font-size: 12px; color: #666; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { text-align: left; padding: 5px 6px; background: #F5F7FA; border-bottom: 1px solid #E4E7EC; }
            td { padding: 5px 6px; border-bottom: 1px solid #F0F2F5; }
            .ticker-footer { margin-top: 10px; font-size: 12px; color: #333; }
          </style>
        </head>
        <body>
          <h1>Reporte de transacciones — ${label}</h1>
          <div class="grand-summary">
            Total comprado: <b>${formatCurrency(grandTotals.totalCompras)}</b> &nbsp;·&nbsp;
            Total vendido: <b>${formatCurrency(grandTotals.totalVentas)}</b> &nbsp;·&nbsp;
            Ganancia realizada del mes: <b>${formatCurrency(grandTotals.totalRealizedPnL)}</b>
          </div>
          ${sections}
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Guardar reporte PDF' });
    }
    return uri;
  },
};
