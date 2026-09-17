/** Un registro de referencia del catálogo estático de acciones (data/stocks.json). */
export interface StockCatalogItem {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  exchange: string;
}
