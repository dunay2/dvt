# AdminRebuildSnapshotAccess v1

## Status

- Status: Accepted
- Version: `v1`
- Owners: `apps/api`
- Effective date: `2026-04-07`

## Purpose

`AdminRebuildSnapshotAccess.v1` is the canonical access contract for
`POST /admin/runs/:runId/rebuild-snapshot`.

It defines the governed invariants that must not drift silently:

- the route identity
- the required authorization action
- the `admin:` action-prefix guard
- the ordered access pipeline before `rebuildSnapshot(...)`
- the caller-visible success and failure response classes

## Normative artifacts

- `docs/contracts/shared/AdminRebuildSnapshotAccess.v1.schema.json`
- `apps/api/src/entrypoints/http/adminRoutes.ts`
- `apps/api/src/entrypoints/http/authorizeAdminExecutionScope.ts`
- `apps/api/test/contracts/adminRebuildSnapshotAccessContract.test.ts`

## Required action

The route requires this exact command action:

```json
{
  "kind": "command",
  "name": "admin:rebuild-snapshot"
}
```

Any authorization context that does not resolve to an `admin:` command action
is forbidden.

## Access pipeline

The governed access pipeline is:

1. `parse_body.tenant_id`
2. `validate_body.tenant_id`
3. `authenticate_bearer_token`
4. `authorize_execution_scope`
5. `enforce_admin_action_prefix`
6. `rebuild_snapshot`

The contract intentionally fixes this order so that tenant parsing/validation
remains ahead of authz-dependent store execution and the admin prefix check
remains part of the route boundary.

## Response classes

- Success:
  - `200` with `{ runId, status }`
- Error classes:
  - `400`: `invalid_body`, `missing_tenant_id`, `invalid_tenant_id`
  - `401`: token/authentication failure classes such as `missing_token`
  - `403`: normalized authorization denial reasons such as
    `action_not_granted`, `tenant_not_granted`, or
    `token_assertion_conflict`
  - `404`: `run_not_found`
  - `500`: `internal_error`

## Relationship to route tests

`apps/api/test/contracts/adminRebuildSnapshotAccessContract.test.ts` validates
the canonical contract object against the schema and asserts negative mutations
for:

- invalid `requiredAction.name`
- invalid pipeline order

Route and integration suites continue to validate runtime behavior separately.
