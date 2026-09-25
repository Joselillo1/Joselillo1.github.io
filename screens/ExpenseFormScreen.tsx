import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Decimal from 'decimal.js';
import { RootStackScreenProps } from '../navigation/types';
import { useExpensesStore } from '../hooks/useExpensesStore';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, ExpenseCategory } from '../models/ExpenseEntry';
import { formatDate } from '../services/format';
import { useTheme } from '../components/theme';
import { PrimaryButton } from '../components/Shared/Buttons';

type Props = RootStackScreenProps<'ExpenseForm'>;

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

export function ExpenseFormScreen({ route, navigation }: Props) {
  const { expenseId } = route.params;
  const theme = useTheme();
  const { expenses, addExpense, updateExpense } = useExpensesStore();

  const editing = useMemo(
    () => (expenseId ? expenses.find((e) => e.id === expenseId) : undefined),
    [expenses, expenseId]
  );
  const isEditing = editing !== undefined;

  const [category, setCategory] = useState<ExpenseCategory>(editing?.category ?? 'banco');
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
      description: description.trim(),
      amount: parsedAmount,
      date,
      notes: notes.trim() || undefined,
    };

    try {
      const result = isEditing ? await updateExpense(editing.id, input) : await addExpense(input);
      if (!result.valid) {
        setErrors(result.errors);
        return;
      }
      navigation.goBack();
    } catch (error) {
      setErrors([`No se pudo guardar: ${error instanceof Error ? error.message : 'inténtalo de nuevo.'}`]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>{isEditing ? 'Editar gasto' : 'Nuevo gasto extra'}</Text>

      <Text style={[styles.label, { color: theme.textMuted }]}>Categoría</Text>
      <View style={styles.categoryRow}>
        {EXPENSE_CATEGORIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            style={[
              styles.categoryChip,
              { borderColor: theme.border, backgroundColor: category === c ? theme.primary : 'transparent' },
            ]}
          >
            <Text style={{ color: category === c ? '#fff' : theme.text, fontWeight: '600', fontSize: 13 }}>
              {EXPENSE_CATEGORY_LABELS[c]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textMuted }]}>
        Descripción {category === 'otro' ? '' : '(opcional)'}
      </Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder={category === 'otro' ? 'Ej. renovación de dominio del broker' : 'Ej. cuota de manejo mensual'}
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
        placeholder="Ej. subió por cambio de plan"
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
          label={submitting ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Registrar gasto'}
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
