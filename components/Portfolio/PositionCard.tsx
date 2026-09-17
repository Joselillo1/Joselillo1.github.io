import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PositionSummary } from '../../models/PositionSummary';
import { formatQuantity } from '../../services/format';
import { CurrencyText, PercentageText } from '../Shared/CurrencyText';
import { StockLogo } from '../Shared/StockLogo';
import { useTheme } from '../theme';

interface Props {
  position: PositionSummary;
  onPress: () => void;
}

export function PositionCard({ position, onPress }: Props) {
  const theme = useTheme();
  const { stock, quantityHeld, currentInvestment, realizedPnL, unrealizedPnL, returnPercentage } = position;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.identity}>
          <StockLogo symbol={stock.symbol} size={32} />
          <View>
            <Text style={[styles.symbol, { color: theme.text }]}>{stock.symbol}</Text>
            <Text style={[styles.name, { color: theme.textMuted }]} numberOfLines={1}>
              {stock.name}
            </Text>
          </View>
        </View>
        {returnPercentage !== undefined && (
          <PercentageText value={returnPercentage} signed style={styles.returnPct} />
        )}
      </View>

      <View style={styles.row}>
        <View>
          <Text style={[styles.label, { color: theme.textMuted }]}>Cantidad</Text>
          <Text style={[styles.value, { color: theme.text }]}>{formatQuantity(quantityHeld)}</Text>
        </View>
        <View>
          <Text style={[styles.label, { color: theme.textMuted }]}>Invertido</Text>
          <CurrencyText value={currentInvestment} style={styles.value} />
        </View>
        <View>
          <Text style={[styles.label, { color: theme.textMuted }]}>P&L realizada</Text>
          <CurrencyText value={realizedPnL} signed style={styles.value} />
        </View>
        {unrealizedPnL !== undefined && (
          <View>
            <Text style={[styles.label, { color: theme.textMuted }]}>P&L no realizada</Text>
            <CurrencyText value={unrealizedPnL} signed style={styles.value} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  symbol: { fontSize: 17, fontWeight: '700' },
  name: { fontSize: 13, maxWidth: 190 },
  returnPct: { fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 11, marginBottom: 2 },
  value: { fontSize: 13, fontWeight: '600' },
});
