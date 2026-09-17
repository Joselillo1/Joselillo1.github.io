import stocksData from '../data/stocks.json';
import { StockCatalogItem } from '../models/StockCatalogItem';

const CATALOG: StockCatalogItem[] = stocksData as StockCatalogItem[];

const CATALOG_BY_SYMBOL: Map<string, StockCatalogItem> = new Map(
  CATALOG.map((item) => [item.symbol, item])
);

/** Placeholder mostrado cuando una transacción referencia un ticker que ya no está en el catálogo. */
function unknownStock(symbol: string): StockCatalogItem {
  return { symbol, name: symbol, sector: 'Desconocido', industry: 'Desconocido', exchange: '—' };
}

export const stockCatalogService = {
  getAll(): StockCatalogItem[] {
    return CATALOG;
  },

  getBySymbol(symbol: string): StockCatalogItem {
    return CATALOG_BY_SYMBOL.get(symbol) ?? unknownStock(symbol);
  },

  /** Filtra por símbolo, nombre o sector (insensible a mayúsculas/acentos no incluido a propósito: búsqueda simple). */
  search(query: string): StockCatalogItem[] {
    const q = query.trim().toLowerCase();
    if (!q) return CATALOG;
    return CATALOG.filter(
      (item) =>
        item.symbol.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.sector.toLowerCase().includes(q)
    );
  },
};
