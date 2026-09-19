import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Decimal from 'decimal.js';
import { MainTabsScreenProps } from '../navigation/types';
import { usePortfolio } from '../hooks/usePortfolio';
import { useGainsTimeline } from '../hooks/useGainsTimeline';
import { useTransactionsStore } from '../hooks/useTransactionsStore';
import { useExpensesStore } from '../hooks/useExpensesStore';
import { useIncomeStore } from '../hooks/useIncomeStore';
import { PositionCard } from '../components/Portfolio/PositionCard';
import { CurrencyText, PercentageText } from '../components/Shared/CurrencyText';
import { formatCurrency } from '../services/format';
import { useTheme } from '../components/theme';
import { PositionSummary } from '../models/PositionSummary';

type Props = MainTabsScreenProps<'Portfolio'>;

type SortKey = 'nombre' | 'ganancia' | 'invertido';

function sortPositions(positions: PositionSummary[], key: SortKey): PositionSummary[] {
  const copy = [...positions];
  switch (key) {
    case 'nombre':
      return copy.sort((a, b) => a.stock.name.localeCompare(b.stock.name));
    case 'ganancia':
      return copy.sort((a, b) => (b.returnPercentage?.toNumber() ?? -Infinity) - (a.returnPercentage?.toNumber() ?? -Infinity));
    case 'invertido':
      return copy.sort((a, b) => b.currentInvestment.minus(a.currentInvestment).toNumber());
  }
}

export function PortfolioScreen({ navigation }: Props) {
  const theme = useTheme();
  const { portfolio, loading } = usePortfolio();
  const { refresh } = useTransactionsStore();
  const { timeline } = useGainsTimeline();
  const { expenses } = useExpensesStore();
  const { income } = useIncomeStore();
  const [sortKey, setSortKey] = useState<SortKey>('invertido');

  const sorted = useMemo(() => sortPositions(portfolio.positions, sortKey), [portfolio.positions, sortKey]);

  const lastPoint = timeline[timeline.length - 1];
  const isToday = lastPoint && lastPoint.date.toDateString() === new Date().toDateString();
  const todayPnL = isToday ? lastPoint.dailyPnL : undefined;
  const todayGains = isToday ? lastPoint.dailyGains : undefined;
  const todayLosses = isToday ? lastPoint.dailyLosses : undefined;

  // Desglose del P&L: ganancias + pérdidas (los dos lados del subtotal bruto, por
  // separado) + ingresos (dividendos) − (comisiones + gastos extra) = total neto.
  // Ni los gastos extra ni los ingresos son de ningún ticker en particular, así que
  // solo se suman/restan acá, a nivel portafolio.
  const totalExtraExpenses = expenses.reduce((sum, e) => sum.plus(e.amount), new Decimal(0));
  const totalIncome = income.reduce((sum, i) => sum.plus(i.amount), new Decimal(0));
  const pnlGains = portfolio.totalGrossRealizedGains;
  const pnlLosses = portfolio.totalGrossRealizedLosses;
  const pnlFeesAndExpenses = portfolio.totalRealizedFees.plus(totalExtraExpenses);
  const pnlNet = portfolio.totalRealizedPnL
    .plus(portfolio.totalUnrealizedPnL ?? 0)
    .plus(totalIncome)
    .minus(totalExtraExpenses);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.stock.symbol}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <Text style={[styles.title, { color: theme.text }]}>Portafolio</Text>

            <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Valor invertido total</Text>
              <CurrencyText value={portfolio.totalInvested} style={styles.summaryValue} />

              <View style={styles.pnlBlock}>
                <View style={styles.pnlLine}>
                  <Text style={[styles.summaryLabel, { color: theme.textMuted, marginBottom: 0 }]}>Ganancias</Text>
                  <Text style={[styles.pnlValue, { color: theme.positive }]}>+{formatCurrency(pnlGains)}</Text>
                </View>
                {pnlLosses.lessThan(0) && (
                  <View style={styles.pnlLine}>
                    <Text style={[styles.summaryLabel, { color: theme.textMuted, marginBottom: 0 }]}>Pérdidas</Text>
                    <Text style={[styles.pnlValue, { color: theme.negative }]}>
                      −{formatCurrency(pnlLosses.abs())}
                    </Text>
                  </View>
                )}
                {totalIncome.greaterThan(0) && (
                  <View style={styles.pnlLine}>
                    <Text style={[styles.summaryLabel, { color: theme.textMuted, marginBottom: 0 }]}>
                      Ingresos (dividendos)
                    </Text>
                    <Text style={[styles.pnlValue, { color: theme.positive }]}>+{formatCurrency(totalIncome)}</Text>
                  </View>
                )}
                {pnlFeesAndExpenses.greaterThan(0) && (
                  <View style={styles.pnlLine}>
                    <Text style={[styles.summaryLabel, { color: theme.textMuted, marginBottom: 0 }]}>
                      Comisiones + Gastos extras
                    </Text>
                    <Text style={[styles.pnlValue, { color: theme.negative }]}>
                      −{formatCurrency(pnlFeesAndExpenses)}
                    </Text>
                  </View>
                )}
                <View style={[styles.pnlLine, styles.pnlTotalLine, { borderColor: 'rgba(127,127,127,0.25)' }]}>
                  <Text style={[styles.pnlTotalLabel, { color: theme.text }]}>Total neto</Text>
                  <CurrencyText value={pnlNet} signed style={styles.pnlTotalValue} />
                </View>
              </View>

              <View style={styles.summaryRow}>
                {portfolio.totalReturnPercentage !== undefined && (
                  <View>
                    <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Rentabilidad</Text>
                    <PercentageText value={portfolio.totalReturnPercentage} signed style={styles.summarySecondary} />
                  </View>
                )}
                <View>
                  <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Hoy</Text>
                  {todayPnL !== undefined ? (
                    <View style={styles.todayBlock}>
                      <View style={styles.todayRow}>
                        <Text style={[styles.todayLabel, { color: theme.textMuted }]}>Ganancia</Text>
                        <Text style={[styles.todayValue, { color: theme.positive }]}>
                          +{formatCurrency(todayGains as Decimal)}
                        </Text>
                      </View>
                      {(todayLosses as Decimal).lessThan(0) && (
                        <View style={styles.todayRow}>
                          <Text style={[styles.todayLabel, { color: theme.textMuted }]}>Pérdida</Text>
                          <Text style={[styles.todayValue, { color: theme.negative }]}>
                            −{formatCurrency((todayLosses as Decimal).abs())}
                          </Text>
                        </View>
                      )}
                      <View style={styles.todayRow}>
                        <Text style={[styles.todayLabel, { color: theme.text, fontWeight: '700' }]}>Total</Text>
                        <CurrencyText value={todayPnL} signed style={styles.todayTotalValue} />
                      </View>
                    </View>
                  ) : (
                    <Text style={[styles.summarySecondary, { color: theme.textMuted }]}>Sin cambios</Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.sortRow}>
              <View style={styles.sortChips}>
                {(['invertido', 'ganancia', 'nombre'] as SortKey[]).map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => setSortKey(key)}
                    style={[
                      styles.sortChip,
                      { borderColor: theme.border, backgroundColor: sortKey === key ? theme.primary : 'transparent' },
                    ]}
                  >
                    <Text style={{ color: sortKey === key ? '#fff' : theme.textMuted, fontSize: 12, fontWeight: '600' }}>
                      {key === 'invertido' ? 'Monto invertido' : key === 'ganancia' ? '% ganancia' : 'Nombre'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={() => navigation.navigate('Catalog', { autoFocus: true })}
                style={[styles.searchButton, { borderColor: theme.border, backgroundColor: theme.card }]}
              >
                <Text style={styles.searchIcon}>🔎</Text>
              </Pressable>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <PositionCard position={item} onPress={() => navigation.navigate('StockDetail', { symbol: item.stock.symbol })} />
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={[styles.empty, { color: theme.textMuted }]}>
              Todavía no tienes transacciones. Ve al Catálogo para registrar tu primera compra.
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 16 },
  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryValue: { fontSize: 30, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', gap: 24, marginTop: 16 },
  summarySecondary: { fontSize: 16, fontWeight: '700' },
  todayBlock: { marginTop: 2, gap: 1 },
  todayRow: { flexDirection: 'row', alignItems: 'center' },
  todayLabel: { fontSize: 11, minWidth: 58 },
  todayValue: { fontSize: 13, fontWeight: '700' },
  todayTotalValue: { fontSize: 14, fontWeight: '800' },
  pnlBlock: { marginTop: 16 },
  pnlLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  pnlValue: { fontSize: 15, fontWeight: '700' },
  pnlTotalLine: {
    marginTop: 4,
    paddingTop: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pnlTotalLabel: { fontSize: 13, fontWeight: '800' },
  pnlTotalValue: { fontSize: 18, fontWeight: '800' },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sortChips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sortChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  searchButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: { fontSize: 15 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14, lineHeight: 20 },
});
