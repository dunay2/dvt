/**
 * @file packages/@dvt/adapter-postgres/src/PostgresStateStoreAdminAdapter.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Administrative schema lifecycle stays separate from run-state and delivery port delegation
 * @consequence State-store facade responsibilities are split into smaller owner-focused files
 * @version 1.0.0
 * @date 2026-04-19
 */
import { POSTGRES_ADAPTER_ERROR_CONSTANTS as E } from './PostgresAdapterConstants.js';
import type { PostgresSchemaRollbackPlan } from './PostgresSchemaManager.js';
import { PostgresStateStoreRuntime } from './PostgresStateStoreRuntime.js';

export class PostgresStateStoreAdminAdapter extends PostgresStateStoreRuntime {
  async migrate(): Promise<void> {
    return this.schemaManager.migrate();
  }

  async planSchemaRollback(targetVersion: string | null): Promise<PostgresSchemaRollbackPlan> {
    return this.schemaManager.planRollback(targetVersion);
  }

  async rollbackSchemaTo(targetVersion: string | null): Promise<PostgresSchemaRollbackPlan> {
    return this.clientSession.withMaintenanceMode(async () => {
      if (this.clientSession.hasActiveClients()) {
        throw new Error(E.schemaRollbackActiveClientsErrorMessage);
      }
      return this.schemaManager.rollbackTo(targetVersion);
    });
  }
}
