# State Store Docs

[← Back to Contracts Registry](../README.md)

This folder is the entrypoint for state-store documentation.

It intentionally separates:

- canonical overview and accepted architectural rules;
- live TypeScript contract and implementation code;
- older markdown contract snapshots kept for historical reference.

## Canonical Entry Points

Read these first:

1. [overview.md](./overview.md)
2. [ADR-0013](../../../../../adr/ADR-0013-run-state-store-bootstrapRunTx.md)
3. [`packages/@dvt/engine/src/ports/IRunStateStore.ts`](../../../../../../packages/@dvt/engine/src/ports/IRunStateStore.ts)
4. [`packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`](../../../../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)
5. [Snapshot rebuild concurrency component](./snapshot-rebuild-concurrency-component.md)

## Historical Snapshots

These markdown files are retained as versioned reference material, but they are
not the live contract baseline:

- [IRunStateStore.v1.md](./IRunStateStore.v1.md)
- [IRunStateStore.v2.0.md](./IRunStateStore.v2.0.md)

When historical markdown conflicts with accepted ADRs or code, ADRs and code
win.

## 3) Append Authority Pattern

`IRunStateStore` is the append authority for persisted run events and snapshots.

- sequence assignment lives at the store boundary, not in callers
- callers must treat persisted order as the canonical replay order
- adapter-specific mechanics belong in the live TypeScript port and adapter
  implementations linked above

## Snapshot Rebuild Maintenance

`IRunStateStoreMaintenance.rebuildSnapshot` is a tenant-scoped maintenance
command. The portable contract requires one active durable snapshot mutation per
`(tenantId, runId)`; adapters may use backend-native locks, leases,
transactions, stored procedures, or compare-and-swap as long as competing
same-run rebuild commands serialize or fail with a typed transient concurrency
error.
