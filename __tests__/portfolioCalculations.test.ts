import Decimal from 'decimal.js';
import { Transaction } from '../models/Transaction';
import { StockCatalogItem } from '../models/StockCatalogItem';
import {
  computePositionSummary,
  computePortfolioSummary,
  computeQuantityHeld,
  computeMonthlyRealizedPnL,
  computeRealizedPnLByTransaction,
  computeRealizedPnLTimeline,
  computeTodayRealizedPnL,
} from '../services/portfolioCalculations';

const AAPL: StockCatalogItem = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  sector: 'Tecnología',
  industry: 'Hardware y equipos',
  exchange: 'NASDAQ',
};

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

describe('computeQuantityHeld', () => {
  it('resta las ventas de las compras', () => {
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100) }),
      tx({ type: 'venta', quantity: new Decimal(4), pricePerShare: new Decimal(120) }),
    ];
    expect(computeQuantityHeld(transactions).toString()).toBe('6');
  });
});

describe('computePositionSummary', () => {
  it('calcula el costo promedio ponderado tras varias compras', () => {
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100) }), // costo 1000
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(120) }), // costo 1200
    ];
    const summary = computePositionSummary(AAPL, transactions);
    // (1000 + 1200) / 20 = 110
    expect(summary.averageCostBasis.toString()).toBe('110');
    expect(summary.quantityHeld.toString()).toBe('20');
    expect(summary.currentInvestment.toString()).toBe('2200');
  });

  it('incluye las comisiones de compra dentro del costo promedio', () => {
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100), fees: new Decimal(50) }),
    ];
    const summary = computePositionSummary(AAPL, transactions);
    // (1000 + 50) / 10 = 105
    expect(summary.averageCostBasis.toString()).toBe('105');
    expect(summary.currentInvestment.toString()).toBe('1050');
    expect(summary.totalFees.toString()).toBe('50');
  });

  it('calcula la ganancia realizada de una venta descontando comisiones', () => {
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100) }),
      tx({
        type: 'venta',
        quantity: new Decimal(4),
        pricePerShare: new Decimal(150),
        fees: new Decimal(10),
        date: new Date('2026-02-01'),
      }),
    ];
    const summary = computePositionSummary(AAPL, transactions);
    // proceeds = 4*150 - 10 = 590; costo de lo vendido = 4*100 = 400; ganancia = 190
    expect(summary.realizedPnL.toString()).toBe('190');
    expect(summary.quantityHeld.toString()).toBe('6');
    // el promedio de costo de lo que queda no cambia al vender
    expect(summary.averageCostBasis.toString()).toBe('100');
  });

  it('calcula la ganancia no realizada cuando hay precio de mercado', () => {
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100) }),
    ];
    const summary = computePositionSummary(AAPL, transactions, new Decimal(130));
    // (130 - 100) * 10 = 300
    expect(summary.unrealizedPnL?.toString()).toBe('300');
    expect(summary.returnPercentage?.toString()).toBe('30');
  });

  it('deja unrealizedPnL y returnPercentage indefinidos sin precio de mercado y con posición abierta', () => {
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100) }),
    ];
    const summary = computePositionSummary(AAPL, transactions);
    expect(summary.unrealizedPnL).toBeUndefined();
    expect(summary.returnPercentage).toBeUndefined();
  });

  it('calcula la rentabilidad solo con lo realizado cuando la posición quedó cerrada', () => {
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100) }),
      tx({
        type: 'venta',
        quantity: new Decimal(10),
        pricePerShare: new Decimal(150),
        date: new Date('2026-02-01'),
      }),
    ];
    const summary = computePositionSummary(AAPL, transactions);
    expect(summary.quantityHeld.toString()).toBe('0');
    // ganancia = (150-100)*10 = 500; capital histórico = 1000; retorno = 50%
    expect(summary.realizedPnL.toString()).toBe('500');
    expect(summary.returnPercentage?.toString()).toBe('50');
    // la posición está cerrada: no debe quedar nada mostrando como "inversión actual"
    expect(summary.currentInvestment.toString()).toBe('0');
  });

  it('resetea currentInvestment al cerrar una posición y volver a comprar (no debe acumular con el ciclo anterior)', () => {
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100) }),
      tx({ type: 'venta', quantity: new Decimal(10), pricePerShare: new Decimal(100), date: new Date('2026-02-01') }),
      tx({ type: 'compra', quantity: new Decimal(5), pricePerShare: new Decimal(200), date: new Date('2026-03-01') }),
    ];
    const summary = computePositionSummary(AAPL, transactions);
    expect(summary.quantityHeld.toString()).toBe('5');
    expect(summary.averageCostBasis.toString()).toBe('200');
    // solo lo de la posición nueva, NO 1000 (compra vieja) + 1000 (compra nueva)
    expect(summary.currentInvestment.toString()).toBe('1000');
  });
});

describe('comisiones (totalFees)', () => {
  it('suma las comisiones de compras y ventas por separado de la P&L', () => {
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100), fees: new Decimal(3) }),
      tx({
        type: 'venta',
        quantity: new Decimal(10),
        pricePerShare: new Decimal(110),
        fees: new Decimal(2.5),
        date: new Date('2026-02-01'),
      }),
    ];
    const summary = computePositionSummary(AAPL, transactions);
    expect(summary.totalFees.toString()).toBe('5.5');
    // la P&L ya trae las comisiones descontadas: (1100 - 2.5) - (1000 + 3) = 94.5
    expect(summary.realizedPnL.toString()).toBe('94.5');
    // subtotal bruto = 1100 - 1000 = 100 ; comisiones realizadas = 3 + 2.5 = 5.5 ; neto = 94.5
    expect(summary.grossRealizedPnL.toString()).toBe('100');
    expect(summary.realizedFees.toString()).toBe('5.5');
    expect(summary.grossRealizedPnL.minus(summary.realizedFees).toString()).toBe(summary.realizedPnL.toString());
  });

  it('solo cuenta como comisión realizada la parte de la comisión de compra ya vendida', () => {
    const transactions = [
      // comisión de compra 20 sobre 10 acciones => 2 por acción
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100), fees: new Decimal(20) }),
      tx({
        type: 'venta',
        quantity: new Decimal(4),
        pricePerShare: new Decimal(150),
        fees: new Decimal(5),
        date: new Date('2026-02-01'),
      }),
    ];
    const summary = computePositionSummary(AAPL, transactions);
    // bruto = 4*150 - 4*100 = 200
    expect(summary.grossRealizedPnL.toString()).toBe('200');
    // comisiones realizadas = venta 5 + (4 acciones * 2 de comisión de compra) = 13
    expect(summary.realizedFees.toString()).toBe('13');
    // neto = 200 - 13 = 187
    expect(summary.realizedPnL.toString()).toBe('187');
    // total pagado en comisiones sigue siendo 25 (20 + 5): 12 todavía no se realizó
    expect(summary.totalFees.toString()).toBe('25');
  });

  it('es 0 cuando ninguna operación tuvo comisión', () => {
    const summary = computePositionSummary(AAPL, [
      tx({ type: 'compra', quantity: new Decimal(1), pricePerShare: new Decimal(50) }),
    ]);
    expect(summary.totalFees.toString()).toBe('0');
  });

  it('computePortfolioSummary agrega las comisiones de todas las posiciones', () => {
    const a = computePositionSummary(AAPL, [
      tx({ type: 'compra', quantity: new Decimal(1), pricePerShare: new Decimal(10), fees: new Decimal(1) }),
    ]);
    const b = computePositionSummary({ ...AAPL, symbol: 'MSFT' }, [
      tx({ type: 'compra', quantity: new Decimal(1), pricePerShare: new Decimal(20), fees: new Decimal(2.25) }),
    ]);
    expect(computePortfolioSummary([a, b]).totalFees.toString()).toBe('3.25');
  });

  it('computePortfolioSummary expone el subtotal bruto y las comisiones realizadas del portafolio', () => {
    const a = computePositionSummary(AAPL, [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100), fees: new Decimal(2) }),
      tx({
        type: 'venta',
        quantity: new Decimal(10),
        pricePerShare: new Decimal(130),
        fees: new Decimal(3),
        date: new Date('2026-02-01'),
      }),
    ]);
    const b = computePositionSummary({ ...AAPL, symbol: 'MSFT' }, [
      tx({ tickerSymbol: 'MSFT', type: 'compra', quantity: new Decimal(5), pricePerShare: new Decimal(20) }),
      tx({
        tickerSymbol: 'MSFT',
        type: 'venta',
        quantity: new Decimal(5),
        pricePerShare: new Decimal(16),
        date: new Date('2026-02-01'),
      }),
    ]);
    const portfolio = computePortfolioSummary([a, b]);
    // AAPL bruto = 300, MSFT bruto = -20 => 280
    expect(portfolio.totalGrossRealizedPnL.toString()).toBe('280');
    // comisiones realizadas AAPL = 2 + 3 = 5 ; MSFT = 0
    expect(portfolio.totalRealizedFees.toString()).toBe('5');
    // subtotal − comisiones = neto
    expect(portfolio.totalGrossRealizedPnL.minus(portfolio.totalRealizedFees).toString()).toBe(
      portfolio.totalRealizedPnL.toString()
    );
  });
});

describe('ganancias y pérdidas separadas (grossRealizedGains / grossRealizedLosses)', () => {
  it('separa las ventas ganadoras de las perdedoras en vez de solo netearlas', () => {
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100) }),
      // venta ganadora: +200
      tx({ type: 'venta', quantity: new Decimal(5), pricePerShare: new Decimal(140), date: new Date('2026-02-01') }),
      // venta perdedora: -150
      tx({ type: 'venta', quantity: new Decimal(5), pricePerShare: new Decimal(70), date: new Date('2026-03-01') }),
    ];
    const summary = computePositionSummary(AAPL, transactions);
    expect(summary.grossRealizedGains.toString()).toBe('200');
    expect(summary.grossRealizedLosses.toString()).toBe('-150');
    expect(summary.grossRealizedGains.plus(summary.grossRealizedLosses).toString()).toBe(
      summary.grossRealizedPnL.toString()
    );
    // netear las dos ventas escondería la pérdida de 150: el subtotal bruto queda en 50
    expect(summary.grossRealizedPnL.toString()).toBe('50');
  });

  it('es 0 cuando no hay ventas de ese signo', () => {
    const onlyGains = computePositionSummary(AAPL, [
      tx({ type: 'compra', quantity: new Decimal(1), pricePerShare: new Decimal(10) }),
      tx({ type: 'venta', quantity: new Decimal(1), pricePerShare: new Decimal(15), date: new Date('2026-02-01') }),
    ]);
    expect(onlyGains.grossRealizedGains.toString()).toBe('5');
    expect(onlyGains.grossRealizedLosses.toString()).toBe('0');
  });

  it('computePortfolioSummary agrega las ganancias y pérdidas de todas las posiciones', () => {
    const a = computePositionSummary(AAPL, [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100) }),
      tx({
        type: 'venta',
        quantity: new Decimal(10),
        pricePerShare: new Decimal(130),
        date: new Date('2026-02-01'),
      }),
    ]);
    const b = computePositionSummary({ ...AAPL, symbol: 'MSFT' }, [
      tx({ tickerSymbol: 'MSFT', type: 'compra', quantity: new Decimal(5), pricePerShare: new Decimal(20) }),
      tx({
        tickerSymbol: 'MSFT',
        type: 'venta',
        quantity: new Decimal(5),
        pricePerShare: new Decimal(16),
        date: new Date('2026-02-01'),
      }),
    ]);
    const portfolio = computePortfolioSummary([a, b]);
    // AAPL ganó 300, MSFT perdió -20
    expect(portfolio.totalGrossRealizedGains.toString()).toBe('300');
    expect(portfolio.totalGrossRealizedLosses.toString()).toBe('-20');
    expect(portfolio.totalGrossRealizedGains.plus(portfolio.totalGrossRealizedLosses).toString()).toBe(
      portfolio.totalGrossRealizedPnL.toString()
    );
  });
});

describe('contabilidad por lotes LIFO', () => {
  it('vende contra la compra más reciente y deja intactas las acciones viejas (ejemplo del usuario)', () => {
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(10), date: new Date('2026-01-01') }),
      tx({ type: 'compra', quantity: new Decimal(1), pricePerShare: new Decimal(0.5), date: new Date('2026-01-02') }),
      tx({ type: 'venta', quantity: new Decimal(1), pricePerShare: new Decimal(1), date: new Date('2026-01-03') }),
    ];
    const summary = computePositionSummary(AAPL, transactions);
    // gana 1 - 0.5 = 0.5 (contra el lote de 0.5), NO promediado con las de 10
    expect(summary.realizedPnL.toString()).toBe('0.5');
    expect(summary.quantityHeld.toString()).toBe('10');
    // le quedan exactamente las 10 acciones de $10 => costo abierto 100, costo unitario 10
    expect(summary.currentInvestment.toString()).toBe('100');
    expect(summary.averageCostBasis.toString()).toBe('10');
  });

  it('registra la pérdida directa al vender después el lote viejo', () => {
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(10), date: new Date('2026-01-01') }),
      tx({ type: 'compra', quantity: new Decimal(1), pricePerShare: new Decimal(0.5), date: new Date('2026-01-02') }),
      tx({ type: 'venta', quantity: new Decimal(1), pricePerShare: new Decimal(1), date: new Date('2026-01-03') }),
      tx({ type: 'venta', quantity: new Decimal(10), pricePerShare: new Decimal(9), date: new Date('2026-01-04') }),
    ];
    const summary = computePositionSummary(AAPL, transactions);
    // 0.5 (primera venta) + (90 - 100) (segunda venta) = -9.5
    expect(summary.realizedPnL.toString()).toBe('-9.5');
    expect(summary.quantityHeld.toString()).toBe('0');
    expect(summary.currentInvestment.toString()).toBe('0');
  });

  it('consume varios lotes en orden LIFO cuando la venta cruza un límite de lote', () => {
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(5), pricePerShare: new Decimal(10), date: new Date('2026-01-01') }),
      tx({ type: 'compra', quantity: new Decimal(5), pricePerShare: new Decimal(20), date: new Date('2026-01-02') }),
      tx({ type: 'venta', quantity: new Decimal(7), pricePerShare: new Decimal(30), date: new Date('2026-01-03') }),
    ];
    const summary = computePositionSummary(AAPL, transactions);
    // costo vendido = 5*20 (lote nuevo) + 2*10 (lote viejo) = 120; ingreso = 210; ganancia = 90
    expect(summary.realizedPnL.toString()).toBe('90');
    expect(summary.quantityHeld.toString()).toBe('3');
    // quedan 3 acciones del lote viejo de $10
    expect(summary.currentInvestment.toString()).toBe('30');
    expect(summary.averageCostBasis.toString()).toBe('10');
  });

  it('computeRealizedPnLByTransaction asigna a cada venta su ganancia por lote, no promediada', () => {
    const venta1 = tx({ type: 'venta', quantity: new Decimal(1), pricePerShare: new Decimal(1), date: new Date('2026-01-03') });
    const venta2 = tx({ type: 'venta', quantity: new Decimal(10), pricePerShare: new Decimal(9), date: new Date('2026-01-04') });
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(10), date: new Date('2026-01-01') }),
      tx({ type: 'compra', quantity: new Decimal(1), pricePerShare: new Decimal(0.5), date: new Date('2026-01-02') }),
      venta1,
      venta2,
    ];
    const map = computeRealizedPnLByTransaction(transactions);
    expect(map.get(venta1.id)?.toString()).toBe('0.5');
    expect(map.get(venta2.id)?.toString()).toBe('-10');
  });
});

describe('computePortfolioSummary', () => {
  it('agrega la inversión y la ganancia realizada de varias posiciones', () => {
    const positionA = computePositionSummary(AAPL, [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100) }),
    ]);
    const positionB = computePositionSummary(
      { ...AAPL, symbol: 'MSFT', name: 'Microsoft Corporation' },
      [tx({ type: 'compra', quantity: new Decimal(5), pricePerShare: new Decimal(200) })]
    );
    const portfolio = computePortfolioSummary([positionA, positionB]);
    expect(portfolio.totalInvested.toString()).toBe('2000');
    expect(portfolio.positions).toHaveLength(2);
  });
});

describe('computeRealizedPnLTimeline', () => {
  it('agrupa por día y acumula la ganancia/pérdida de todas las acciones juntas', () => {
    const transactions = [
      // Día 1: AAPL gana 200
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100), date: new Date('2026-01-01') }),
      tx({ type: 'venta', quantity: new Decimal(10), pricePerShare: new Decimal(120), date: new Date('2026-01-02') }),
      // Día 3: MSFT pierde 50
      tx({
        tickerSymbol: 'MSFT',
        type: 'compra',
        quantity: new Decimal(5),
        pricePerShare: new Decimal(200),
        date: new Date('2026-01-03'),
      }),
      tx({
        tickerSymbol: 'MSFT',
        type: 'venta',
        quantity: new Decimal(5),
        pricePerShare: new Decimal(190),
        date: new Date('2026-01-03'),
      }),
    ];

    const timeline = computeRealizedPnLTimeline(transactions);
    expect(timeline).toHaveLength(2);
    expect(timeline[0].dailyPnL.toString()).toBe('200');
    expect(timeline[0].dailyGains.toString()).toBe('200');
    expect(timeline[0].dailyLosses.toString()).toBe('0');
    expect(timeline[0].cumulativePnL.toString()).toBe('200');
    // pierde 50 el día 3: el acumulado baja de 200 a 150
    expect(timeline[1].dailyPnL.toString()).toBe('-50');
    expect(timeline[1].dailyGains.toString()).toBe('0');
    expect(timeline[1].dailyLosses.toString()).toBe('-50');
    expect(timeline[1].cumulativePnL.toString()).toBe('150');
  });

  it('separa ganancias y pérdidas del mismo día cuando hay ventas de ambos signos', () => {
    const transactions = [
      // AAPL gana 100 el mismo día que MSFT pierde 30
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100), date: new Date('2026-01-01') }),
      tx({ type: 'venta', quantity: new Decimal(10), pricePerShare: new Decimal(110), date: new Date('2026-01-05') }),
      tx({
        tickerSymbol: 'MSFT',
        type: 'compra',
        quantity: new Decimal(3),
        pricePerShare: new Decimal(200),
        date: new Date('2026-01-01'),
      }),
      tx({
        tickerSymbol: 'MSFT',
        type: 'venta',
        quantity: new Decimal(3),
        pricePerShare: new Decimal(190),
        date: new Date('2026-01-05'),
      }),
    ];
    const timeline = computeRealizedPnLTimeline(transactions);
    expect(timeline).toHaveLength(1);
    expect(timeline[0].dailyGains.toString()).toBe('100');
    expect(timeline[0].dailyLosses.toString()).toBe('-30');
    expect(timeline[0].dailyPnL.toString()).toBe('70');
  });

  it('ignora las compras (no generan ganancia realizada)', () => {
    const transactions = [tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100) })];
    expect(computeRealizedPnLTimeline(transactions)).toHaveLength(0);
  });
});

describe('computeMonthlyRealizedPnL', () => {
  it('agrupa por mes y separa ganancias de pérdidas (agosto vs septiembre)', () => {
    const transactions = [
      // AAPL: compra vieja, una venta con ganancia en agosto y otra con pérdida en septiembre
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100), date: new Date('2026-07-01') }),
      tx({ type: 'venta', quantity: new Decimal(5), pricePerShare: new Decimal(120), date: new Date('2026-08-10') }), // +100
      tx({ type: 'venta', quantity: new Decimal(5), pricePerShare: new Decimal(90), date: new Date('2026-09-05') }), // -50
      // MSFT: una venta con pérdida en agosto
      tx({ tickerSymbol: 'MSFT', type: 'compra', quantity: new Decimal(4), pricePerShare: new Decimal(50), date: new Date('2026-08-01') }),
      tx({ tickerSymbol: 'MSFT', type: 'venta', quantity: new Decimal(4), pricePerShare: new Decimal(40), date: new Date('2026-08-20') }), // -40
    ];

    const months = computeMonthlyRealizedPnL(transactions);
    expect(months).toHaveLength(2);

    const [agosto, septiembre] = months;
    expect(agosto.month).toBe(7); // agosto = 7
    expect(agosto.gains.toString()).toBe('100');
    expect(agosto.losses.toString()).toBe('-40');
    expect(agosto.net.toString()).toBe('60');

    expect(septiembre.month).toBe(8); // septiembre = 8
    expect(septiembre.gains.toString()).toBe('0');
    expect(septiembre.losses.toString()).toBe('-50');
    expect(septiembre.net.toString()).toBe('-50');
  });

  it('no incluye meses sin ventas cerradas', () => {
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(1), pricePerShare: new Decimal(10), date: new Date('2026-08-01') }),
    ];
    expect(computeMonthlyRealizedPnL(transactions)).toHaveLength(0);
  });

  it('gains/losses son BRUTOS (antes de comisiones), igual que en el Portafolio — no netean la comisión por venta', () => {
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100), fees: new Decimal(2) }),
      tx({
        type: 'venta',
        quantity: new Decimal(10),
        pricePerShare: new Decimal(110),
        fees: new Decimal(3),
        date: new Date('2026-02-01'),
      }),
    ];
    const [month] = computeMonthlyRealizedPnL(transactions);
    // bruto = 1100 - 1000 = 100 (NO 95, que sería neteando ya las comisiones)
    expect(month.gains.toString()).toBe('100');
    expect(month.losses.toString()).toBe('0');
    // comisiones realizadas = 2 (compra) + 3 (venta) = 5
    expect(month.fees.toString()).toBe('5');
    // neto = bruto - comisiones = 95
    expect(month.net.toString()).toBe('95');
  });
});

describe('computeTodayRealizedPnL', () => {
  it('devuelve la ganancia de hoy cuando hay una venta con fecha de hoy', () => {
    const today = new Date();
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100), date: new Date('2020-01-01') }),
      tx({ type: 'venta', quantity: new Decimal(10), pricePerShare: new Decimal(115), date: today }),
    ];
    expect(computeTodayRealizedPnL(transactions).toString()).toBe('150');
  });

  it('devuelve 0 si la última venta no fue hoy', () => {
    const transactions = [
      tx({ type: 'compra', quantity: new Decimal(10), pricePerShare: new Decimal(100), date: new Date('2020-01-01') }),
      tx({ type: 'venta', quantity: new Decimal(10), pricePerShare: new Decimal(115), date: new Date('2020-01-02') }),
    ];
    expect(computeTodayRealizedPnL(transactions).toString()).toBe('0');
  });
});
