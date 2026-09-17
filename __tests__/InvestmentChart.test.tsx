import React from 'react';
import { render } from '@testing-library/react-native';
import Decimal from 'decimal.js';
import { InvestmentChart } from '../components/StockDetail/InvestmentChart';
import { Transaction } from '../models/Transaction';

function tx(partial: Partial<Transaction>, id: string): Transaction {
  return {
    id,
    tickerSymbol: 'AAPL',
    type: 'compra',
    quantity: new Decimal(0),
    pricePerShare: new Decimal(0),
    fees: new Decimal(0),
    date: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    ...partial,
  };
}

describe('InvestmentChart', () => {
  it('no crashea al renderizar el gráfico real con varias transacciones', () => {
    const history = [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100), date: new Date('2026-01-01') }, '1'),
      tx({ type: 'compra', quantity: new Decimal(5), pricePerShare: new Decimal(120), date: new Date('2026-02-01') }, '2'),
      tx({ type: 'venta', quantity: new Decimal(3), pricePerShare: new Decimal(150), date: new Date('2026-03-01') }, '3'),
    ];
    expect(() => render(<InvestmentChart history={history} />)).not.toThrow();
  });

  it('no crashea cuando hay menos de dos transacciones (muestra el placeholder)', () => {
    const history = [tx({ quantity: new Decimal(1), pricePerShare: new Decimal(100) }, '1')];
    expect(() => render(<InvestmentChart history={history} />)).not.toThrow();
  });
});
