import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Decimal from 'decimal.js';
import { RootStackScreenProps } from '../navigation/types';
import { useIncomeStore } from '../hooks/useIncomeStore';
import { INCOME_CATEGORIES, INCOME_CATEGORY_LABELS, IncomeCategory } from '../models/IncomeEntry';
import { formatDate } from '../services/format';
import { useTheme } from '../components/theme';
import { PrimaryButton } from '../components/Shared/Buttons';

type Props = RootStackScreenProps<'IncomeForm'>;

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

export function IncomeFormScreen({ route, navigation }: Props) {
  const { incomeId } = route.params;
  const theme = useTheme();
  const { income, addIncome, updateIncome } = useIncomeStore();

  const editing = useMemo(
    () => (incomeId ? income.find((i) => i.id === incomeId) : undefined),
    [income, incomeId]
  );
  const isEditing = editing !== undefined;

  const [category, setCategory] = useState<IncomeCategory>(editing?.category ?? 'dividendo');
  const [symbol, setSymbol] = useState(editing?.symbol ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [amount, setAmount] = useState(editing ? editing.amount.toString() : '');
  const [date, setDate] = useState(editing?.date ?? new Date());
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [showPicker, setShowPicker] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    const parsedAmount = parseDecimalInput(amount);
    if (!parsedAmount) {
      setErrors(['Revisa que el monto sea un número válido.']);
      return;
    }

    setSubmitting(true);
    const input = {
      category,
      symbol: symbol.trim() ? symbol.trim().toUpperCase() : undefined,
      description: description.trim(),
      amount: parsedAmount,
      date,
      notes: notes.trim() || undefined,
    };

    const result = isEditing ? await updateIncome(editing.id, input) : await addIncome(input);

    setSubmitting(false);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    navigation.goBack();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>{isEditing ? 'Editar ingreso' : 'Nuevo ingreso'}</Text>

      <Text style={[styles.label, { color: theme.textMuted }]}>Categoría</Text>
      <View style={styles.categoryRow}>
        {INCOME_CATEGORIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            style={[
              styles.categoryChip,
              { borderColor: theme.border, backgroundColor: category === c ? theme.primary : 'transparent' },
            ]}
          >
            <Text style={{ color: category === c ? '#fff' : theme.text, fontWeight: '600', fontSize: 13 }}>
              {INCOME_CATEGORY_LABELS[c]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textMuted }]}>Ticker (opcional)</Text>
      <TextInput
        value={symbol}
        onChangeText={setSymbol}
        placeholder="Ej. AAPL"
        placeholderTextColor={theme.textMuted}
        autoCapitalize="characters"
        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
      />

      <Text style={[styles.label, { color: theme.textMuted }]}>
        Descripción {category === 'otro' ? '' : '(opcional)'}
      </Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder={category === 'otro' ? 'Ej. reembolso del broker' : 'Ej. dividendo trimestral'}
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
      />

      <Text style={[styles.label, { color: theme.textMuted }]}>Monto</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
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
        placeholder="Ej. pagado en efectivo a la cuenta"
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
          label={submitting ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Registrar ingreso'}
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
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  notesInput: { minHeight: 70, textAlignVertical: 'top' },
  errorBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 18 },
  errorText: { fontSize: 13, marginBottom: 4 },
  submitRow: { flexDirection: 'row', marginTop: 24 },
});
