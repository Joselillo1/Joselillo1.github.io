import Decimal from 'decimal.js';

/**
 * Contrato para un futuro proveedor de precios en tiempo real (Finnhub, Alpha Vantage, etc.).
 * Implementar esta interfaz y sustituir `activePriceProvider` es todo lo que se
 * necesitaría para conectar la app a una API externa — el resto de la app nunca
 * habla directamente con expo-file-system/fetch de precios, solo con este contrato.
 */
export interface PriceQuoteProvider {
  getCurrentPrice(symbol: string): Promise<Decimal>;
}

/** Implementación por defecto: la app funciona 100% sin conexión. */
export class NullPriceProvider implements PriceQuoteProvider {
  async getCurrentPrice(_symbol: string): Promise<Decimal> {
    throw new Error('No hay un proveedor de precios en tiempo real conectado.');
  }
}

export const activePriceProvider: PriceQuoteProvider = new NullPriceProvider();
