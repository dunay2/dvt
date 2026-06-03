/**
 * @file packages/@dvt/adapter-postgres/src/PostgresStateStoreAdminAdapter.ts
 * @ownedConcern Owns Postgres administrative schema lifecycle commands, including online-compatible rollback orchestration.
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Administrative schema lifecycle stays separate from run-state and delivery port delegation
 * @consequence State-store facade responsibilities are split into smaller owner-focused files
 * @version 1.0.0
 * @date 2026-04-19
 */
import {
  PostgresSchemaRollbackCompatibilityPolicy,
  type PostgresSchemaRollbackPlan,
} from './PostgresSchemaManager.js';
import { PostgresStateStoreRuntime } from './PostgresStateStoreRuntime.js';

export class PostgresStateStoreAdminAdapter extends PostgresStateStoreRuntime {
  async migrate(): Promise<void> {
    return this.schemaManager.migrate();
  }

  async planSchemaRollback(targetVersion: string | null): Promise<PostgresSchemaRollbackPlan> {
    return this.schemaManager.planRollback(targetVersion);
  }

  async rollbackSchemaTo(targetVersion: string | null): Promise<PostgresSchemaRollbackPlan> {
    const plan = await this.schemaManager.planRollback(targetVersion);
    PostgresSchemaRollbackCompatibilityPolicy.assertOnlineCompatible(plan);
    if (plan.steps.length === 0) {
      return plan;
    }
    return this.schemaManager.rollbackTo(targetVersion);
  }
}
