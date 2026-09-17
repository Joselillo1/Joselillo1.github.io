import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_LOCK_KEY = 'settings.biometricLockEnabled';
const GRACE_PERIOD_KEY = 'settings.biometricGracePeriodMs';

/** 5 minutos por defecto: suficiente para saltar a otra app a copiar un dato sin que te vuelva a pedir Face ID. */
const DEFAULT_GRACE_PERIOD_MS = 5 * 60_000;

/** Preferencias simples de la app. No son datos financieros, por eso viven en AsyncStorage y no en SQLite. */
export const settingsService = {
  async isBiometricLockEnabled(): Promise<boolean> {
    const value = await AsyncStorage.getItem(BIOMETRIC_LOCK_KEY);
    return value !== 'false'; // activado por defecto
  },

  async setBiometricLockEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(BIOMETRIC_LOCK_KEY, enabled ? 'true' : 'false');
  },

  /** Cuánto tiempo puedes pasar fuera de la app (en background) antes de que vuelva a pedir Face ID al volver. */
  async getBiometricGracePeriodMs(): Promise<number> {
    const value = await AsyncStorage.getItem(GRACE_PERIOD_KEY);
    const parsed = value ? Number(value) : NaN;
    return Number.isFinite(parsed) ? parsed : DEFAULT_GRACE_PERIOD_MS;
  },

  async setBiometricGracePeriodMs(ms: number): Promise<void> {
    await AsyncStorage.setItem(GRACE_PERIOD_KEY, String(ms));
  },
};
