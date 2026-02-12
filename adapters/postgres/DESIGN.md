# PostgreSQL Adapter Design

This adapter implements DVT's normative contracts using PostgreSQL as the backend state store and event log.

## Architecture

- **State Store**: `workflow_runs` and `workflow_steps` tables (immutable snapshots)
- **Event Log**: `event_log` table (append-only, immutable)
- **Outbox Pattern**: `outbox_events` table (at-least-once delivery)
- **Snapshots**: `run_snapshots` table (determinism verification)

## Contract Compliance

✅ IStateStoreAdapter: Full support (read, write, transactions)
✅ IOutboxStorageAdapter: Full support (append, pull, mark delivered)
✅ IProjectorAdapter: Partial (query-based projection)
✅ IWorkflowEngineAdapter: Delegated to core engine

## Key Implementation Details

### Concurrency Control

- MVCC for readers (consistent snapshots)
- Serializable isolation for critical paths
- Lease-based distributed locking for outbox consumers

### Performance Optimization

- Indices on (tenant_id, status) for outbox queries
- Partial indices for pending events only
- Connection pooling (default: 25 connections)

### High Availability

- Replication support (hot standby)
- WAL archive for crash recovery
- Backup/restore procedures documented

See detailed documentation in:

- [outbox-semantics.md](./outbox-semantics.md) - Delivery pattern implementation
- [load-testing.md](./load-testing.md) - Performance testing and targets
- [rollback.md](./rollback.md) - Recovery and rollback procedures
- [README.md](./README.md) - Quick start and operations guide
