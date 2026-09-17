import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ExpenseEntry, EXPENSE_CATEGORY_LABELS } from '../../models/ExpenseEntry';
import { formatCurrency, formatDate } from '../../services/format';
import { useTheme } from '../theme';

interface Props {
  expense: ExpenseEntry;
  onPress: () => void;
}

export function ExpenseListItem({ expense, onPress }: Props) {
  const theme = useTheme();
  const title = expense.description.trim() || EXPENSE_CATEGORY_LABELS[expense.category];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={styles.middle}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {EXPENSE_CATEGORY_LABELS[expense.category]} · {formatDate(expense.date)}
        </Text>
      </View>
      <Text style={[styles.amount, { color: theme.negative }]}>−{formatCurrency(expense.amount)}</Text>
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
