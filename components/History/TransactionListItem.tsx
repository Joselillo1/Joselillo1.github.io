import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Transaction } from '../../models/Transaction';
import { formatDate, formatQuantity } from '../../services/format';
import { CurrencyText } from '../Shared/CurrencyText';
import { useTheme } from '../theme';

interface Props {
  transaction: Transaction;
  showTicker?: boolean;
  onPress: () => void;
}

export function TransactionListItem({ transaction, showTicker, onPress }: Props) {
  const theme = useTheme();
  const isBuy = transaction.type === 'compra';
  const badgeColor = isBuy ? theme.positive : theme.negative;
  const total = transaction.quantity.times(transaction.pricePerShare);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <Text style={styles.badgeText}>{isBuy ? 'C' : 'V'}</Text>
      </View>
      <View style={styles.middle}>
        <Text style={[styles.title, { color: theme.text }]}>
          {isBuy ? 'Compra' : 'Venta'} {showTicker ? `· ${transaction.tickerSymbol}` : ''}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {formatQuantity(transaction.quantity)} unidades · {formatDate(transaction.date)}
        </Text>
      </View>
      <CurrencyText value={total} style={styles.amount} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  middle: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '700' },
});
