import React from 'react';
import { FlatList, Keyboard, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MainTabsScreenProps } from '../navigation/types';
import { useStockCatalog } from '../hooks/useStockCatalog';
import { StockListItem } from '../components/Catalog/StockListItem';
import { useTheme } from '../components/theme';

type Props = MainTabsScreenProps<'Catalog'>;

export function StockCatalogScreen({ navigation }: Props) {
  const theme = useTheme();
  const { query, setQuery, results } = useStockCatalog();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <Text style={[styles.title, { color: theme.text }]}>Catálogo</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar por símbolo, nombre o sector"
        placeholderTextColor={theme.textMuted}
        style={[styles.search, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={() => Keyboard.dismiss()}
      />
      <FlatList
        data={results}
        keyExtractor={(item) => item.symbol}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => (
          <StockListItem stock={item} onPress={() => navigation.navigate('StockDetail', { symbol: item.symbol })} />
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textMuted }]}>No se encontraron acciones con ese criterio.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 12 },
  search: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 8 },
  list: { flex: 1 },
  listContent: { paddingBottom: 40, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
