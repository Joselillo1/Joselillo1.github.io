import { useMemo } from 'react';
import { DailyPnLPoint, computeRealizedPnLTimeline } from '../services/portfolioCalculations';
import { useTransactionsStore } from './useTransactionsStore';

export function useGainsTimeline(): { timeline: DailyPnLPoint[]; loading: boolean } {
  const { transactions, loading } = useTransactionsStore();
  const timeline = useMemo(() => computeRealizedPnLTimeline(transactions), [transactions]);
  return { timeline, loading };
}
