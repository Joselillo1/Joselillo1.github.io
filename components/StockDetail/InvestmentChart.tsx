import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import Decimal from 'decimal.js';
import { Transaction } from '../../models/Transaction';
import { formatCurrency } from '../../services/format';
import { useTheme } from '../theme';

interface Props {
  /** Historial ya ordenado cronológicamente. */
  history: Transaction[];
}

/**
 * Recorre el historial y devuelve el valor invertido (costo de los lotes de compra
 * que siguen abiertos, con el mismo criterio LIFO que el motor de cálculo) en cada
 * punto en el tiempo.
 */
function buildSeries(history: Transaction[]): { labels: string[]; values: number[] } {
  const lots: { quantity: Decimal; costPerShare: Decimal }[] = [];
  const labels: string[] = [];
  const values: number[] = [];

  for (const tx of history) {
    if (tx.type === 'compra') {
      const cost = tx.quantity.times(tx.pricePerShare).plus(tx.fees);
      if (tx.quantity.greaterThan(0)) {
        lots.push({ quantity: tx.quantity, costPerShare: cost.dividedBy(tx.quantity) });
      }
    } else {
      let remaining = tx.quantity;
      while (remaining.greaterThan(0) && lots.length > 0) {
        const lot = lots[lots.length - 1];
        const taken = Decimal.min(lot.quantity, remaining);
        lot.quantity = lot.quantity.minus(taken);
        remaining = remaining.minus(taken);
        if (lot.quantity.isZero()) lots.pop();
      }
    }
    const openCost = lots.reduce((sum, lot) => sum.plus(lot.quantity.times(lot.costPerShare)), new Decimal(0));
    labels.push(`${tx.date.getMonth() + 1}/${tx.date.getFullYear().toString().slice(2)}`);
    values.push(openCost.toNumber());
  }

  return { labels, values };
}

const WIDTH = 320;
const HEIGHT = 180;
const PADDING_LEFT = 8;
const PADDING_RIGHT = 8;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 24;

/**
 * Gráfico de línea simple, dibujado a mano con react-native-svg (sin librerías de
 * charts de terceros): funciona igual en iOS, Android y web, evitando los problemas
 * de compatibilidad web que tienen varias librerías de gráficos para React Native.
 */
export function InvestmentChart({ history }: Props) {
  const theme = useTheme();
  const { labels, values } = useMemo(() => buildSeries(history), [history]);

  if (values.length < 2) {
    return (
      <View style={[styles.placeholder, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={{ color: theme.textMuted }}>Registra al menos dos transacciones para ver el gráfico.</Text>
      </View>
    );
  }

  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0.01);
  const range = max - min || 1;
  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const points = values.map((value, i) => {
    const x = PADDING_LEFT + (i / (values.length - 1)) * plotWidth;
    const y = PADDING_TOP + plotHeight - ((value - min) / range) * plotHeight;
    return { x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const zeroY = PADDING_TOP + plotHeight - ((0 - min) / range) * plotHeight;

  // Evita saturar el eje X: muestra como máximo ~5 etiquetas.
  const step = Math.max(1, Math.ceil(labels.length / 5));

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.maxLabel, { color: theme.textMuted }]}>{formatCurrency(new Decimal(max))}</Text>
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Line
          x1={PADDING_LEFT}
          y1={zeroY}
          x2={WIDTH - PADDING_RIGHT}
          y2={zeroY}
          stroke={theme.border}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        <Polyline points={polylinePoints} fill="none" stroke={theme.primary} strokeWidth={2.5} />
        {points.length <= 30 &&
          points.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={3} fill={theme.primary} />)}
        {labels.map((label, i) =>
          i % step === 0 || i === labels.length - 1 ? (
            <SvgText
              key={i}
              x={points[i].x}
              y={HEIGHT - 6}
              fontSize={10}
              fill={theme.textMuted}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          ) : null
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: 120,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: { borderRadius: 14, borderWidth: 1, padding: 12 },
  maxLabel: { fontSize: 11, marginBottom: 4 },
});
