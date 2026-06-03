# AR-A6 Fowler Analysis: Snapshot Rebuild Concurrency Contract

Date: 2026-05-13  
Author: Codex  
Task: AR-A6

## Architectural Reading

The current branch context shows a mature event-sourced state-store shape:
append-only events, materialized snapshots as derived read models, tenant scope
on storage calls, and a PostgreSQL adapter that uses transaction-local locking.

The gap is not missing behavior in PostgreSQL. The gap is published language:
the system relies on serialized rebuild mutation, but the shared
`IRunStateStoreMaintenance` contract does not yet require equivalent behavior
from every adapter.

## Fowler Comparison

Mature systems keep these concerns separate:

- Event log as source of truth.
- Snapshot as derived cache/read model.
- Repository or Unit of Work boundary owns write serialization.
- Adapter-specific lock technology stays behind a port.
- Maintenance commands are explicit commands, not informal helper methods.

DVT already has most of this shape. AR-A6 improves the pattern by moving the
rebuild-concurrency invariant from infrastructure code into the state-store
maintenance contract.

## Improved Patterns

- **Published Language**: `rebuildSnapshot` now names per-run mutual exclusion
  as a contract invariant.
- **Ports and Adapters**: PostgreSQL can keep advisory locks, while other
  adapters may use leases, stored procedures, serializable transactions, or
  compare-and-swap.
- **Serialized Aggregate Mutation**: snapshot rebuild is treated as mutation of
  the run aggregate read model, not a harmless read utility.

## Anti-Patterns Detected

- **Infrastructure leakage**: docs imply PostgreSQL advisory locks are the
  meaningful rule, when the real rule is portable exclusion.
- **Documentation drift**: canonical overview covers deterministic replay but
  not concurrent rebuild semantics.
- **Implicit command**: admin and projector callers invoke a mutating maintenance
  command, but the rail was not named in the docs.

## Components To Group

- `IRunStateStoreMaintenance.rebuildSnapshot`: public maintenance command port.
- `PostgresRunSnapshotStore.rebuildSnapshot`: PostgreSQL adapter implementation.
- Admin rebuild route docs: operational consumer.
- Projector/repair paths: internal consumers.
- State-store component docs: invariant owner.

## Repetition

The same idea appears as:

- PostgreSQL advisory-lock comments.
- Snowflake warning about application-side locks.
- Admin manual saying rebuild overwrites snapshots.
- State-store overview saying snapshots derive from events.

AR-A6 groups those into one component guide and contract invariant.

## Opportunities

- Keep future adapter guides focused on equivalent semantics, not matching
  PostgreSQL mechanics.
- Make architecture tests validate semantic words like `per (tenantId, runId)`
  and `serialize or typed transient concurrency failure`.
- Use this pattern for other maintenance commands that mutate derived state.

## Drift Fixed

- Contract drift: live TypeScript ports will state portable mutual exclusion.
- Docs drift: state-store overview and adapter docs will refer to the same
  component guide.
- Test drift: architecture guard will verify semantics instead of barrel
  thinness or file presence only.

## Teaching For Future Work

When an adapter uses a lock, ask whether the lock is:

1. A backend optimization only.
2. A required domain/contract invariant.
3. A caller-visible operational posture.

If it is the second, put it in the port and component guide before adding more
adapter-specific code.
