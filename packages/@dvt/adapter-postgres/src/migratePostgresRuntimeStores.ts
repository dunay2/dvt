/**
 * @file packages/@dvt/adapter-postgres/src/migratePostgresRuntimeStores.ts
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Runtime bootstrap may require both core state-store and start-run intent schema migrations
 * @consequence Callers get one explicit helper instead of remembering dual migrate sequencing ad hoc
 * @version 1.0.0
 * @date 2026-04-26
 */

export interface PostgresMigratableStore {
  migrate(): Promise<void>;
}

export interface PostgresRuntimeStoresToMigrate {
  stateStore: PostgresMigratableStore;
  startRunIntentStore: PostgresMigratableStore;
}

export async function migratePostgresRuntimeStores({
  stateStore,
  startRunIntentStore,
}: PostgresRuntimeStoresToMigrate): Promise<void> {
  await stateStore.migrate();
  await startRunIntentStore.migrate();
}
