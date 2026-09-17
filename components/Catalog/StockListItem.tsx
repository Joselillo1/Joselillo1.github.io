import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StockCatalogItem } from '../../models/StockCatalogItem';
import { StockLogo } from '../Shared/StockLogo';
import { useTheme } from '../theme';

interface Props {
  stock: StockCatalogItem;
  onPress: () => void;
}

export function StockListItem({ stock, onPress }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <StockLogo symbol={stock.symbol} size={34} />
      <View style={styles.left}>
        <Text style={[styles.symbol, { color: theme.text }]}>{stock.symbol}</Text>
        <Text style={[styles.name, { color: theme.textMuted }]} numberOfLines={1}>
          {stock.name}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.sector, { color: theme.text }]}>{stock.sector}</Text>
        <Text style={[styles.exchange, { color: theme.textMuted }]}>{stock.exchange}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  left: { flex: 1, marginRight: 12 },
  symbol: { fontSize: 15, fontWeight: '700' },
  name: { fontSize: 12, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  sector: { fontSize: 12, fontWeight: '600' },
  exchange: { fontSize: 11, marginTop: 2 },
});
