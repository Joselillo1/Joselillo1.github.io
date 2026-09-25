import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Decimal from 'decimal.js';
import { useCapitalStore } from '../hooks/useCapitalStore';
import { useActionSheet } from '../components/Shared/ActionSheet';
import { PrimaryButton } from '../components/Shared/Buttons';
import { INITIAL_CAPITAL } from '../services/investmentConfig';
import { formatCurrency, formatDate } from '../services/format';
import { useTheme } from '../components/theme';

function parseDecimal(raw: string): Decimal | null {
  const normalized = raw.replace(',', '.').trim();
  if (normalized === '') return null;
  try {
    const value = new Decimal(normalized);
    return value.isFinite() && !value.isZero() ? value : null;
  } catch {
    return null;
  }
}

function parseDate(raw: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CapitalScreen() {
  const theme = useTheme();
  const { deposits, totalCapital, loadError, refresh, addDeposit, deleteDeposit } = useCapitalStore();
  const { showActionSheet } = useActionSheet();
  const [amount, setAmount] = useState('');
  const [dateText, setDateText] = useState(todayString());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => [...deposits].sort((a, b) => b.date.getTime() - a.date.getTime()), [deposits]);
  const inputStyle = [styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }];

  const onAdd = async () => {
    const parsedAmount = parseDecimal(amount);
    const parsedDate = parseDate(dateText);
    if (!parsedAmount) return setError('Escribe un monto válido (positivo para aportar, negativo para retirar).');
    if (!parsedDate) return setError('La fecha debe tener el formato AAAA-MM-DD, por ejemplo 2026-10-01.');
    setSaving(true);
    try {
      await addDeposit({ amount: parsedAmount, date: parsedDate, notes: notes.trim() || undefined });
      setAmount('');
      setNotes('');
      setError(null);
    } catch (e) {
      setError(`No se pudo guardar: ${e instanceof Error ? e.message : 'inténtalo de nuevo.'}`);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (id: string) => {
    showActionSheet({
      title: 'Eliminar aporte',
      message: '¿Seguro? Los porcentajes se recalculan sin este monto.',
      options: [
        { label: 'Eliminar', style: 'destructive', onPress: () => deleteDeposit(id) },
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
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            {loadError && (
              <Pressable onPress={refresh} style={[styles.box, { borderColor: theme.negative }]}>
                <Text style={[styles.boxTitle, { color: theme.negative }]}>No se pudieron cargar los aportes</Text>
                <Text style={[styles.hint, { color: theme.textMuted }]}>
                  {loadError} — si es la primera vez, falta correr add_capital_table.sql en Supabase. Toca para reintentar.
                </Text>
              </Pressable>
            )}
            <Text style={[styles.hint, { color: theme.textMuted, marginBottom: 14 }]}>
              Base de los porcentajes de rentabilidad. Si metes más dinero a la plataforma, regístralo aquí (o con
              signo menos si retiras) y los % se ajustan solos.
            </Text>

            <View style={[styles.summary, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.row}>
                <Text style={[styles.hint, { color: theme.textMuted }]}>Capital inicial</Text>
                <Text style={{ color: theme.text }}>{formatCurrency(INITIAL_CAPITAL)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.hint, { color: theme.textMuted }]}>Aportes / retiros</Text>
                <Text style={{ color: theme.text }}>{formatCurrency(totalCapital.minus(INITIAL_CAPITAL))}</Text>
              </View>
              <View style={[styles.row, styles.totalRow, { borderColor: 'rgba(127,127,127,0.25)' }]}>
                <Text style={{ color: theme.text, fontWeight: '800' }}>Capital total</Text>
                <Text style={{ color: theme.text, fontWeight: '800', fontSize: 18 }}>{formatCurrency(totalCapital)}</Text>
              </View>
            </View>

            <Text style={[styles.label, { color: theme.textMuted }]}>Monto (US$)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numbers-and-punctuation"
              placeholder="Ej. 500 (o -200 para retirar)"
              placeholderTextColor={theme.textMuted}
              style={inputStyle}
            />
            <Text style={[styles.label, { color: theme.textMuted }]}>Fecha (AAAA-MM-DD)</Text>
            <TextInput
              value={dateText}
              onChangeText={setDateText}
              placeholder="2026-10-01"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              style={inputStyle}
            />
            <Text style={[styles.label, { color: theme.textMuted }]}>Nota (opcional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Ej. depósito de octubre"
              placeholderTextColor={theme.textMuted}
              style={inputStyle}
            />
            {error && <Text style={[styles.hint, { color: theme.negative, marginTop: 10 }]}>{error}</Text>}
            <View style={styles.submit}>
              <PrimaryButton label={saving ? 'Guardando…' : '+ Agregar aporte'} onPress={onAdd} disabled={saving} />
            </View>
            <Text style={[styles.label, { color: theme.textMuted, marginTop: 22 }]}>Historial de aportes</Text>
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onDelete(item.id)}
            style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '600' }}>{formatDate(item.date)}</Text>
              {item.notes ? <Text style={[styles.hint, { color: theme.textMuted }]}>{item.notes}</Text> : null}
            </View>
            <Text style={{ color: item.amount.isNegative() ? theme.negative : theme.positive, fontWeight: '700' }}>
              {item.amount.isNegative() ? '−' : '+'}
              {formatCurrency(item.amount.abs())}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Todavía no registraste aportes; se usa solo el capital inicial.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  box: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14 },
  boxTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  hint: { fontSize: 13, lineHeight: 18 },
  summary: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 8, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  submit: { flexDirection: 'row', marginTop: 16 },
  item: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8 },
});
