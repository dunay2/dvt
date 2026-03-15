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
2. [ADR-0013](../../../../adr/ADR-0013-run-state-store-bootstrapRunTx.md)
3. [`packages/@dvt/engine/src/ports/IRunStateStore.ts`](../../../../../packages/@dvt/engine/src/ports/IRunStateStore.ts)
4. [`packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts`](../../../../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts)

## Historical Snapshots

These markdown files are retained as versioned reference material, but they are
not the live contract baseline:

- [IRunStateStore.v1.md](./IRunStateStore.v1.md)
- [IRunStateStore.v2.0.md](./IRunStateStore.v2.0.md)

When historical markdown conflicts with accepted ADRs or code, ADRs and code
win.
