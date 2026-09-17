import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Decimal from 'decimal.js';
import { RootStackScreenProps } from '../navigation/types';
import { useExpensesStore } from '../hooks/useExpensesStore';
import { useActionSheet } from '../components/Shared/ActionSheet';
import { ExpenseListItem } from '../components/Expenses/ExpenseListItem';
import { PrimaryButton } from '../components/Shared/Buttons';
import { formatCurrency } from '../services/format';
import { useTheme } from '../components/theme';

type Props = RootStackScreenProps<'Expenses'>;

const ZERO = new Decimal(0);

export function ExpensesScreen({ navigation }: Props) {
  const theme = useTheme();
  const { expenses, deleteExpense } = useExpensesStore();
  const { showActionSheet } = useActionSheet();

  const sorted = useMemo(() => [...expenses].sort((a, b) => b.date.getTime() - a.date.getTime()), [expenses]);

  const totalAllTime = useMemo(() => expenses.reduce((sum, e) => sum.plus(e.amount), ZERO), [expenses]);
  const totalThisMonth = useMemo(() => {
    const now = new Date();
    return expenses
      .filter((e) => e.date.getFullYear() === now.getFullYear() && e.date.getMonth() === now.getMonth())
      .reduce((sum, e) => sum.plus(e.amount), ZERO);
  }, [expenses]);

  const confirmDelete = (id: string) => {
    showActionSheet({
      title: 'Eliminar gasto',
      message: '¿Seguro que quieres eliminarlo? Esta acción no se puede deshacer.',
      options: [
        { label: 'Eliminar', style: 'destructive', onPress: () => deleteExpense(id) },
        { label: 'Cancelar', style: 'cancel' },
      ],
    });
  };

  const onExpensePress = (id: string) => {
    showActionSheet({
      title: 'Gasto extra',
      message: '¿Qué quieres hacer?',
      options: [
        { label: 'Editar', onPress: () => navigation.navigate('ExpenseForm', { expenseId: id }) },
        { label: 'Eliminar', style: 'destructive', onPress: () => confirmDelete(id) },
        { label: 'Cancelar', style: 'cancel' },
      ],
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['left', 'right']}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Costos de mantener tu operación de inversión — cuota del banco, del broker, plataformas de
              noticias/datos, etc. No afectan el costo ni la ganancia de ninguna acción.
            </Text>

            <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Este mes</Text>
                <Text style={[styles.summaryValue, { color: theme.negative }]}>
                  −{formatCurrency(totalThisMonth)}
                </Text>
              </View>
              <View>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Acumulado</Text>
                <Text style={[styles.summaryValueSmall, { color: theme.negative }]}>
                  −{formatCurrency(totalAllTime)}
                </Text>
              </View>
            </View>

            <PrimaryButton label="+ Agregar gasto" onPress={() => navigation.navigate('ExpenseForm', {})} />
          </>
        }
        renderItem={({ item }) => (
          <ExpenseListItem expense={item} onPress={() => onExpensePress(item.id)} />
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textMuted }]}>
            Todavía no registraste ningún gasto extra.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  subtitle: { fontSize: 13, lineHeight: 18, marginBottom: 16 },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: '800' },
  summaryValueSmall: { fontSize: 18, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14, lineHeight: 20 },
});
