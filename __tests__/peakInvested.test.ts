import Decimal from 'decimal.js';
import { computePeakInvested } from '../services/portfolioCalculations';
import { Transaction } from '../models/Transaction';

let n = 0;
const tx = (type: 'compra' | 'venta', qty: number, price: number, date: string): Transaction => ({
  id: `t${n++}`,
  tickerSymbol: 'AAA',
  type,
  quantity: new Decimal(qty),
  pricePerShare: new Decimal(price),
  fees: new Decimal(0),
  date: new Date(date),
  createdAt: new Date(date),
});

describe('computePeakInvested', () => {
  const txs = [
    tx('compra', 10, 100, '2026-08-04T12:00:00'), // 1000 invertidos
    tx('venta', 10, 110, '2026-08-10T12:00:00'), // 0
    tx('compra', 10, 111, '2026-08-11T12:00:00'), // 1110 (reinvierte ganancia)
  ];

  it('toma el máximo invertido a la vez, no la suma de compras', () => {
    expect(computePeakInvested(txs).toString()).toBe('1110');
  });

  it('por mes: sin operaciones nuevas la base es lo que quedó invertido', () => {
    const base = computePeakInvested(txs, new Date('2026-11-01T00:00:00'), new Date('2026-10-01T00:00:00'));
    expect(base.toString()).toBe('1110');
  });
});
