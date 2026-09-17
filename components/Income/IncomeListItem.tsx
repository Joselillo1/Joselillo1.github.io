import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IncomeEntry, INCOME_CATEGORY_LABELS } from '../../models/IncomeEntry';
import { formatCurrency, formatDate } from '../../services/format';
import { useTheme } from '../theme';

interface Props {
  income: IncomeEntry;
  onPress: () => void;
}

export function IncomeListItem({ income, onPress }: Props) {
  const theme = useTheme();
  const title = income.description.trim() || INCOME_CATEGORY_LABELS[income.category];
  const subtitle = income.symbol
    ? `${INCOME_CATEGORY_LABELS[income.category]} · ${income.symbol} · ${formatDate(income.date)}`
    : `${INCOME_CATEGORY_LABELS[income.category]} · ${formatDate(income.date)}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={styles.middle}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      </View>
      <Text style={[styles.amount, { color: theme.positive }]}>+{formatCurrency(income.amount)}</Text>
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
  middle: { flex: 1, marginRight: 10 },
  title: { fontSize: 14, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '700' },
});
