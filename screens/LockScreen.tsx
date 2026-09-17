import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../components/theme';
import { PrimaryButton } from '../components/Shared/Buttons';

interface Props {
  checking: boolean;
  onRetry: () => void;
}

export function LockScreen({ checking, onRetry }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={[styles.title, { color: theme.text }]}>Inversiones bloqueado</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Autentícate con Face ID o Touch ID para ver tus datos financieros.
      </Text>
      {!checking && (
        <View style={styles.button}>
          <PrimaryButton label="Desbloquear" onPress={onRetry} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  button: { alignSelf: 'stretch' },
});
