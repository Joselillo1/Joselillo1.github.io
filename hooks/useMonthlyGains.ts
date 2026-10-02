import { useMemo } from 'react';
import Decimal from 'decimal.js';
import { MonthlyRealizedPnL, computeMonthlyRealizedPnL, computeRealizedPnLByTransaction } from '../services/portfolioCalculations';
import { INITIAL_CAPITAL } from '../services/investmentConfig';
import { useCapitalStore } from './useCapitalStore';
import { useTransactionsStore } from './useTransactionsStore';
import { useExpensesStore } from './useExpensesStore';
import { useIncomeStore } from './useIncomeStore';

const ZERO = new Decimal(0);

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Cuánto aportó una acción al resultado de un mes: ventas cerradas (netas de comisiones) + sus dividendos. */
export interface TickerContribution {
  symbol: string;
  trading: Decimal;
  income: Decimal;
  total: Decimal;
}

export interface MonthlyBalance extends MonthlyRealizedPnL {
  /** Ingresos (dividendos, intereses, etc.) recibidos ese mes. */
  income: Decimal;
  /** Neto del mes ÷ (capital inicial + aportes hasta ese mes + neto acumulado de los meses anteriores) × 100. */
  netPercentage?: Decimal;
  /** Ganancia bruta del mes ÷ la misma base que `netPercentage`. */
  gainsPercentage?: Decimal;
  /** Neto acumulado hasta el fin de este mes ÷ capital (inicial + aportes hasta ese mes) × 100. */
  cumulativePercentage: Decimal;
  /** Aporte de cada acción a este mes, de mayor a menor impacto. No incluye gastos extras ni ingresos sin ticker. */
  contributions: TickerContribution[];
}

/**
 * Balance mensual completo: el mismo universo de números que se suman/restan en
 * el Portafolio (Ganancias, Pérdidas, Ingresos, Comisiones + Gastos extras, Total
 * neto) pero repartido mes a mes en vez de como un solo acumulado — para que el
 * historial por mes de "Balance mensual" siempre coincida con el Portafolio.
 * `fees` ya viene sumando comisiones realizadas + gastos extra de ese mes.
 * Garantiza que el mes actual y el anterior siempre aparezcan (en cero si hace
 * falta) y también incluye cualquier otro mes que tenga ingresos o gastos extra
 * aunque no haya habido ventas cerradas ese mes.
 */
export function useMonthlyGains(): { months: MonthlyBalance[]; loading: boolean } {
  const { transactions, loading: loadingTransactions } = useTransactionsStore();
  const { expenses, loading: loadingExpenses } = useExpensesStore();
  const { income, loading: loadingIncome } = useIncomeStore();
  const { deposits } = useCapitalStore();

  const months = useMemo(() => {
    const tradingByKey = new Map<string, MonthlyRealizedPnL>();
    for (const m of computeMonthlyRealizedPnL(transactions)) {
      tradingByKey.set(monthKey(m.year, m.month), m);
    }

    const extraExpensesByKey = new Map<string, Decimal>();
    for (const e of expenses) {
      const key = monthKey(e.date.getFullYear(), e.date.getMonth());
      extraExpensesByKey.set(key, (extraExpensesByKey.get(key) ?? ZERO).plus(e.amount));
    }

    const incomeByKey = new Map<string, Decimal>();
    for (const i of income) {
      const key = monthKey(i.date.getFullYear(), i.date.getMonth());
      incomeByKey.set(key, (incomeByKey.get(key) ?? ZERO).plus(i.amount));
    }

    // Aporte por acción y mes: ventas cerradas netas (LIFO, historial completo del ticker) + dividendos con ticker.
    const contribByKey = new Map<string, Map<string, { trading: Decimal; income: Decimal }>>();
    const addContribution = (key: string, symbol: string, field: 'trading' | 'income', amount: Decimal) => {
      let bySymbol = contribByKey.get(key);
      if (!bySymbol) contribByKey.set(key, (bySymbol = new Map()));
      const current = bySymbol.get(symbol) ?? { trading: ZERO, income: ZERO };
      current[field] = current[field].plus(amount);
      bySymbol.set(symbol, current);
    };
    const txsByTicker = new Map<string, typeof transactions>();
    for (const t of transactions) {
      const list = txsByTicker.get(t.tickerSymbol);
      if (list) list.push(t);
      else txsByTicker.set(t.tickerSymbol, [t]);
    }
    for (const [symbol, txs] of txsByTicker) {
      const pnlByTx = computeRealizedPnLByTransaction(txs);
      for (const tx of txs) {
        const pnl = pnlByTx.get(tx.id);
        if (pnl) addContribution(monthKey(tx.date.getFullYear(), tx.date.getMonth()), symbol, 'trading', pnl);
      }
    }
    for (const i of income) {
      if (i.symbol) addContribution(monthKey(i.date.getFullYear(), i.date.getMonth()), i.symbol, 'income', i.amount);
    }

    const keyMeta = new Map<string, { year: number; month: number }>();
    const registerKey = (year: number, month: number) => {
      const key = monthKey(year, month);
      if (!keyMeta.has(key)) keyMeta.set(key, { year, month });
    };
    for (const m of tradingByKey.values()) registerKey(m.year, m.month);
    for (const e of expenses) registerKey(e.date.getFullYear(), e.date.getMonth());
    for (const i of income) registerKey(i.date.getFullYear(), i.date.getMonth());

    const now = new Date();
    for (let back = 1; back >= 0; back -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
      registerKey(d.getFullYear(), d.getMonth());
    }

    const ordered = Array.from(keyMeta.entries()).sort(([, a], [, b]) => a.year - b.year || a.month - b.month);
    let base = INITIAL_CAPITAL;
    let cumulativeNet = ZERO;
    const months: MonthlyBalance[] = ordered.map(([key, { year, month }]) => {
      const trading = tradingByKey.get(key);
      const gains = trading?.gains ?? ZERO;
      const losses = trading?.losses ?? ZERO;
      const realizedFees = trading?.fees ?? ZERO;
      const extraExpenses = extraExpensesByKey.get(key) ?? ZERO;
      const monthIncome = incomeByKey.get(key) ?? ZERO;
      const fees = realizedFees.plus(extraExpenses);
      const net = gains.plus(losses).minus(fees).plus(monthIncome);
      const monthEnd = new Date(year, month + 1, 1);
      const depositsSoFar = deposits.filter((d) => d.date < monthEnd).reduce((sum, d) => sum.plus(d.amount), ZERO);
      const monthBase = base.plus(depositsSoFar);
      const netPercentage = net.dividedBy(monthBase).times(100);
      const gainsPercentage = gains.dividedBy(monthBase).times(100);
      base = base.plus(net);
      cumulativeNet = cumulativeNet.plus(net);
      const cumulativePercentage = cumulativeNet.dividedBy(INITIAL_CAPITAL.plus(depositsSoFar)).times(100);
      const contributions: TickerContribution[] = Array.from((contribByKey.get(key) ?? new Map()).entries())
        .map(([symbol, c]) => ({ symbol, trading: c.trading, income: c.income, total: c.trading.plus(c.income) }))
        .filter((c) => !c.total.isZero())
        .sort((a, b) => b.total.abs().comparedTo(a.total.abs()));
      return { year, month, gains, losses, fees, income: monthIncome, net, netPercentage, gainsPercentage, cumulativePercentage, contributions };
    });

    return months.sort((a, b) => a.year - b.year || a.month - b.month);
  }, [transactions, expenses, income, deposits]);

  return { months, loading: loadingTransactions || loadingExpenses || loadingIncome };
}
