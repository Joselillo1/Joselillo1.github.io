import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { MonthlyBalance } from '../../hooks/useMonthlyGains';
import { formatMonthShort } from '../../services/format';
import { useTheme } from '../theme';

interface Props {
  months: MonthlyBalance[];
}

const WIDTH = 340;
const HEIGHT = 190;
const PAD_L = 8;
const PAD_R = 46;
const PAD_T = 22;
const PAD_B = 26;

function pctLabel(value: number): string {
  return `${value < 0 ? '−' : value > 0 ? '+' : ''}${Math.abs(value).toFixed(1)}%`;
}

/**
 * Rentabilidad acumulada mes a mes: una línea con un punto por mes
 * que marca, al cierre de cada mes, cuánto llevas ganado sobre el capital. Es el mismo
 * % que el "Acumulado total", pero visto como evolución en el tiempo.
 */
export function CumulativeReturnChart({ months }: Props) {
  const theme = useTheme();

  const model = useMemo(() => {
    if (months.length === 0) return null;
    const values = months.map((m) => m.cumulativePercentage.toNumber());
    const lo = Math.min(0, ...values);
    const hi = Math.max(0, ...values);
    const span = Math.max(0.5, hi - lo) * 1.15;
    const min = lo - (span - (hi - lo)) / 2;
    const max = min + span;

    const plotW = WIDTH - PAD_L - PAD_R;
    const plotH = HEIGHT - PAD_T - PAD_B;
    // Un punto por mes, repartidos de izquierda a derecha.
    const slotCount = months.length;
    const xOf = (i: number) => PAD_L + (slotCount === 1 ? plotW / 2 : (plotW * i) / (slotCount - 1));
    const yOf = (v: number) => PAD_T + plotH - ((v - min) / (max - min)) * plotH;

    const points = values.map((v, i) => ({ x: xOf(i), y: yOf(v), v }));
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const grid = [min, (min + max) / 2, max];
    return { points, path, grid, yOf, zeroY: yOf(0) };
  }, [months]);

  if (!model) return null;
  const { points, path, grid, yOf, zeroY } = model;
  const last = points[points.length - 1];
  const lineColor = last.v >= 0 ? theme.positive : theme.negative;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.textMuted }]}>Rentabilidad acumulada</Text>
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {grid.map((value, i) => (
          <React.Fragment key={`g-${i}`}>
            <Line
              x1={PAD_L}
              y1={yOf(value)}
              x2={WIDTH - PAD_R}
              y2={yOf(value)}
              stroke={theme.border}
              strokeOpacity={0.35}
              strokeWidth={1}
            />
            <SvgText x={WIDTH - PAD_R + 6} y={yOf(value) + 3} fontSize={9} fill={theme.textMuted} textAnchor="start">
              {pctLabel(value)}
            </SvgText>
          </React.Fragment>
        ))}
        <Line x1={PAD_L} y1={zeroY} x2={WIDTH - PAD_R} y2={zeroY} stroke={theme.text} strokeOpacity={0.55} strokeWidth={1} />
        <Path d={path} stroke={lineColor} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <React.Fragment key={`p-${i}`}>
            <Circle cx={p.x} cy={p.y} r={3.5} fill={p.v >= 0 ? theme.positive : theme.negative} />
            <SvgText
              x={p.x}
              y={p.y - 8}
              fontSize={9}
              fontWeight="700"
              fill={p.v >= 0 ? theme.positive : theme.negative}
              textAnchor="middle"
            >
              {pctLabel(p.v)}
            </SvgText>
            <SvgText x={p.x} y={HEIGHT - 8} fontSize={10} fill={theme.textMuted} textAnchor="middle">
              {formatMonthShort(months[i].year, months[i].month)}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 12, marginTop: 12 },
  title: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
});
