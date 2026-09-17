import { ExpenseInput } from '../models/ExpenseEntry';
import { ValidationResult } from './transactionValidation';

function startOfToday(): Date {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
}

/** Valida un gasto extra antes de guardarlo. */
export function validateExpense(input: ExpenseInput): ValidationResult {
  const errors: string[] = [];

  if (!input.amount.greaterThan(0)) {
    errors.push('El monto debe ser mayor a cero.');
  }
  if (input.category === 'otro' && !input.description.trim()) {
    errors.push('Describe de qué es el gasto cuando eliges "Otro".');
  }
  if (input.date.getTime() > startOfToday().getTime()) {
    errors.push('La fecha del gasto no puede ser futura.');
  }

  return { valid: errors.length === 0, errors };
}
