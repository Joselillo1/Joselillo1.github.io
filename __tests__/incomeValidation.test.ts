import Decimal from 'decimal.js';
import { IncomeInput } from '../models/IncomeEntry';
import { validateIncome } from '../services/incomeValidation';

function incomeInput(overrides: Partial<IncomeInput> = {}): IncomeInput {
  return {
    category: 'dividendo',
    description: 'Dividendo trimestral',
    amount: new Decimal(15),
    date: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('validateIncome', () => {
  it('acepta un ingreso válido', () => {
    const result = validateIncome(incomeInput());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rechaza monto cero o negativo', () => {
    expect(validateIncome(incomeInput({ amount: new Decimal(0) })).valid).toBe(false);
    expect(validateIncome(incomeInput({ amount: new Decimal(-5) })).valid).toBe(false);
  });

  it('rechaza fecha futura', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const result = validateIncome(incomeInput({ date: future }));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/futura/i);
  });

  it('exige descripción cuando la categoría es "otro"', () => {
    const result = validateIncome(incomeInput({ category: 'otro', description: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Otro/i);
  });

  it('no exige descripción para categorías predefinidas', () => {
    const result = validateIncome(incomeInput({ category: 'interes', description: '' }));
    expect(result.valid).toBe(true);
  });
});
