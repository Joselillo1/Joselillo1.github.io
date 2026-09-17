import { useMemo } from 'react';
import { Transaction } from '../models/Transaction';
import { PortfolioSummary } from '../models/PositionSummary';
import { stockCatalogService } from '../services/stockCatalogService';
import { computePortfolioSummary, computePositionSummary } from '../services/portfolioCalculations';
import { useTransactionsStore } from './useTransactionsStore';

export function usePortfolio(): { portfolio: PortfolioSummary; loading: boolean } {
  const { transactions, loading } = useTransactionsStore();

  const portfolio = useMemo(() => {
    const byTicker = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const list = byTicker.get(t.tickerSymbol);
      if (list) list.push(t);
      else byTicker.set(t.tickerSymbol, [t]);
    }
    const positions = Array.from(byTicker.entries()).map(([symbol, txs]) =>
      computePositionSummary(stockCatalogService.getBySymbol(symbol), txs)
    );
    return computePortfolioSummary(positions);
  }, [transactions]);

  return { portfolio, loading };
}
