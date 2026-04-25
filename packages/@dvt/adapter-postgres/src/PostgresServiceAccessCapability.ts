/**
 * @file packages/@dvt/adapter-postgres/src/PostgresServiceAccessCapability.ts
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Service access owners are constrained to a closed adapter-internal capability catalog.
 * @consequence Adapter maintenance code cannot mint arbitrary service owners through an exported factory.
 * @version 1.0.0
 *
 * Owned concern: represent the internal capability required before a Postgres
 * adapter maintenance path can enter transaction-local service access mode.
 */
const POSTGRES_SERVICE_ACCESS_CAPABILITY: unique symbol = Symbol('PostgresServiceAccessCapability');

export type PostgresServiceAccessOwner =
  | 'backpressure-snapshot-reader'
  | 'delivery-buffer-purge'
  | 'lineage-outbox-worker'
  | 'outbox-worker'
  | 'run-archive-maintenance'
  | 'run-metadata-tenant-resolver'
  | 'snapshot-staleness-query'
  | 'snapshot-work-queue'
  | 'start-run-intent-reconciler';

export interface PostgresServiceAccessCapability {
  readonly [POSTGRES_SERVICE_ACCESS_CAPABILITY]: true;
  readonly owner: PostgresServiceAccessOwner;
}

function createPostgresServiceAccessCapability(
  owner: PostgresServiceAccessOwner
): PostgresServiceAccessCapability {
  const capability: PostgresServiceAccessCapability = {
    [POSTGRES_SERVICE_ACCESS_CAPABILITY]: true,
    owner,
  };
  return Object.freeze(capability);
}

export const POSTGRES_SERVICE_ACCESS = Object.freeze({
  backpressureSnapshotReader: createPostgresServiceAccessCapability('backpressure-snapshot-reader'),
  deliveryBufferPurge: createPostgresServiceAccessCapability('delivery-buffer-purge'),
  lineageOutboxWorker: createPostgresServiceAccessCapability('lineage-outbox-worker'),
  outboxWorker: createPostgresServiceAccessCapability('outbox-worker'),
  runArchiveMaintenance: createPostgresServiceAccessCapability('run-archive-maintenance'),
  runMetadataTenantResolver: createPostgresServiceAccessCapability('run-metadata-tenant-resolver'),
  snapshotStalenessQuery: createPostgresServiceAccessCapability('snapshot-staleness-query'),
  snapshotWorkQueue: createPostgresServiceAccessCapability('snapshot-work-queue'),
  startRunIntentReconciler: createPostgresServiceAccessCapability('start-run-intent-reconciler'),
} as const);

export function assertPostgresServiceAccessCapability(
  capability: PostgresServiceAccessCapability
): void {
  if (capability[POSTGRES_SERVICE_ACCESS_CAPABILITY] !== true) {
    throw new Error('POSTGRES_SERVICE_ACCESS_CAPABILITY_REQUIRED');
  }
}
