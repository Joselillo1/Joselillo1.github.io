import { legacyLocalRepository } from './legacyLocalRepository';
import { transactionRepository } from './transactionRepository';

export const migrationService = {
  /** Copia las transacciones que quedaron en el SQLite local viejo hacia Supabase. Seguro de correr más de una vez (ignora duplicados por id). */
  async migrateLocalDataToCloud(): Promise<number> {
    const localTransactions = await legacyLocalRepository.getAll();
    if (localTransactions.length === 0) return 0;
    await transactionRepository.bulkInsert(localTransactions);
    return localTransactions.length;
  },
};
