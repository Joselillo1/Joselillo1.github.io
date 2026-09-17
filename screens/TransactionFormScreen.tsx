import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Decimal from 'decimal.js';
import { RootStackScreenProps } from '../navigation/types';
import { useTransactionsStore } from '../hooks/useTransactionsStore';
import { TransactionType } from '../models/Transaction';
import { formatDate } from '../services/format';
import { useTheme } from '../components/theme';
import { PrimaryButton } from '../components/Shared/Buttons';

type Props = RootStackScreenProps<'TransactionForm'>;

function parseDecimalInput(raw: string): Decimal | null {
  const normalized = raw.replace(',', '.').trim();
  if (normalized === '') return null;
  try {
    const value = new Decimal(normalized);
    return value.isFinite() ? value : null;
  } catch {
    return null;
  }
}

export function TransactionFormScreen({ route, navigation }: Props) {
  const { symbol, transactionId, initialType } = route.params;
  const theme = useTheme();
  const { transactions, addTransaction, updateTransaction } = useTransactionsStore();

  const editing = useMemo(
    () => (transactionId ? transactions.find((t) => t.id === transactionId) : undefined),
    [transactions, transactionId]
  );

  const [type, setType] = useState<TransactionType>(editing?.type ?? initialType ?? 'compra');
  const [quantity, setQuantity] = useState(editing ? editing.quantity.toString() : '');
  const [price, setPrice] = useState(editing ? editing.pricePerShare.toString() : '');
  const [fees, setFees] = useState(editing ? editing.fees.toString() : '');
  const [date, setDate] = useState(editing?.date ?? new Date());
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [showPicker, setShowPicker] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = editing !== undefined;

  const onSubmit = async () => {
    const parsedQuantity = parseDecimalInput(quantity);
    const parsedPrice = parseDecimalInput(price);
    const parsedFees = fees.trim() === '' ? new Decimal(0) : parseDecimalInput(fees);

    if (!parsedQuantity || !parsedPrice || !parsedFees) {
      setErrors(['Revisa que cantidad, precio y comisión sean números válidos.']);
      return;
    }

    setSubmitting(true);
    const input = {
      tickerSymbol: symbol,
      type,
      quantity: parsedQuantity,
      pricePerShare: parsedPrice,
      fees: parsedFees,
      date,
      notes: notes.trim() || undefined,
    };

    const result = isEditing
      ? await updateTransaction(editing.id, input)
      : await addTransaction(input);

    setSubmitting(false);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    navigation.goBack();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>
        {isEditing ? 'Editar transacción' : 'Nueva transacción'} · {symbol}
      </Text>

      <View style={styles.typeRow}>
        {(['compra', 'venta'] as TransactionType[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setType(t)}
            style={[
              styles.typeChip,
              { borderColor: theme.border, backgroundColor: type === t ? theme.primary : 'transparent' },
            ]}
          >
            <Text style={{ color: type === t ? '#fff' : theme.text, fontWeight: '700' }}>
              {t === 'compra' ? 'Compra' : 'Venta'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textMuted }]}>Cantidad</Text>
      <TextInput
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
      />

      <Text style={[styles.label, { color: theme.textMuted }]}>
        Precio unitario {type === 'compra' ? '(al que compraste)' : '(al que vendiste)'}
      </Text>
      <TextInput
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
      />

      <Text style={[styles.label, { color: theme.textMuted }]}>Comisión / fees (opcional)</Text>
      <TextInput
        value={fees}
        onChangeText={setFees}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
      />

      <Text style={[styles.label, { color: theme.textMuted }]}>Fecha</Text>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, justifyContent: 'center' }]}
      >
        <Text style={{ color: theme.text }}>{formatDate(date)}</Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={new Date()}
          onChange={(_event, selected) => {
            setShowPicker(Platform.OS === 'ios');
            if (selected) setDate(selected);
          }}
        />
      )}

      <Text style={[styles.label, { color: theme.textMuted }]}>Notas (opcional)</Text>
      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Ej. compra tras resultados trimestrales"
        placeholderTextColor={theme.textMuted}
        style={[styles.input, styles.notesInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
        multiline
      />

      {errors.length > 0 && (
        <View style={[styles.errorBox, { borderColor: theme.negative }]}>
          {errors.map((error) => (
            <Text key={error} style={[styles.errorText, { color: theme.negative }]}>
              {error}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.submitRow}>
        <PrimaryButton
          label={submitting ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Registrar transacción'}
          onPress={onSubmit}
          disabled={submitting}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  notesInput: { minHeight: 70, textAlignVertical: 'top' },
  errorBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 18 },
  errorText: { fontSize: 13, marginBottom: 4 },
  submitRow: { flexDirection: 'row', marginTop: 24 },
});
