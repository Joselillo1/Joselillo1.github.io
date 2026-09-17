import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RootStackScreenProps } from '../navigation/types';
import { useStockPosition } from '../hooks/useStockPosition';
import { useTransactionsStore } from '../hooks/useTransactionsStore';
import { InvestmentChart } from '../components/StockDetail/InvestmentChart';
import { TransactionListItem } from '../components/History/TransactionListItem';
import { CurrencyText, PercentageText } from '../components/Shared/CurrencyText';
import { StockLogo } from '../components/Shared/StockLogo';
import { useActionSheet } from '../components/Shared/ActionSheet';
import { formatCurrency, formatQuantity } from '../services/format';
import { useTheme } from '../components/theme';
import { PrimaryButton, SecondaryButton } from '../components/Shared/Buttons';

type Props = RootStackScreenProps<'StockDetail'>;

export function StockDetailScreen({ route, navigation }: Props) {
  const { symbol } = route.params;
  const theme = useTheme();
  const { position, history } = useStockPosition(symbol);
  const { deleteTransaction } = useTransactionsStore();
  const { showActionSheet } = useActionSheet();

  const confirmDelete = (id: string) => {
    showActionSheet({
      title: 'Eliminar transacción',
      message: '¿Seguro que quieres eliminarla? Esta acción no se puede deshacer.',
      options: [
        { label: 'Eliminar', style: 'destructive', onPress: () => deleteTransaction(id) },
        { label: 'Cancelar', style: 'cancel' },
      ],
    });
  };

  const onTransactionPress = (id: string) => {
    showActionSheet({
      title: 'Transacción',
      message: '¿Qué quieres hacer?',
      options: [
        { label: 'Editar', onPress: () => navigation.navigate('TransactionForm', { symbol, transactionId: id }) },
        { label: 'Eliminar', style: 'destructive', onPress: () => confirmDelete(id) },
        { label: 'Cancelar', style: 'cancel' },
      ],
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <View style={styles.identity}>
        <StockLogo symbol={position.stock.symbol} size={52} />
        <View style={styles.identityText}>
          <Text style={[styles.symbol, { color: theme.text }]}>{position.stock.symbol}</Text>
          <Text style={[styles.name, { color: theme.textMuted }]}>{position.stock.name}</Text>
        </View>
      </View>
      <Text style={[styles.meta, { color: theme.textMuted }]}>
        {position.stock.sector} · {position.stock.exchange}
      </Text>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.statRow}>
          <View>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>En posición</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{formatQuantity(position.quantityHeld)}</Text>
          </View>
          <View>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Costo promedio</Text>
            <CurrencyText value={position.averageCostBasis} style={styles.statValue} />
          </View>
        </View>
        <View style={styles.statRow}>
          <View>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Inversión actual</Text>
            <CurrencyText value={position.currentInvestment} style={styles.statValue} />
          </View>
          {position.returnPercentage !== undefined && (
            <View>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Rentabilidad</Text>
              <PercentageText value={position.returnPercentage} signed style={styles.statValue} />
            </View>
          )}
        </View>

        <View style={[styles.pnlBlock, { borderColor: 'rgba(127,127,127,0.25)' }]}>
          <View style={styles.pnlLine}>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Ganancias</Text>
            <Text style={[styles.pnlValue, { color: theme.positive }]}>
              +{formatCurrency(position.grossRealizedGains)}
            </Text>
          </View>
          {position.grossRealizedLosses.lessThan(0) && (
            <View style={styles.pnlLine}>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Pérdidas</Text>
              <Text style={[styles.pnlValue, { color: theme.negative }]}>
                −{formatCurrency(position.grossRealizedLosses.abs())}
              </Text>
            </View>
          )}
          {position.realizedFees.greaterThan(0) && (
            <View style={styles.pnlLine}>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>Comisiones</Text>
              <Text style={[styles.pnlValue, { color: theme.negative }]}>
                −{formatCurrency(position.realizedFees)}
              </Text>
            </View>
          )}
          <View style={[styles.pnlLine, styles.pnlTotalLine, { borderColor: 'rgba(127,127,127,0.25)' }]}>
            <Text style={[styles.pnlTotalLabel, { color: theme.text }]}>P&L neta</Text>
            <CurrencyText value={position.realizedPnL} signed style={styles.pnlTotalValue} />
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Registrar compra"
          onPress={() => navigation.navigate('TransactionForm', { symbol, initialType: 'compra' })}
        />
        <SecondaryButton
          label="Registrar venta"
          onPress={() => navigation.navigate('TransactionForm', { symbol, initialType: 'venta' })}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Evolución de la inversión</Text>
      <InvestmentChart history={history} />

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Historial de transacciones</Text>
      {history.length === 0 ? (
        <Text style={{ color: theme.textMuted }}>Aún no hay transacciones para esta acción.</Text>
      ) : (
        [...history]
          .reverse()
          .map((tx) => (
            <TransactionListItem key={tx.id} transaction={tx} onPress={() => onTransactionPress(tx.id)} />
          ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  identityText: { flexShrink: 1 },
  symbol: { fontSize: 26, fontWeight: '800' },
  name: { fontSize: 15, marginTop: 2 },
  meta: { fontSize: 12, marginTop: 4, marginBottom: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 12, marginBottom: 2 },
  statValue: { fontSize: 17, fontWeight: '700' },
  pnlBlock: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 6 },
  pnlLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pnlValue: { fontSize: 15, fontWeight: '700' },
  pnlTotalLine: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, marginTop: 2 },
  pnlTotalLabel: { fontSize: 13, fontWeight: '800' },
  pnlTotalValue: { fontSize: 17, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 10 },
});
