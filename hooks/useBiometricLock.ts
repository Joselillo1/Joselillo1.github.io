import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { biometricAuthService } from '../services/biometricAuthService';
import { settingsService } from '../services/settingsService';

/**
 * Gestiona el bloqueo de la app con Face ID/Touch ID. Solo vuelve a pedir
 * autenticación si estuviste más tiempo del configurado en Ajustes en segundo
 * plano — así puedes saltar brevemente a otra app (para copiar un precio, por
 * ejemplo) sin que la app se bloquee de inmediato.
 */
export function useBiometricLock(): { locked: boolean; checking: boolean; retry: () => void } {
  const [locked, setLocked] = useState(true);
  const [checking, setChecking] = useState(true);
  const backgroundedAtRef = useRef<number | null>(null);

  const tryUnlock = useCallback(async () => {
    setChecking(true);
    if (Platform.OS === 'web') {
      // Face ID/Touch ID no existen en navegador; la cuenta (login) ya cumple ese rol ahí.
      setLocked(false);
      setChecking(false);
      return;
    }
    const isEnabled = await settingsService.isBiometricLockEnabled();
    if (!isEnabled) {
      setLocked(false);
      setChecking(false);
      return;
    }
    const available = await biometricAuthService.isAvailable();
    if (!available) {
      setLocked(false);
      setChecking(false);
      return;
    }
    const success = await biometricAuthService.authenticate();
    setLocked(!success);
    setChecking(false);
  }, []);

  useEffect(() => {
    tryUnlock();
  }, [tryUnlock]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundedAtRef.current = Date.now();
        return;
      }

      if (state === 'active' && backgroundedAtRef.current !== null) {
        const elapsed = Date.now() - backgroundedAtRef.current;
        backgroundedAtRef.current = null;

        Promise.all([settingsService.isBiometricLockEnabled(), settingsService.getBiometricGracePeriodMs()]).then(
          ([isEnabled, gracePeriodMs]) => {
            if (isEnabled && elapsed > gracePeriodMs) {
              setLocked(true);
              tryUnlock();
            }
          }
        );
      }
    });
    return () => subscription.remove();
  }, [tryUnlock]);

  return { locked, checking, retry: tryUnlock };
}
