import React, { useEffect, useMemo, useRef } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Decimal from 'decimal.js';
import { useFocusEffect } from '@react-navigation/native';
import { MainTabsScreenProps } from '../navigation/types';
import { useStockCatalog } from '../hooks/useStockCatalog';
import { useExpensesStore } from '../hooks/useExpensesStore';
import { useIncomeStore } from '../hooks/useIncomeStore';
import { StockListItem } from '../components/Catalog/StockListItem';
import { formatCurrency } from '../services/format';
import { useTheme } from '../components/theme';

type Props = MainTabsScreenProps<'Catalog'>;

const ZERO = new Decimal(0);

export function StockCatalogScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const { query, setQuery, results } = useStockCatalog();
  const { expenses } = useExpensesStore();
  const { income } = useIncomeStore();
  const inputRef = useRef<TextInput>(null);

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum.plus(e.amount), ZERO), [expenses]);
  const totalIncome = useMemo(() => income.reduce((sum, i) => sum.plus(i.amount), ZERO), [income]);

  // Al entrar desde la lupa del Portafolio (autoFocus: true), abre el teclado de una
  // vez para buscar. Se limpia el parámetro para que no vuelva a enfocar solo por
  // tocar la pestaña Catálogo normalmente.
  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.autoFocus) {
        inputRef.current?.focus();
        navigation.setParams({ autoFocus: undefined });
      }
    }, [route.params?.autoFocus, navigation])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <Text style={[styles.title, { color: theme.text }]}>Catálogo</Text>

      <View style={styles.quickRow}>
        <Pressable
          onPress={() => navigation.navigate('Income')}
          style={[styles.quickCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Text style={[styles.quickLabel, { color: theme.textMuted }]}>Ingresos</Text>
          <Text style={[styles.quickValue, { color: theme.positive }]}>+{formatCurrency(totalIncome)}</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate('Expenses')}
          style={[styles.quickCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Text style={[styles.quickLabel, { color: theme.textMuted }]}>Gastos extras</Text>
          <Text style={[styles.quickValue, { color: theme.negative }]}>−{formatCurrency(totalExpenses)}</Text>
        </Pressable>
      </View>

      <TextInput
        ref={inputRef}
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por símbolo, nombre o sector"
        placeholderTextColor={theme.textMuted}
        style={[styles.search, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={() => Keyboard.dismiss()}
      />
      <FlatList
        data={query.trim() ? results : []}
        keyExtractor={(item) => item.symbol}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => (
          <StockListItem stock={item} onPress={() => navigation.navigate('StockDetail', { symbol: item.symbol })} />
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textMuted }]}>
            {query.trim()
              ? 'No se encontraron acciones con ese criterio.'
              : 'Escribe el símbolo o nombre de una acción o criptomoneda para buscarla.'}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 12 },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  quickCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12 },
  quickLabel: { fontSize: 12, marginBottom: 4 },
  quickValue: { fontSize: 16, fontWeight: '800' },
  search: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 8 },
  list: { flex: 1 },
  listContent: { paddingBottom: 40, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14, lineHeight: 20, paddingHorizontal: 20 },
});
