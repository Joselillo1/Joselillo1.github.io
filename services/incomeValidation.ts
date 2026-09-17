import { IncomeInput } from '../models/IncomeEntry';
import { ValidationResult } from './transactionValidation';

function endOfToday(): Date {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
}

/** Valida un ingreso (dividendo, interés, etc.) antes de guardarlo. */
export function validateIncome(input: IncomeInput): ValidationResult {
  const errors: string[] = [];

  if (!input.amount.greaterThan(0)) {
    errors.push('El monto debe ser mayor a cero.');
  }
  if (input.category === 'otro' && !input.description.trim()) {
    errors.push('Describe de qué es el ingreso cuando eliges "Otro".');
  }
  if (input.date.getTime() > endOfToday().getTime()) {
    errors.push('La fecha del ingreso no puede ser futura.');
  }

  return { valid: errors.length === 0, errors };
}
