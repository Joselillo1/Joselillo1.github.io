import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { authService } from '../services/authService';
import { useActionSheet } from '../components/Shared/ActionSheet';
import { useTheme } from '../components/theme';
import { PrimaryButton, SecondaryButton } from '../components/Shared/Buttons';

export function AuthScreen() {
  const theme = useTheme();
  const { showAlert } = useActionSheet();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      showAlert('Faltan datos', 'Ingresa tu email y contraseña.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signIn') {
        await authService.signIn(email.trim(), password);
      } else {
        await authService.signUp(email.trim(), password);
        showAlert('Cuenta creada', 'Si tu proyecto de Supabase pide confirmar el email, revisa tu correo antes de iniciar sesión.');
      }
    } catch (error) {
      showAlert('No se pudo continuar', error instanceof Error ? error.message : 'Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[styles.title, { color: theme.text }]}>Inversiones</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        {mode === 'signIn' ? 'Inicia sesión para ver tu portafolio.' : 'Crea tu cuenta para sincronizar tus datos.'}
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={theme.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Contraseña"
        placeholderTextColor={theme.textMuted}
        secureTextEntry
        style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
      />

      <View style={styles.actions}>
        <PrimaryButton
          label={busy ? 'Un momento…' : mode === 'signIn' ? 'Iniciar sesión' : 'Crear cuenta'}
          onPress={onSubmit}
          disabled={busy}
        />
      </View>

      <View style={styles.switchRow}>
        <SecondaryButton
          label={mode === 'signIn' ? '¿No tienes cuenta? Crear una' : 'Ya tengo cuenta'}
          onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
          disabled={busy}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 28 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  actions: { flexDirection: 'row', marginTop: 8 },
  switchRow: { flexDirection: 'row', marginTop: 12 },
});
