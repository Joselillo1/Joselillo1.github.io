import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Decimal from 'decimal.js';
import { RootStackScreenProps } from '../navigation/types';
import { useIncomeStore } from '../hooks/useIncomeStore';
import { useActionSheet } from '../components/Shared/ActionSheet';
import { IncomeListItem } from '../components/Income/IncomeListItem';
import { PrimaryButton } from '../components/Shared/Buttons';
import { formatCurrency } from '../services/format';
import { useTheme } from '../components/theme';

type Props = RootStackScreenProps<'Income'>;

const ZERO = new Decimal(0);

export function IncomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { income, deleteIncome } = useIncomeStore();
  const { showActionSheet } = useActionSheet();

  const sorted = useMemo(() => [...income].sort((a, b) => b.date.getTime() - a.date.getTime()), [income]);

  const totalAllTime = useMemo(() => income.reduce((sum, i) => sum.plus(i.amount), ZERO), [income]);
  const totalThisMonth = useMemo(() => {
    const now = new Date();
    return income
      .filter((i) => i.date.getFullYear() === now.getFullYear() && i.date.getMonth() === now.getMonth())
      .reduce((sum, i) => sum.plus(i.amount), ZERO);
  }, [income]);

  const confirmDelete = (id: string) => {
    showActionSheet({
      title: 'Eliminar ingreso',
      message: '¿Seguro que quieres eliminarlo? Esta acción no se puede deshacer.',
      options: [
        { label: 'Eliminar', style: 'destructive', onPress: () => deleteIncome(id) },
        { label: 'Cancelar', style: 'cancel' },
      ],
    });
  };

  const onIncomePress = (id: string) => {
    showActionSheet({
      title: 'Ingreso',
      message: '¿Qué quieres hacer?',
      options: [
        { label: 'Editar', onPress: () => navigation.navigate('IncomeForm', { incomeId: id }) },
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
              Dinero recibido que no viene de vender una posición — dividendos, intereses, etc. Suma a tu
              ganancia neta del portafolio.
            </Text>

            <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Este mes</Text>
                <Text style={[styles.summaryValue, { color: theme.positive }]}>+{formatCurrency(totalThisMonth)}</Text>
              </View>
              <View>
                <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Acumulado</Text>
                <Text style={[styles.summaryValueSmall, { color: theme.positive }]}>
                  +{formatCurrency(totalAllTime)}
                </Text>
              </View>
            </View>

            <PrimaryButton label="+ Agregar ingreso" onPress={() => navigation.navigate('IncomeForm', {})} />
          </>
        }
        renderItem={({ item }) => (
          <IncomeListItem income={item} onPress={() => onIncomePress(item.id)} />
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textMuted }]}>
            Todavía no registraste ningún ingreso.
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
