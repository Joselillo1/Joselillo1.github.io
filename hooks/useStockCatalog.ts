import { useMemo, useState } from 'react';
import { StockCatalogItem } from '../models/StockCatalogItem';
import { stockCatalogService } from '../services/stockCatalogService';

export function useStockCatalog(): {
  query: string;
  setQuery: (q: string) => void;
  results: StockCatalogItem[];
} {
  const [query, setQuery] = useState('');
  const results = useMemo(() => stockCatalogService.search(query), [query]);
  return { query, setQuery, results };
}
