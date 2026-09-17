import Decimal from 'decimal.js';
import { Transaction, TransactionInput } from '../models/Transaction';
import { computeQuantityHeld } from './portfolioCalculations';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isPositive(value: Decimal): boolean {
  return value.greaterThan(0);
}

function startOfToday(): Date {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
}

/**
 * Valida los datos de una transacción antes de guardarla.
 * `existingTransactions` debe ser el historial actual de ese ticker SIN incluir la
 * transacción que se está editando (si aplica), para poder recalcular la posición
 * disponible correctamente.
 */
export function validateTransaction(
  input: TransactionInput,
  existingTransactions: Transaction[]
): ValidationResult {
  const errors: string[] = [];

  if (!isPositive(input.quantity)) {
    errors.push('La cantidad debe ser mayor a cero.');
  }
  if (!isPositive(input.pricePerShare)) {
    errors.push('El precio unitario debe ser mayor a cero.');
  }
  if (input.fees.isNegative()) {
    errors.push('La comisión no puede ser negativa.');
  }
  if (input.date.getTime() > startOfToday().getTime()) {
    errors.push('La fecha de la transacción no puede ser futura.');
  }

  if (input.type === 'venta' && isPositive(input.quantity)) {
    const quantityHeld = computeQuantityHeld(existingTransactions);
    if (input.quantity.greaterThan(quantityHeld)) {
      errors.push(
        `No puedes vender ${input.quantity.toString()} unidades: solo tienes ${quantityHeld.toString()} en posición.`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
