---
title: Admin Rebuild Snapshot User Manual
status: Active
owner: Operations / Support / Docs
last_reviewed: 2026-04-05
---

# Admin Rebuild Snapshot User Manual

This manual explains how operators use the admin endpoint that rebuilds a run
snapshot from persisted events.

## Context

Use this operation when run status looks stale, missing, or inconsistent in
read views and you need to force snapshot reconstruction.

## Audience

- on-call operators
- support engineers
- QA reviewers validating incident recovery

## What this action does

`POST /admin/runs/:runId/rebuild-snapshot` replays the run event history and
overwrites the materialized snapshot for that run and tenant.

The endpoint returns only:

- `runId`
- `status`

## Access requirements

1. Admin routes must be enabled in the API deployment.
2. Caller must send a valid Bearer token.
3. Authorization must grant command action `admin:rebuild-snapshot`.
4. Request body must contain a valid non-empty `tenantId`.

## Request format

```http
POST /admin/runs/{runId}/rebuild-snapshot
Authorization: Bearer <token>
Content-Type: application/json

{
  "tenantId": "tenant-a"
}
```

## Success response

`200 OK`

```json
{
  "runId": "r42",
  "status": "RUNNING"
}
```

## Error responses

- `401 unauthorized`: missing/invalid token.
- `403 forbidden`: action not granted for caller.
- `400 bad_request`: invalid request body or tenant identifier.
- `404 not_found`: run does not exist in requested tenant scope.
- `500 internal_server_error`: unexpected rebuild failure.

## Operator procedure

1. Confirm incident scope (`tenantId`, `runId`, observed mismatch).
2. Call rebuild endpoint once with admin token.
3. Verify `200` response and returned status.
4. Re-check the affected run status views.
5. If status is still inconsistent, escalate with request/response evidence.

## Recommended evidence to capture

- UTC timestamp of request
- tenant and run identifiers
- HTTP status code
- response body
- post-action status check result

## Example curl

```bash
curl -X POST "https://<api-host>/admin/runs/r42/rebuild-snapshot" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"tenant-a"}'
```

## References

- [Admin route implementation](../../apps/api/src/entrypoints/http/adminRoutes.ts)
- [Access contract tests](../../apps/api/test/contracts/adminRebuildSnapshotAccessContract.test.ts)
