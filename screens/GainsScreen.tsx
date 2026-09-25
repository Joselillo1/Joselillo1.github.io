import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Decimal from 'decimal.js';
import { useMonthlyGains } from '../hooks/useMonthlyGains';
import { GainsBarChart } from '../components/Gains/GainsBarChart';
import { CurrencyText, PercentageText } from '../components/Shared/CurrencyText';
import { INITIAL_CAPITAL } from '../services/investmentConfig';
import { formatCurrency, formatMonthYear } from '../services/format';
import { useTheme } from '../components/theme';

const ZERO = new Decimal(0);

export function GainsScreen() {
  const theme = useTheme();
  const { months } = useMonthlyGains();

  const current = months[months.length - 1];
  const previous = months[months.length - 2];
  const accumulatedNet = months.reduce((sum, m) => sum.plus(m.net), ZERO);
  const totalBought = INITIAL_CAPITAL;
  const accumulatedPct = totalBought.greaterThan(0) ? accumulatedNet.dividedBy(totalBought).times(100) : undefined;

  // Del más reciente al más antiguo, como máximo 6 meses en el detalle.
  const detail = [...months].reverse().slice(0, 6);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Balance mensual</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Ganancia y pérdida de ventas cerradas, ingresos, comisiones y gastos extra, mes a mes — el mismo total que ves en Portafolio.
        </Text>

        <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
                {current ? formatMonthYear(current.year, current.month) : 'Este mes'}
              </Text>
              <CurrencyText value={current?.net ?? ZERO} signed style={styles.summaryValue} />
            </View>
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
                {previous ? formatMonthYear(previous.year, previous.month) : 'Mes anterior'}
              </Text>
              <CurrencyText value={previous?.net ?? ZERO} signed style={styles.summaryValueSmall} />
            </View>
          </View>
          <View style={[styles.accumRow, { borderColor: 'rgba(127,127,127,0.25)' }]}>
            <Text style={[styles.summaryLabel, { color: theme.textMuted, marginBottom: 0 }]}>Acumulado total</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <CurrencyText value={accumulatedNet} signed style={styles.accumValue} />
              {accumulatedPct !== undefined && (
                <PercentageText value={accumulatedPct} signed style={styles.monthPct} />
              )}
              {totalBought.greaterThan(0) && (
                <Text style={[styles.monthPct, { color: theme.textMuted, fontWeight: '400' }]}>
                  sobre {formatCurrency(totalBought)} (capital inicial)
                </Text>
              )}
            </View>
          </View>
        </View>

        <GainsBarChart months={months} />
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.positive }]} />
            <Text style={[styles.legendText, { color: theme.textMuted }]}>Ganancia del mes</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.negative }]} />
            <Text style={[styles.legendText, { color: theme.textMuted }]}>Pérdida del mes</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={[styles.legendText, { color: theme.textMuted }]}>
              El número arriba de cada mes es el neto (ganancia − pérdida + ingresos − comisiones − gastos extras).
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Detalle por mes</Text>
        {detail.map((m) => (
          <View key={`${m.year}-${m.month}`} style={[styles.monthCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.monthTitle, { color: theme.text }]}>{formatMonthYear(m.year, m.month)}</Text>
            <View style={styles.monthRow}>
              <Text style={[styles.monthLabel, { color: theme.textMuted }]}>Ganancia</Text>
              <CurrencyText value={m.gains} signed style={styles.monthValue} />
            </View>
            <View style={styles.monthRow}>
              <Text style={[styles.monthLabel, { color: theme.textMuted }]}>Pérdida</Text>
              {m.losses.lessThan(0) ? (
                <CurrencyText value={m.losses} signed style={styles.monthValue} />
              ) : (
                <Text style={[styles.monthValue, { color: theme.textMuted }]}>$0,00</Text>
              )}
            </View>
            {m.income.greaterThan(0) && (
              <View style={styles.monthRow}>
                <Text style={[styles.monthLabel, { color: theme.textMuted }]}>Ingresos (dividendos)</Text>
                <Text style={[styles.monthValue, { color: theme.positive }]}>+{formatCurrency(m.income)}</Text>
              </View>
            )}
            {m.fees.greaterThan(0) && (
              <View style={styles.monthRow}>
                <Text style={[styles.monthLabel, { color: theme.textMuted }]}>Comisiones + Gastos extras</Text>
                <Text style={[styles.monthValue, { color: theme.negative }]}>−{formatCurrency(m.fees)}</Text>
              </View>
            )}
            <View style={[styles.monthRow, styles.monthNetRow, { borderColor: 'rgba(127,127,127,0.25)' }]}>
              <Text style={[styles.monthLabel, { color: theme.text, fontWeight: '700' }]}>Neto</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <CurrencyText value={m.net} signed style={styles.monthNetValue} />
                {m.netPercentage !== undefined && (
                  <PercentageText value={m.netPercentage} signed style={styles.monthPct} />
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  monthPct: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: 16 },
  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryCol: { flexShrink: 1 },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: '800' },
  summaryValueSmall: { fontSize: 18, fontWeight: '700' },
  accumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accumValue: { fontSize: 15, fontWeight: '700' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  monthCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  monthTitle: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  monthLabel: { fontSize: 13, flexShrink: 1, marginRight: 8 },
  monthValue: { fontSize: 14, fontWeight: '700' },
  monthNetRow: { marginTop: 4, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  monthNetValue: { fontSize: 15, fontWeight: '800' },
});
