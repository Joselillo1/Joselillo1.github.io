import { useMemo } from 'react';
import Decimal from 'decimal.js';
import { MonthlyRealizedPnL, computeMonthlyRealizedPnL } from '../services/portfolioCalculations';
import { useTransactionsStore } from './useTransactionsStore';
import { useExpensesStore } from './useExpensesStore';
import { useIncomeStore } from './useIncomeStore';

const ZERO = new Decimal(0);

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export interface MonthlyBalance extends MonthlyRealizedPnL {
  /** Ingresos (dividendos, intereses, etc.) recibidos ese mes. */
  income: Decimal;
  /** Neto del mes ÷ total comprado hasta el fin de ese mes × 100 (undefined si aún no había compras). */
  netPercentage?: Decimal;
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

    const months: MonthlyBalance[] = Array.from(keyMeta.entries()).map(([key, { year, month }]) => {
      const trading = tradingByKey.get(key);
      const gains = trading?.gains ?? ZERO;
      const losses = trading?.losses ?? ZERO;
      const realizedFees = trading?.fees ?? ZERO;
      const extraExpenses = extraExpensesByKey.get(key) ?? ZERO;
      const monthIncome = incomeByKey.get(key) ?? ZERO;
      const fees = realizedFees.plus(extraExpenses);
      const net = gains.plus(losses).minus(fees).plus(monthIncome);
      const monthEnd = new Date(year, month + 1, 1);
      const boughtSoFar = transactions
        .filter((t) => t.type === 'compra' && t.date < monthEnd)
        .reduce((sum, t) => sum.plus(t.quantity.times(t.pricePerShare)).plus(t.fees), ZERO);
      const netPercentage = boughtSoFar.greaterThan(0) ? net.dividedBy(boughtSoFar).times(100) : undefined;
      return { year, month, gains, losses, fees, income: monthIncome, net, netPercentage };
    });

    return months.sort((a, b) => a.year - b.year || a.month - b.month);
  }, [transactions, expenses, income]);

  return { months, loading: loadingTransactions || loadingExpenses || loadingIncome };
}
