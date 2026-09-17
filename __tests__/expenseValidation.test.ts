import Decimal from 'decimal.js';
import { ExpenseInput } from '../models/ExpenseEntry';
import { validateExpense } from '../services/expenseValidation';

function expenseInput(overrides: Partial<ExpenseInput> = {}): ExpenseInput {
  return {
    category: 'banco',
    description: 'Cuota mensual',
    amount: new Decimal(15),
    date: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('validateExpense', () => {
  it('acepta un gasto válido', () => {
    const result = validateExpense(expenseInput());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rechaza monto cero o negativo', () => {
    expect(validateExpense(expenseInput({ amount: new Decimal(0) })).valid).toBe(false);
    expect(validateExpense(expenseInput({ amount: new Decimal(-5) })).valid).toBe(false);
  });

  it('rechaza fecha futura', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const result = validateExpense(expenseInput({ date: future }));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/futura/i);
  });

  it('exige descripción cuando la categoría es "otro"', () => {
    const result = validateExpense(expenseInput({ category: 'otro', description: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Otro/i);
  });

  it('no exige descripción para categorías predefinidas', () => {
    const result = validateExpense(expenseInput({ category: 'broker', description: '' }));
    expect(result.valid).toBe(true);
  });
});
