import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** Paleta fija: el color de cada acción es siempre el mismo (determinado por su símbolo), no aleatorio en cada render. */
const PALETTE = [
  '#0052FF', '#7C3AED', '#DB2777', '#DC2626', '#EA580C',
  '#D97706', '#65A30D', '#059669', '#0891B2', '#4F46E5',
  '#9333EA', '#BE123C',
];

function colorForSymbol(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface Props {
  symbol: string;
  size?: number;
}

/** Avatar de respaldo (sin logos reales de marcas): iniciales del ticker sobre un color fijo, 100% local. */
export function StockLogo({ symbol, size = 36 }: Props) {
  const initials = symbol.replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase() || '?';
  const backgroundColor = colorForSymbol(symbol);
  const fontSize = size * (initials.length > 1 ? 0.36 : 0.46);

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}>
      <Text style={[styles.text, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '700' },
});
