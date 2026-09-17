import Decimal from 'decimal.js';
import { Transaction, TransactionInput } from '../models/Transaction';
import { validateTransaction } from '../services/transactionValidation';

let nextId = 0;
function tx(partial: Partial<Transaction>): Transaction {
  nextId += 1;
  return {
    id: `tx-${nextId}`,
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

function buyInput(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    tickerSymbol: 'AAPL',
    type: 'compra',
    quantity: new Decimal(10),
    pricePerShare: new Decimal(100),
    fees: new Decimal(0),
    date: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('validateTransaction', () => {
  it('acepta una compra válida', () => {
    const result = validateTransaction(buyInput(), []);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rechaza cantidad cero o negativa', () => {
    expect(validateTransaction(buyInput({ quantity: new Decimal(0) }), []).valid).toBe(false);
    expect(validateTransaction(buyInput({ quantity: new Decimal(-5) }), []).valid).toBe(false);
  });

  it('rechaza precio cero o negativo', () => {
    expect(validateTransaction(buyInput({ pricePerShare: new Decimal(0) }), []).valid).toBe(false);
    expect(validateTransaction(buyInput({ pricePerShare: new Decimal(-1) }), []).valid).toBe(false);
  });

  it('rechaza comisiones negativas', () => {
    const result = validateTransaction(buyInput({ fees: new Decimal(-1) }), []);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/comisión/i);
  });

  it('rechaza fechas futuras', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const result = validateTransaction(buyInput({ date: future }), []);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/futura/i);
  });

  it('permite vender hasta la cantidad exacta en posición', () => {
    const existing = [tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100) })];
    const sale: TransactionInput = {
      tickerSymbol: 'AAPL',
      type: 'venta',
      quantity: new Decimal(10),
      pricePerShare: new Decimal(120),
      fees: new Decimal(0),
      date: new Date('2026-02-01'),
    };
    expect(validateTransaction(sale, existing).valid).toBe(true);
  });

  it('rechaza vender más acciones de las que hay en posición', () => {
    const existing = [tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100) })];
    const sale: TransactionInput = {
      tickerSymbol: 'AAPL',
      type: 'venta',
      quantity: new Decimal(11),
      pricePerShare: new Decimal(120),
      fees: new Decimal(0),
      date: new Date('2026-02-01'),
    };
    const result = validateTransaction(sale, existing);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/solo tienes/i);
  });

  it('rechaza vender cuando no hay ninguna compra previa', () => {
    const sale: TransactionInput = {
      tickerSymbol: 'AAPL',
      type: 'venta',
      quantity: new Decimal(1),
      pricePerShare: new Decimal(120),
      fees: new Decimal(0),
      date: new Date('2026-02-01'),
    };
    expect(validateTransaction(sale, []).valid).toBe(false);
  });
});
