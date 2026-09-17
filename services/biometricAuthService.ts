import * as LocalAuthentication from 'expo-local-authentication';

export const biometricAuthService = {
  async isAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  },

  async authenticate(): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Desbloquea Inversiones para continuar',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });
    return result.success;
  },
};
