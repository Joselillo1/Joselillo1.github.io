import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Decimal from 'decimal.js';
import { settingsService } from '../services/settingsService';
import { backupService } from '../services/backupService';
import { monthlyReportService } from '../services/monthlyReportService';
import { migrationService } from '../services/migrationService';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { useTransactionsStore } from '../hooks/useTransactionsStore';
import { useExpensesStore } from '../hooks/useExpensesStore';
import { useIncomeStore } from '../hooks/useIncomeStore';
import { formatCurrency } from '../services/format';
import { useTheme } from '../components/theme';
import { PrimaryButton, SecondaryButton, DangerButton } from '../components/Shared/Buttons';
import { useActionSheet } from '../components/Shared/ActionSheet';
import { MainTabsScreenProps } from '../navigation/types';

type Props = MainTabsScreenProps<'Settings'>;

const GRACE_PERIOD_OPTIONS: { label: string; ms: number }[] = [
  { label: 'Inmediato', ms: 0 },
  { label: '30 seg', ms: 30_000 },
  { label: '1 min', ms: 60_000 },
  { label: '5 min', ms: 5 * 60_000 },
  { label: '15 min', ms: 15 * 60_000 },
];

export function SettingsScreen({ navigation }: Props) {
  const theme = useTheme();
  const { session } = useAuth();
  const { transactions, refresh } = useTransactionsStore();
  const { expenses, refresh: refreshExpenses } = useExpensesStore();
  const { income, refresh: refreshIncome } = useIncomeStore();
  const { showActionSheet, showAlert } = useActionSheet();
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [gracePeriodMs, setGracePeriodMs] = useState<number>(5 * 60_000);
  const [busy, setBusy] = useState(false);

  const availableMonths = useMemo(() => monthlyReportService.getAvailableMonths(transactions), [transactions]);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const selectedMonth =
    availableMonths.find((m) => `${m.year}-${m.month}` === selectedMonthKey) ?? availableMonths[0];

  useEffect(() => {
    settingsService.isBiometricLockEnabled().then(setBiometricEnabled);
    settingsService.getBiometricGracePeriodMs().then(setGracePeriodMs);
  }, []);

  const toggleBiometric = async (value: boolean) => {
    setBiometricEnabled(value);
    await settingsService.setBiometricLockEnabled(value);
  };

  const chooseGracePeriod = async (ms: number) => {
    setGracePeriodMs(ms);
    await settingsService.setBiometricGracePeriodMs(ms);
  };

  const withBusy = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      showAlert('Ocurrió un error', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const onExportJSON = () => withBusy(async () => {
    await backupService.exportJSON();
  });

  const onExportCSV = () => withBusy(async () => {
    await backupService.exportCSV();
  });

  const onImport = () => withBusy(async () => {
    const count = await backupService.importJSON();
    await Promise.all([refresh(), refreshExpenses(), refreshIncome()]);
    if (count > 0) {
      showAlert('Respaldo importado', `Se importaron ${count} registros nuevos (transacciones, gastos e ingresos).`);
    }
  });

  const onExportMonthlyExcel = () => withBusy(async () => {
    if (!selectedMonth) return;
    const rows = monthlyReportService.buildReportRows(transactions, selectedMonth.year, selectedMonth.month);
    if (rows.length === 0) {
      showAlert('Sin transacciones', 'No hay transacciones registradas ese mes.');
      return;
    }
    await monthlyReportService.exportToExcel(rows, selectedMonth.year, selectedMonth.month);
  });

  const onExportMonthlyPDF = () => withBusy(async () => {
    if (!selectedMonth) return;
    const rows = monthlyReportService.buildReportRows(transactions, selectedMonth.year, selectedMonth.month);
    if (rows.length === 0) {
      showAlert('Sin transacciones', 'No hay transacciones registradas ese mes.');
      return;
    }
    await monthlyReportService.exportToPDF(rows, selectedMonth.year, selectedMonth.month, selectedMonth.label);
  });

  const onMigrateLocalData = () => withBusy(async () => {
    const count = await migrationService.migrateLocalDataToCloud();
    await refresh();
    showAlert(
      count > 0 ? 'Migración completa' : 'Nada que migrar',
      count > 0
        ? `Se subieron ${count} transacciones que tenías guardadas localmente en este teléfono.`
        : 'No se encontraron transacciones locales viejas en este dispositivo.'
    );
  });

  const onSignOut = () => {
    showActionSheet({
      title: 'Cerrar sesión',
      message: '¿Seguro que quieres cerrar sesión?',
      options: [
        { label: 'Cerrar sesión', style: 'destructive', onPress: () => withBusy(() => authService.signOut()) },
        { label: 'Cancelar', style: 'cancel' },
      ],
    });
  };

  const onWipeAll = () => {
    showActionSheet({
      title: 'Borrar todos los datos',
      message: 'Esto eliminará permanentemente todas tus transacciones de este dispositivo. No se puede deshacer.',
      options: [
        {
          label: 'Continuar',
          style: 'destructive',
          onPress: () =>
            showActionSheet({
              title: '¿Confirmas de nuevo?',
              message: 'Esta es tu última oportunidad para cancelar.',
              options: [
                {
                  label: 'Borrar todo',
                  style: 'destructive',
                  onPress: () =>
                    withBusy(async () => {
                      await backupService.wipeAllData();
                      await Promise.all([refresh(), refreshExpenses(), refreshIncome()]);
                    }),
                },
                { label: 'Cancelar', style: 'cancel' },
              ],
            }),
        },
        { label: 'Cancelar', style: 'cancel' },
      ],
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>Ajustes</Text>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Cuenta</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.rowTitle, { color: theme.text, marginBottom: 4 }]}>{session?.user.email}</Text>
        <Text style={[styles.rowSubtitle, { color: theme.textMuted, marginBottom: 12 }]}>
          Tus transacciones se sincronizan con esta cuenta en todos tus dispositivos.
        </Text>
        <SecondaryButton label="Cerrar sesión" onPress={onSignOut} disabled={busy} />
      </View>

      {Platform.OS !== 'web' && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>Bloqueo con Face ID / Touch ID</Text>
              <Text style={[styles.rowSubtitle, { color: theme.textMuted }]}>
                Exige autenticación biométrica cada vez que abres la app en este dispositivo.
              </Text>
            </View>
            <Switch value={biometricEnabled} onValueChange={toggleBiometric} />
          </View>
        </View>
      )}

      {Platform.OS !== 'web' && biometricEnabled && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.rowTitle, { color: theme.text }]}>Volver a pedir Face ID después de</Text>
          <Text style={[styles.rowSubtitle, { color: theme.textMuted, marginBottom: 12 }]}>
            Tiempo que puedes pasar en otra app antes de que Inversiones vuelva a bloquearse al regresar.
          </Text>
          <View style={styles.chipRow}>
            {GRACE_PERIOD_OPTIONS.map((option) => (
              <Pressable
                key={option.ms}
                onPress={() => chooseGracePeriod(option.ms)}
                style={[
                  styles.chip,
                  { borderColor: theme.border, backgroundColor: gracePeriodMs === option.ms ? theme.primary : 'transparent' },
                ]}
              >
                <Text style={{ color: gracePeriodMs === option.ms ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Gastos extra</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>Cuota del banco, del broker, noticias…</Text>
            <Text style={[styles.rowSubtitle, { color: theme.textMuted }]}>
              Costos de mantener tu operación de inversión, aparte de las compras/ventas.
            </Text>
          </View>
        </View>
        <Text style={[styles.rowTitle, { color: theme.negative, marginTop: 10, marginBottom: 12 }]}>
          −{formatCurrency(expenses.reduce((sum, e) => sum.plus(e.amount), new Decimal(0)))} acumulado
        </Text>
        <SecondaryButton label="Ver y administrar gastos" onPress={() => navigation.navigate('Expenses')} />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Ingresos</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: theme.text }]}>Dividendos, intereses…</Text>
            <Text style={[styles.rowSubtitle, { color: theme.textMuted }]}>
              Dinero recibido que no viene de vender una posición.
            </Text>
          </View>
        </View>
        <Text style={[styles.rowTitle, { color: theme.positive, marginTop: 10, marginBottom: 12 }]}>
          +{formatCurrency(income.reduce((sum, i) => sum.plus(i.amount), new Decimal(0)))} acumulado
        </Text>
        <SecondaryButton label="Ver y administrar ingresos" onPress={() => navigation.navigate('Income')} />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Reporte mensual</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {availableMonths.length === 0 ? (
          <Text style={[styles.rowSubtitle, { color: theme.textMuted }]}>
            Todavía no hay transacciones registradas para generar un reporte.
          </Text>
        ) : (
          <>
            <Text style={[styles.rowTitle, { color: theme.text, marginBottom: 10 }]}>Elige el mes</Text>
            <View style={styles.chipRow}>
              {availableMonths.map((m) => {
                const key = `${m.year}-${m.month}`;
                const isSelected = selectedMonth && selectedMonth.year === m.year && selectedMonth.month === m.month;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelectedMonthKey(key)}
                    style={[
                      styles.chip,
                      { borderColor: theme.border, backgroundColor: isSelected ? theme.primary : 'transparent' },
                    ]}
                  >
                    <Text style={{ color: isSelected ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <PrimaryButton label="Exportar a Excel" onPress={onExportMonthlyExcel} disabled={busy || !selectedMonth} />
              <SecondaryButton label="Exportar a PDF" onPress={onExportMonthlyPDF} disabled={busy || !selectedMonth} />
            </View>
          </>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Respaldo</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, gap: 10 }]}>
        <PrimaryButton label="Exportar a JSON" onPress={onExportJSON} disabled={busy} />
        <SecondaryButton label="Exportar a CSV" onPress={onExportCSV} disabled={busy} />
        <SecondaryButton label="Importar respaldo" onPress={onImport} disabled={busy} />
        {Platform.OS !== 'web' && (
          <SecondaryButton label="Migrar mis datos locales a la nube" onPress={onMigrateLocalData} disabled={busy} />
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Zona de riesgo</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <DangerButton label="Borrar todos los datos" onPress={onWipeAll} disabled={busy} />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowSubtitle: { fontSize: 12, marginTop: 4, maxWidth: 260 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
});
