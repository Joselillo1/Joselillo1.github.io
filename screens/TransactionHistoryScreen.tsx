import React, { useMemo, useState } from 'react';
import { FlatList, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MainTabsScreenProps } from '../navigation/types';
import { useTransactionsStore } from '../hooks/useTransactionsStore';
import { TransactionListItem } from '../components/History/TransactionListItem';
import { useActionSheet } from '../components/Shared/ActionSheet';
import { formatDate } from '../services/format';
import { useTheme } from '../components/theme';
import { TransactionType } from '../models/Transaction';

type Props = MainTabsScreenProps<'History'>;

type TypeFilter = 'todas' | TransactionType;

export function TransactionHistoryScreen({ navigation }: Props) {
  const theme = useTheme();
  const { transactions, deleteTransaction } = useTransactionsStore();
  const { showActionSheet } = useActionSheet();

  const [tickerQuery, setTickerQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todas');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [pickerOpen, setPickerOpen] = useState<'from' | 'to' | null>(null);

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => (tickerQuery.trim() ? t.tickerSymbol.toLowerCase().includes(tickerQuery.trim().toLowerCase()) : true))
      .filter((t) => (typeFilter === 'todas' ? true : t.type === typeFilter))
      .filter((t) => (fromDate ? t.date.getTime() >= fromDate.getTime() : true))
      .filter((t) => (toDate ? t.date.getTime() <= toDate.getTime() : true))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions, tickerQuery, typeFilter, fromDate, toDate]);

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

  const onTransactionPress = (id: string, symbol: string) => {
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <Text style={[styles.title, { color: theme.text }]}>Historial</Text>

      <TextInput
        value={tickerQuery}
        onChangeText={setTickerQuery}
        placeholder="Filtrar por ticker (ej. AAPL)"
        placeholderTextColor={theme.textMuted}
        autoCapitalize="characters"
        style={[styles.search, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
        returnKeyType="search"
        onSubmitEditing={() => Keyboard.dismiss()}
      />

      <View style={styles.filterRow}>
        {(['todas', 'compra', 'venta'] as TypeFilter[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => setTypeFilter(f)}
            style={[
              styles.chip,
              { borderColor: theme.border, backgroundColor: typeFilter === f ? theme.primary : 'transparent' },
            ]}
          >
            <Text style={{ color: typeFilter === f ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>
              {f === 'todas' ? 'Todas' : f === 'compra' ? 'Compras' : 'Ventas'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setPickerOpen('from')}
          style={[styles.dateChip, { borderColor: theme.border }]}
        >
          <Text style={{ color: theme.text, fontSize: 12 }}>Desde: {fromDate ? formatDate(fromDate) : '—'}</Text>
        </Pressable>
        <Pressable onPress={() => setPickerOpen('to')} style={[styles.dateChip, { borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontSize: 12 }}>Hasta: {toDate ? formatDate(toDate) : '—'}</Text>
        </Pressable>
        {(fromDate || toDate) && (
          <Pressable
            onPress={() => {
              setFromDate(null);
              setToDate(null);
            }}
            style={[styles.dateChip, { borderColor: theme.border }]}
          >
            <Text style={{ color: theme.negative, fontSize: 12 }}>Limpiar</Text>
          </Pressable>
        )}
      </View>

      {pickerOpen && (
        <DateTimePicker
          value={(pickerOpen === 'from' ? fromDate : toDate) ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={new Date()}
          onChange={(_event, selected) => {
            if (Platform.OS !== 'ios') setPickerOpen(null);
            if (selected) {
              if (pickerOpen === 'from') setFromDate(selected);
              else setToDate(selected);
            }
          }}
        />
      )}
      {pickerOpen === 'from' && Platform.OS === 'ios' && (
        <Pressable onPress={() => setPickerOpen(null)} style={styles.doneButton}>
          <Text style={{ color: theme.primary, fontWeight: '700' }}>Listo</Text>
        </Pressable>
      )}
      {pickerOpen === 'to' && Platform.OS === 'ios' && (
        <Pressable onPress={() => setPickerOpen(null)} style={styles.doneButton}>
          <Text style={{ color: theme.primary, fontWeight: '700' }}>Listo</Text>
        </Pressable>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => (
          <TransactionListItem transaction={item} showTicker onPress={() => onTransactionPress(item.id, item.tickerSymbol)} />
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textMuted }]}>No hay transacciones con estos filtros.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 12 },
  search: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 10 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  dateChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  doneButton: { alignSelf: 'flex-end', marginBottom: 8 },
  list: { flex: 1 },
  listContent: { paddingBottom: 40, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
