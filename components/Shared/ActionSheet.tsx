import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

export interface ActionSheetOption {
  label: string;
  style?: 'default' | 'destructive' | 'cancel';
  onPress?: () => void;
}

interface ActionSheetConfig {
  title: string;
  message?: string;
  options: ActionSheetOption[];
}

interface ActionSheetContextValue {
  /** Reemplazo de Alert.alert(title, message, options) que sí funciona en web: en
   * react-native-web, Alert.alert está implementado como una función completamente
   * vacía (no hace NADA, ni con un botón ni con varios) — por eso hasta un simple
   * mensaje de error quedaba mudo en el navegador. Esto se dibuja a mano con un Modal. */
  showActionSheet: (config: ActionSheetConfig) => void;
  /** Atajo para un mensaje simple de un solo botón "Entendido" (reemplazo directo de Alert.alert(title, message)). */
  showAlert: (title: string, message?: string) => void;
}

const ActionSheetContext = createContext<ActionSheetContextValue | undefined>(undefined);

export function ActionSheetProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [config, setConfig] = useState<ActionSheetConfig | null>(null);

  const showActionSheet = useCallback((next: ActionSheetConfig) => setConfig(next), []);
  const showAlert = useCallback(
    (title: string, message?: string) => setConfig({ title, message, options: [{ label: 'Entendido' }] }),
    []
  );
  const close = useCallback(() => setConfig(null), []);

  const handlePress = (option: ActionSheetOption) => {
    close();
    // Deja que el modal se cierre antes de correr la acción (evita saltos visuales al navegar).
    setTimeout(() => option.onPress?.(), 0);
  };

  return (
    <ActionSheetContext.Provider value={{ showActionSheet, showAlert }}>
      {children}
      <Modal visible={config !== null} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={[styles.card, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
            {config && (
              <>
                <Text style={[styles.title, { color: theme.text }]}>{config.title}</Text>
                {config.message ? (
                  <Text style={[styles.message, { color: theme.textMuted }]}>{config.message}</Text>
                ) : null}
                {config.options.map((option, i) => (
                  <Pressable
                    key={i}
                    onPress={() => handlePress(option)}
                    style={({ pressed }) => [
                      styles.option,
                      { borderTopColor: theme.border, opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        {
                          color:
                            option.style === 'destructive'
                              ? theme.negative
                              : option.style === 'cancel'
                                ? theme.textMuted
                                : theme.primary,
                          fontWeight: option.style === 'cancel' ? '400' : '600',
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ActionSheetContext.Provider>
  );
}

export function useActionSheet(): ActionSheetContextValue {
  const ctx = useContext(ActionSheetContext);
  if (!ctx) throw new Error('useActionSheet debe usarse dentro de <ActionSheetProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: { width: '100%', maxWidth: 380, borderRadius: 16, paddingTop: 18, overflow: 'hidden' },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center', paddingHorizontal: 20 },
  message: { fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 20, marginBottom: 4 },
  option: { paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, alignItems: 'center' },
  optionLabel: { fontSize: 15 },
});
