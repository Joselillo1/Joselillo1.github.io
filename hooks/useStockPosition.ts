import { useMemo } from 'react';
import { PositionSummary } from '../models/PositionSummary';
import { stockCatalogService } from '../services/stockCatalogService';
import { computePositionSummary } from '../services/portfolioCalculations';
import { useTransactionsStore } from './useTransactionsStore';
import { Transaction } from '../models/Transaction';

/** Posición e historial (ya ordenado cronológicamente) de un único ticker. */
export function useStockPosition(symbol: string): { position: PositionSummary; history: Transaction[] } {
  const { transactions } = useTransactionsStore();

  return useMemo(() => {
    const history = transactions
      .filter((t) => t.tickerSymbol === symbol)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const position = computePositionSummary(stockCatalogService.getBySymbol(symbol), history);
    return { position, history };
  }, [transactions, symbol]);
}
