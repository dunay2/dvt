# ADR-0031 - Storage Adapter Tenant Isolation Strategy

- Status: Accepted
- Date: 2026-03-03
- Owners: Engine + Storage
- Related:
  - [SECURITY_INVARIANTS.v1.md](../architecture/engine/security/SECURITY_INVARIANTS.v1.md)
  - [TENANT_ISOLATION_TESTS.v1.md](../architecture/engine/security/TENANT_ISOLATION_TESTS.v1.md)
  - [ADR-0003 - Execution Model](ADR-0003-execution-model.md)
  - [ADR-0004 - Event Sourcing Strategy](ADR-0004-event-sourcing-strategy.md)

## 1. Context

`INV-SCOPE-01/02/03` define tenant isolation as mandatory. The core engine already enforces tenant scope, but storage-adapter methods in `@dvt/adapter-postgres` exposed unscoped admin and write paths that could enable cross-tenant read/write (IDOR class risk).

The gap was not in engine contracts; it was in adapter-level enforcement for methods outside the strict `IRunStateStore` read APIs.

## 2. Decision

Tenant isolation at adapter layer is enforced with two layers:

1. Application-level tenant scope checks in all adapter methods that can read/write tenant-owned data.
2. Postgres transaction tenant context (`setTenantContext`) enabled on transactional paths where tenant scope is known, as defense in depth.

Administrative dead-letter operations are tenant-scoped by contract:

- `listDeadLetter` requires tenant scope.
- `replayDeadLetters` requires tenant scope.
- tenant-owned run metadata writes must stay scoped to matching
  `(tenant_id, run_id)` rows; provider runtime identity is now persisted as the
  discriminated `providerRef` inside `RunMetadata` rather than via a separate
  provider-ref patch method.
- Deprecated `saveRunMetadata` must reject tenant takeover attempts on existing `run_id`.

## 3. Consequences

Positive:

- Cross-tenant direct access is blocked at adapter boundary.
- Admin operations no longer operate globally by default.
- Future RLS rollout has active transaction context plumbing already in place.

Trade-offs:

- Manual/admin calls now require explicit `tenantId`.
- Existing tooling that called dead-letter methods without tenant scope must be migrated.

## 4. Verification

- Add integration tests for cross-tenant negative paths in `@dvt/adapter-postgres`.
- Validate no tenant can list/replay another tenant dead letters.
- Validate cross-tenant run-metadata reads/upserts are denied.
- Validate deprecated `saveRunMetadata` cannot overwrite ownership of existing `run_id`.

## 5. Migration Notes

- Treat missing tenant scope in admin operations as hard error (`TENANT_SCOPE_REQUIRED`).
- Keep this ADR as normative reference for adapter implementations in future stores.
