import Decimal from 'decimal.js';

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('es-ES', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
});

const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
const monthYearFormatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
const monthShortFormatter = new Intl.DateTimeFormat('es-ES', { month: 'short' });

export function formatCurrency(value: Decimal): string {
  return currencyFormatter.format(value.toNumber());
}

/** `value` viene ya multiplicado por 100 (ej. 12.5 = 12.5%). */
export function formatPercentage(value: Decimal): string {
  return percentFormatter.format(value.dividedBy(100).toNumber());
}

export function formatQuantity(value: Decimal): string {
  return quantityFormatter.format(value.toNumber());
}

export function formatDate(value: Date): string {
  return dateFormatter.format(value);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Ej. "Septiembre 2026". `month` es 0-11. */
export function formatMonthYear(year: number, month: number): string {
  return capitalize(monthYearFormatter.format(new Date(year, month, 1)));
}

/** Ej. "sept". `month` es 0-11. */
export function formatMonthShort(year: number, month: number): string {
  return monthShortFormatter.format(new Date(year, month, 1)).replace('.', '');
}
