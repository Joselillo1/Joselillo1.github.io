import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { MonthlyRealizedPnL } from '../../services/portfolioCalculations';
import { formatMonthShort } from '../../services/format';
import { useTheme } from '../theme';

interface Props {
  months: MonthlyRealizedPnL[];
}

const WIDTH = 340;
const HEIGHT = 240;
const PAD_L = 6;
const PAD_R = 46; // espacio para el eje de precio a la derecha
const PAD_T = 26; // espacio arriba para el neto de cada mes
const PAD_B = 28;

function axisLabel(value: number): string {
  const rounded = Math.round(value);
  return `${rounded < 0 ? '-' : ''}$${Math.abs(rounded)}`;
}

/**
 * Gráfico mensual de ganancia/pérdida realizada: por cada mes, DOS columnas que
 * nacen de una misma base (como un gráfico de barras normal) — una verde con lo
 * ganado y una roja con lo perdido — para poder comparar las dos a simple vista
 * sin ambigüedad sobre cuál queda "encima" de cuál. El neto del mes va como
 * etiqueta arriba de cada par. Grilla horizontal, eje de precio a la derecha,
 * etiquetas de mes abajo.
 */
export function GainsBarChart({ months }: Props) {
  const theme = useTheme();

  const model = useMemo(() => {
    if (months.length === 0) return null;

    const gains = months.map((m) => m.gains.toNumber());
    const losses = months.map((m) => Math.abs(m.losses.toNumber()));
    const maxValue = Math.max(0.01, ...gains, ...losses) * 1.08;

    const plotW = WIDTH - PAD_L - PAD_R;
    const plotH = HEIGHT - PAD_T - PAD_B;
    const slot = plotW / months.length;
    const cx = (i: number) => PAD_L + slot * (i + 0.5);
    const baseline = PAD_T + plotH;
    const yOf = (v: number) => baseline - (Math.max(0, v) / maxValue) * plotH;

    const pairGap = 3;
    const barW = Math.max(5, Math.min(22, (slot * 0.62 - pairGap) / 2));

    const bars = months.map((m, i) => {
      const g = m.gains.toNumber();
      const l = Math.abs(m.losses.toNumber());
      const gy = yOf(g);
      const ly = yOf(l);
      const center = cx(i);
      return {
        center,
        net: m.net.toNumber(),
        hasGain: g > 0,
        hasLoss: l > 0,
        gain: { x: center - pairGap / 2 - barW, y: gy, width: barW, height: Math.max(2, baseline - gy) },
        loss: { x: center + pairGap / 2, y: ly, width: barW, height: Math.max(2, baseline - ly) },
      };
    });

    const gridValues: number[] = [0, maxValue / 3, (maxValue * 2) / 3, maxValue];
    const xLabels = months.map((m, i) => ({ x: cx(i), text: formatMonthShort(m.year, m.month) }));

    return { bars, gridValues, xLabels, baseline, yOf };
  }, [months]);

  const allZero = months.every((m) => m.gains.isZero() && m.losses.isZero());

  if (!model || allZero) {
    return (
      <View style={[styles.placeholder, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={{ color: theme.textMuted, textAlign: 'center' }}>
          Todavía no registraste ventas cerradas — acá vas a ver la ganancia y la pérdida de cada mes.
        </Text>
      </View>
    );
  }

  const { bars, gridValues, xLabels, baseline, yOf } = model;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {/* Grilla horizontal + eje de precio (0 abajo, máximo arriba) */}
        {gridValues.map((value, i) => {
          const y = yOf(value);
          return (
            <React.Fragment key={`grid-${i}`}>
              <Line
                x1={PAD_L}
                y1={y}
                x2={WIDTH - PAD_R}
                y2={y}
                stroke={theme.border}
                strokeOpacity={0.35}
                strokeWidth={1}
              />
              <SvgText x={WIDTH - PAD_R + 6} y={y + 3} fontSize={9} fill={theme.textMuted} textAnchor="start">
                {axisLabel(value)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Dos columnas por mes desde la misma base: ganancia (verde) y pérdida (roja) */}
        {bars.map((bar, i) => (
          <React.Fragment key={`bar-${i}`}>
            {bar.hasGain && (
              <Rect x={bar.gain.x} y={bar.gain.y} width={bar.gain.width} height={bar.gain.height} rx={3} fill={theme.positive} />
            )}
            {bar.hasLoss && (
              <Rect x={bar.loss.x} y={bar.loss.y} width={bar.loss.width} height={bar.loss.height} rx={3} fill={theme.negative} />
            )}
            <SvgText
              x={bar.center}
              y={PAD_T - 11}
              fontSize={10}
              fontWeight="800"
              fill={bar.net >= 0 ? theme.positive : theme.negative}
              textAnchor="middle"
            >
              {bar.net >= 0 ? '+' : '−'}
              {axisLabel(Math.abs(bar.net)).replace('-', '')}
            </SvgText>
          </React.Fragment>
        ))}

        {/* Línea base (0) */}
        <Line x1={PAD_L} y1={baseline} x2={WIDTH - PAD_R} y2={baseline} stroke={theme.text} strokeOpacity={0.55} strokeWidth={1} />

        {/* Eje de meses */}
        {xLabels.map((label, i) => (
          <SvgText key={`x-${i}`} x={label.x} y={HEIGHT - 9} fontSize={10} fill={theme.textMuted} textAnchor="middle">
            {label.text}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    minHeight: 140,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  card: { borderRadius: 16, borderWidth: 1, padding: 12 },
});
