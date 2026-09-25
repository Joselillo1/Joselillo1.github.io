import Decimal from 'decimal.js';
import { StockCatalogItem } from './StockCatalogItem';

/**
 * Resumen calculado de una posición para un ticker. Nunca se persiste:
 * se recalcula siempre a partir del historial de Transaction correspondiente.
 */
export interface PositionSummary {
  stock: StockCatalogItem;
  quantityHeld: Decimal;
  averageCostBasis: Decimal;
  /** Costo de la posición ABIERTA ahora mismo (suma del costo de los lotes de compra sin vender, LIFO). Es 0 si ya vendiste todo. */
  currentInvestment: Decimal;
  /** Capital histórico total puesto en compras (nunca baja). Solo se usa como base de returnPercentage. */
  totalBuysCost: Decimal;
  /** Ganancia neta de las ventas cerradas (ya con comisiones descontadas). */
  realizedPnL: Decimal;
  /** Ganancia de las ventas cerradas ANTES de comisiones (subtotal). grossRealizedPnL − realizedFees === realizedPnL. */
  grossRealizedPnL: Decimal;
  /** Suma de las ventas cerradas con ganancia (>= 0), antes de comisiones. */
  grossRealizedGains: Decimal;
  /** Suma de las ventas cerradas con pérdida (<= 0), antes de comisiones. grossRealizedGains + grossRealizedLosses === grossRealizedPnL. */
  grossRealizedLosses: Decimal;
  /** Comisiones atribuibles a las ventas cerradas (comisión de venta + comisión de compra prorrateada a las acciones vendidas). */
  realizedFees: Decimal;
  /** Comisiones totales pagadas en compras y ventas de este ticker (abiertas y cerradas). Ya están descontadas de realizedPnL / unrealizedPnL; se expone para mostrarlo. */
  totalFees: Decimal;
  /** undefined hasta que se conecte un proveedor de precios en tiempo real. */
  currentMarketPrice?: Decimal;
  /** undefined si no hay currentMarketPrice. */
  unrealizedPnL?: Decimal;
  /** Rentabilidad %, undefined si no hay currentMarketPrice y no hay ventas realizadas. */
  returnPercentage?: Decimal;
}

/** Resumen agregado de todo el portafolio, para el Dashboard. */
export interface PortfolioSummary {
  totalInvested: Decimal;
  /** Ganancia neta realizada de todo el portafolio (subtotal − comisiones). */
  totalRealizedPnL: Decimal;
  /** Ganancia realizada de todo el portafolio ANTES de comisiones (subtotal). */
  totalGrossRealizedPnL: Decimal;
  /** Suma de todas las ventas cerradas con ganancia de todo el portafolio (>= 0), antes de comisiones. */
  totalGrossRealizedGains: Decimal;
  /** Suma de todas las ventas cerradas con pérdida de todo el portafolio (<= 0), antes de comisiones. */
  totalGrossRealizedLosses: Decimal;
  /** Comisiones atribuibles a las ventas cerradas de todo el portafolio. */
  totalRealizedFees: Decimal;
  totalUnrealizedPnL?: Decimal;
  totalReturnPercentage?: Decimal;
  /** Total invertido en compras (base para calcular el % de rentabilidad neta). */
  totalBuysCost: Decimal;
  /** Comisiones totales pagadas en todo el portafolio (abiertas y cerradas; ya descontadas de las ganancias). */
  totalFees: Decimal;
  positions: PositionSummary[];
}
