import Decimal from 'decimal.js';
import { Transaction } from '../models/Transaction';
import { PortfolioSummary, PositionSummary } from '../models/PositionSummary';
import { StockCatalogItem } from '../models/StockCatalogItem';

const ZERO = new Decimal(0);

/** Un lote de compra que sigue abierto: acciones aún no vendidas y sus dos costos unitarios. */
interface Lot {
  quantity: Decimal;
  /** Precio + comisión de compra prorrateada — base de la P&L NETA. */
  costPerShare: Decimal;
  /** Solo el precio de compra, sin comisión — base de la P&L BRUTA (subtotal). */
  grossCostPerShare: Decimal;
}

/**
 * Recorre el historial cronológico de un ticker con contabilidad por lotes tipo
 * LIFO (last-in, first-out): cada venta se descuenta contra las compras MÁS
 * RECIENTES que sigan abiertas, no contra un promedio. Así, si compraste 10 a $10
 * y luego 1 a $0,50 y vendes 1 a $1, la ganancia es $0,50 (contra el lote de
 * $0,50) y te siguen quedando las 10 acciones de $10 intactas. Las comisiones de
 * compra encarecen el costo de su lote; las de venta se restan de lo recibido.
 *
 * `totalBuysCost` es el capital histórico total puesto en compras (nunca baja, ni
 * siquiera si vendes todo) — se usa solo como base del % de rentabilidad.
 * `currentInvestment` es el costo de los lotes que siguen ABIERTOS ahora mismo y
 * vuelve a 0 si cierras toda la posición; es lo que se muestra como "inversión
 * total". `averageCostBasis` se deriva de esos lotes abiertos (costo ÷ acciones)
 * solo como dato de referencia para mostrar.
 *
 * `totalFees` es la suma de TODAS las comisiones pagadas (compras y ventas, de
 * posiciones abiertas y cerradas). `grossRealizedPnL` es la ganancia de las ventas
 * cerradas ANTES de comisiones (subtotal) y `realizedFees` son las comisiones
 * atribuibles a esas ventas cerradas, de modo que
 * `grossRealizedPnL - realizedFees === realizedPnL` (subtotal − comisiones = neto).
 * `grossRealizedGains` y `grossRealizedLosses` desglosan ese mismo subtotal: cada
 * venta cerrada suma a una o a la otra según su signo (antes de comisiones), de
 * modo que `grossRealizedGains + grossRealizedLosses === grossRealizedPnL` — así
 * se puede mostrar cuánto se ganó y cuánto se perdió por separado, no solo el neto.
 */
function accumulate(transactions: Transaction[]) {
  /** Pila de lotes abiertos: se compra al final, se vende desde el final (LIFO). */
  const lots: Lot[] = [];
  let totalBuysCost = ZERO;
  let realizedPnL = ZERO;
  let grossRealizedPnL = ZERO;
  let grossRealizedGains = ZERO;
  let grossRealizedLosses = ZERO;
  let totalFees = ZERO;
  const realizedPnLByTransactionId = new Map<string, Decimal>();
  const grossRealizedPnLByTransactionId = new Map<string, Decimal>();

  const chronological = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const tx of chronological) {
    totalFees = totalFees.plus(tx.fees);
    if (tx.type === 'compra') {
      const costOfPurchase = tx.quantity.times(tx.pricePerShare).plus(tx.fees);
      totalBuysCost = totalBuysCost.plus(costOfPurchase);
      if (tx.quantity.greaterThan(0)) {
        lots.push({
          quantity: tx.quantity,
          costPerShare: costOfPurchase.dividedBy(tx.quantity),
          grossCostPerShare: tx.pricePerShare,
        });
      }
    } else {
      const proceeds = tx.quantity.times(tx.pricePerShare).minus(tx.fees);
      const grossProceeds = tx.quantity.times(tx.pricePerShare);
      let remaining = tx.quantity;
      let costOfSharesSold = ZERO;
      let grossCostOfSharesSold = ZERO;
      // Consumir lotes desde el más reciente (final del arreglo) hacia atrás.
      while (remaining.greaterThan(0) && lots.length > 0) {
        const lot = lots[lots.length - 1];
        const taken = Decimal.min(lot.quantity, remaining);
        costOfSharesSold = costOfSharesSold.plus(taken.times(lot.costPerShare));
        grossCostOfSharesSold = grossCostOfSharesSold.plus(taken.times(lot.grossCostPerShare));
        lot.quantity = lot.quantity.minus(taken);
        remaining = remaining.minus(taken);
        if (lot.quantity.isZero()) lots.pop();
      }
      // Si se vendió más de lo registrado (la validación de sobreventa debería
      // impedirlo), esas acciones extra entran con costo 0.
      const pnlThisSale = proceeds.minus(costOfSharesSold);
      const grossPnlThisSale = grossProceeds.minus(grossCostOfSharesSold);
      realizedPnL = realizedPnL.plus(pnlThisSale);
      grossRealizedPnL = grossRealizedPnL.plus(grossPnlThisSale);
      if (grossPnlThisSale.isNegative()) {
        grossRealizedLosses = grossRealizedLosses.plus(grossPnlThisSale);
      } else {
        grossRealizedGains = grossRealizedGains.plus(grossPnlThisSale);
      }
      realizedPnLByTransactionId.set(tx.id, pnlThisSale);
      grossRealizedPnLByTransactionId.set(tx.id, grossPnlThisSale);
    }
  }

  const quantityHeld = lots.reduce((sum, lot) => sum.plus(lot.quantity), ZERO);
  const currentInvestment = lots.reduce((sum, lot) => sum.plus(lot.quantity.times(lot.costPerShare)), ZERO);
  const averageCostBasis = quantityHeld.isZero() ? ZERO : currentInvestment.dividedBy(quantityHeld);
  const realizedFees = grossRealizedPnL.minus(realizedPnL);

  return {
    quantityHeld,
    averageCostBasis,
    currentInvestment,
    totalBuysCost,
    realizedPnL,
    grossRealizedPnL,
    grossRealizedGains,
    grossRealizedLosses,
    realizedFees,
    totalFees,
    realizedPnLByTransactionId,
    grossRealizedPnLByTransactionId,
  };
}

export function computeQuantityHeld(transactions: Transaction[]): Decimal {
  return accumulate(transactions).quantityHeld;
}

/**
 * Ganancia/pérdida realizada de CADA venta individual (clave = id de la transacción).
 * Requiere el historial COMPLETO del ticker (no solo las de un mes) para que los lotes
 * disponibles (LIFO) en el momento de cada venta sean los correctos.
 */
export function computeRealizedPnLByTransaction(transactions: Transaction[]): Map<string, Decimal> {
  return accumulate(transactions).realizedPnLByTransactionId;
}

/**
 * Igual que `computeRealizedPnLByTransaction` pero ANTES de comisiones (bruto),
 * venta por venta — es la base que usan el desglose del Portafolio y el de
 * Ganancias para que "cuánto gané" / "cuánto perdí" signifiquen lo mismo en toda
 * la app (el neto, que sí resta comisiones, se sigue calculando aparte).
 */
export function computeGrossRealizedPnLByTransaction(transactions: Transaction[]): Map<string, Decimal> {
  return accumulate(transactions).grossRealizedPnLByTransactionId;
}

export function computePositionSummary(
  stock: StockCatalogItem,
  transactions: Transaction[],
  currentMarketPrice?: Decimal
): PositionSummary {
  const {
    quantityHeld,
    averageCostBasis,
    currentInvestment,
    totalBuysCost,
    realizedPnL,
    grossRealizedPnL,
    grossRealizedGains,
    grossRealizedLosses,
    realizedFees,
    totalFees,
  } = accumulate(transactions);

  const unrealizedPnL = currentMarketPrice
    ? currentMarketPrice.minus(averageCostBasis).times(quantityHeld)
    : undefined;

  let returnPercentage: Decimal | undefined;
  if (totalBuysCost.greaterThan(0)) {
    if (quantityHeld.isZero()) {
      returnPercentage = realizedPnL.dividedBy(totalBuysCost).times(100);
    } else if (unrealizedPnL) {
      returnPercentage = realizedPnL.plus(unrealizedPnL).dividedBy(totalBuysCost).times(100);
    }
  }

  return {
    stock,
    quantityHeld,
    averageCostBasis,
    currentInvestment,
    totalBuysCost,
    realizedPnL,
    grossRealizedPnL,
    grossRealizedGains,
    grossRealizedLosses,
    realizedFees,
    totalFees,
    currentMarketPrice,
    unrealizedPnL,
    returnPercentage,
  };
}

export interface DailyPnLPoint {
  /** Medianoche del día (hora local). */
  date: Date;
  /** Ganancia/pérdida realizada NETA (con comisiones descontadas) solo ese día. */
  dailyPnL: Decimal;
  /** Suma de las ventas de ese día que dieron ganancia (>= 0), ANTES de comisiones (bruto, igual que en Portafolio). */
  dailyGains: Decimal;
  /** Suma de las ventas de ese día que dieron pérdida (<= 0), ANTES de comisiones (bruto, igual que en Portafolio). */
  dailyLosses: Decimal;
  /** Ganancia/pérdida realizada acumulada hasta ese día (todo el portafolio). */
  cumulativePnL: Decimal;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKey(date: Date): string {
  return startOfDay(date).toISOString();
}

/**
 * Línea de tiempo de la ganancia/pérdida REALIZADA de todo el portafolio (todas las
 * acciones/cripto juntas), agrupada por día calendario, con el acumulado corriendo.
 * Solo las ventas generan ganancia realizada — sin un proveedor de precios en vivo
 * conectado, es la única "ganancia" que se puede calcular con certeza (no depende del
 * precio de mercado de hoy). Se usa tanto para "ganancia de hoy" como para el gráfico
 * de barras de Ganancias.
 */
export function computeRealizedPnLTimeline(transactions: Transaction[]): DailyPnLPoint[] {
  const byTicker = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const list = byTicker.get(t.tickerSymbol);
    if (list) list.push(t);
    else byTicker.set(t.tickerSymbol, [t]);
  }

  const dailyPnLByDay = new Map<string, Decimal>();
  const dailyGainsByDay = new Map<string, Decimal>();
  const dailyLossesByDay = new Map<string, Decimal>();
  const dateByDay = new Map<string, Date>();

  for (const [, txs] of byTicker) {
    const pnlByTx = computeRealizedPnLByTransaction(txs);
    const grossPnlByTx = computeGrossRealizedPnLByTransaction(txs);
    for (const tx of txs) {
      const pnl = pnlByTx.get(tx.id);
      if (!pnl) continue; // las compras no generan ganancia realizada
      const grossPnl = grossPnlByTx.get(tx.id) as Decimal;
      const key = dayKey(tx.date);
      dailyPnLByDay.set(key, (dailyPnLByDay.get(key) ?? ZERO).plus(pnl));
      if (grossPnl.isNegative()) {
        dailyLossesByDay.set(key, (dailyLossesByDay.get(key) ?? ZERO).plus(grossPnl));
      } else {
        dailyGainsByDay.set(key, (dailyGainsByDay.get(key) ?? ZERO).plus(grossPnl));
      }
      if (!dateByDay.has(key)) dateByDay.set(key, startOfDay(tx.date));
    }
  }

  const sortedKeys = Array.from(dailyPnLByDay.keys()).sort();
  let cumulative = ZERO;
  return sortedKeys.map((key) => {
    const dailyPnL = dailyPnLByDay.get(key) as Decimal;
    cumulative = cumulative.plus(dailyPnL);
    return {
      date: dateByDay.get(key) as Date,
      dailyPnL,
      dailyGains: dailyGainsByDay.get(key) ?? ZERO,
      dailyLosses: dailyLossesByDay.get(key) ?? ZERO,
      cumulativePnL: cumulative,
    };
  });
}

export interface MonthlyRealizedPnL {
  year: number;
  /** 0-11 (enero = 0). */
  month: number;
  /** Suma de las ventas cerradas con ganancia ese mes (>= 0), ANTES de comisiones (bruto, igual que en Portafolio). */
  gains: Decimal;
  /** Suma de las ventas cerradas con pérdida ese mes (<= 0), ANTES de comisiones (bruto, igual que en Portafolio). */
  losses: Decimal;
  /** Comisiones realizadas atribuibles a las ventas cerradas ese mes. */
  fees: Decimal;
  /** gains + losses − fees (neto real, con comisiones descontadas). */
  net: Decimal;
}

/**
 * Ganancia/pérdida realizada agrupada por MES calendario, separando en cada mes lo
 * ganado de lo perdido (para poder mostrar, p. ej., "agosto: +120 ganancia / -30
 * pérdida"). `gains`/`losses` son BRUTOS (antes de comisiones) — la misma base que
 * usa el desglose del Portafolio — así "cuánto gané"/"cuánto perdí" significa lo
 * mismo en las dos pantallas; `fees` desglosa lo pagado en comisiones ese mes y
 * `net` es el resultado real ya con comisiones descontadas. Igual que el resto del
 * módulo, solo cuentan las ventas cerradas y se usan los lotes LIFO; requiere el
 * historial completo de cada ticker.
 */
export function computeMonthlyRealizedPnL(transactions: Transaction[]): MonthlyRealizedPnL[] {
  const byTicker = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const list = byTicker.get(t.tickerSymbol);
    if (list) list.push(t);
    else byTicker.set(t.tickerSymbol, [t]);
  }

  const gainsByKey = new Map<string, Decimal>();
  const lossesByKey = new Map<string, Decimal>();
  const feesByKey = new Map<string, Decimal>();
  const monthByKey = new Map<string, { year: number; month: number }>();

  for (const [, txs] of byTicker) {
    const pnlByTx = computeRealizedPnLByTransaction(txs);
    const grossPnlByTx = computeGrossRealizedPnLByTransaction(txs);
    for (const tx of txs) {
      const pnl = pnlByTx.get(tx.id);
      if (!pnl) continue; // las compras no generan ganancia realizada
      const grossPnl = grossPnlByTx.get(tx.id) as Decimal;
      const year = tx.date.getFullYear();
      const month = tx.date.getMonth();
      const key = `${year}-${String(month).padStart(2, '0')}`;
      if (!monthByKey.has(key)) monthByKey.set(key, { year, month });
      if (grossPnl.isNegative()) {
        lossesByKey.set(key, (lossesByKey.get(key) ?? ZERO).plus(grossPnl));
      } else {
        gainsByKey.set(key, (gainsByKey.get(key) ?? ZERO).plus(grossPnl));
      }
      feesByKey.set(key, (feesByKey.get(key) ?? ZERO).plus(grossPnl.minus(pnl)));
    }
  }

  return Array.from(monthByKey.keys())
    .sort()
    .map((key) => {
      const { year, month } = monthByKey.get(key) as { year: number; month: number };
      const gains = gainsByKey.get(key) ?? ZERO;
      const losses = lossesByKey.get(key) ?? ZERO;
      const fees = feesByKey.get(key) ?? ZERO;
      return { year, month, gains, losses, fees, net: gains.plus(losses).minus(fees) };
    });
}

/** Ganancia/pérdida realizada de HOY (calendario local), 0 si no vendiste nada hoy. */
export function computeTodayRealizedPnL(transactions: Transaction[]): Decimal {
  const timeline = computeRealizedPnLTimeline(transactions);
  const todayKey = dayKey(new Date());
  const last = timeline[timeline.length - 1];
  return last && dayKey(last.date) === todayKey ? last.dailyPnL : ZERO;
}

export function computePortfolioSummary(positions: PositionSummary[]): PortfolioSummary {
  const totalInvested = positions.reduce((sum, p) => sum.plus(p.currentInvestment), ZERO);
  const totalBuysCost = positions.reduce((sum, p) => sum.plus(p.totalBuysCost), ZERO);
  const totalRealizedPnL = positions.reduce((sum, p) => sum.plus(p.realizedPnL), ZERO);
  const totalGrossRealizedPnL = positions.reduce((sum, p) => sum.plus(p.grossRealizedPnL), ZERO);
  const totalGrossRealizedGains = positions.reduce((sum, p) => sum.plus(p.grossRealizedGains), ZERO);
  const totalGrossRealizedLosses = positions.reduce((sum, p) => sum.plus(p.grossRealizedLosses), ZERO);
  const totalRealizedFees = positions.reduce((sum, p) => sum.plus(p.realizedFees), ZERO);
  const totalFees = positions.reduce((sum, p) => sum.plus(p.totalFees), ZERO);

  const hasAllPrices = positions.every((p) => p.quantityHeld.isZero() || p.unrealizedPnL !== undefined);
  const totalUnrealizedPnL = hasAllPrices
    ? positions.reduce((sum, p) => sum.plus(p.unrealizedPnL ?? ZERO), ZERO)
    : undefined;

  let totalReturnPercentage: Decimal | undefined;
  if (totalBuysCost.greaterThan(0)) {
    const totalPnL = totalRealizedPnL.plus(totalUnrealizedPnL ?? ZERO);
    if (totalUnrealizedPnL !== undefined || positions.every((p) => p.quantityHeld.isZero())) {
      totalReturnPercentage = totalPnL.dividedBy(totalBuysCost).times(100);
    }
  }

  return {
    totalInvested,
    totalRealizedPnL,
    totalGrossRealizedPnL,
    totalGrossRealizedGains,
    totalGrossRealizedLosses,
    totalRealizedFees,
    totalUnrealizedPnL,
    totalReturnPercentage,
    totalBuysCost,
    totalFees,
    positions,
  };
}

/**
 * Capital máximo que tuviste invertido a la vez (costo de lo que mantenías en cartera),
 * mirando cada operación en orden cronológico. Es la base del % de rentabilidad: NO suma
 * todas las compras porque reinvertir el mismo dinero tras una venta lo contaría varias veces.
 * Con `until` solo considera las operaciones anteriores a esa fecha.
 */
export function computePeakInvested(transactions: Transaction[], until?: Date): Decimal {
  const chronological = [...transactions]
    .filter((t) => !until || t.date < until)
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.createdAt.getTime() - b.createdAt.getTime());
  let peak = ZERO;
  for (let i = 1; i <= chronological.length; i += 1) {
    const bySymbol = new Map<string, Transaction[]>();
    for (const t of chronological.slice(0, i)) {
      const list = bySymbol.get(t.tickerSymbol);
      if (list) list.push(t);
      else bySymbol.set(t.tickerSymbol, [t]);
    }
    let invested = ZERO;
    for (const [symbol, txs] of bySymbol) {
      invested = invested.plus(computePositionSummary({ symbol } as StockCatalogItem, txs).currentInvestment);
    }
    if (invested.greaterThan(peak)) peak = invested;
  }
  return peak;
}
