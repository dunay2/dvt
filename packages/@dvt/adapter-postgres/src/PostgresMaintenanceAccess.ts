/**
 * @file packages/@dvt/adapter-postgres/src/PostgresMaintenanceAccess.ts
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Service-mode transaction context is entered only through an approved maintenance capability.
 * @consequence Schema management no longer exposes service access as ambient adapter authority.
 * @version 1.0.0
 *
 * Owned concern: enter transaction-local Postgres maintenance access for
 * approved adapter maintenance paths.
 */
import type { PoolClient } from 'pg';

import {
  assertPostgresServiceAccessCapability,
  type PostgresServiceAccessCapability,
} from './PostgresServiceAccessCapability.js';
import { setServiceContextSql } from './PostgresTenantIsolationPolicy.js';

export async function enterPostgresMaintenanceContext(
  client: PoolClient,
  capability: PostgresServiceAccessCapability
): Promise<void> {
  assertPostgresServiceAccessCapability(capability);
  await client.query(setServiceContextSql(), [capability.owner]);
}
