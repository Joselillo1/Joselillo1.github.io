/**
 * Versión web: no existe SQLite local vieja que migrar en un navegador (esa base solo
 * existía en instalaciones nativas de antes de conectar Supabase). Metro usa este
 * archivo automáticamente en vez de database.ts al compilar para web, así evitamos
 * que expo-sqlite (que no tiene soporte web completo) rompa el bundle.
 */
export const database = {
  async open(): Promise<never> {
    throw new Error('No hay base de datos local en la versión web.');
  },
};
