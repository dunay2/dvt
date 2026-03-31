# HttpErrorEnvelope v1

## Status

- Status: Accepted
- Version: `v1`
- Owners: `apps/api`
- Effective date: `2026-03-31`

## Purpose

`HttpErrorEnvelope.v1` is the canonical caller-visible error contract for
`apps/api` HTTP entrypoints.

The contract separates:

- transport status code
- machine-readable error type
- machine-readable semantic reason
- optional target field
- optional structured details

This replaces route-local `{ error, code }` payloads and prevents status
mapping from depending on customizable string-equality checks or exception
message parsing.

## Envelope

```json
{
  "error": {
    "type": "bad_request",
    "reason": "invalid_tenant_id",
    "target": "tenantId",
    "details": {
      "runId": "run-123"
    }
  }
}
```

## Fields

- `error.type`: stable category that determines the HTTP status code
- `error.reason`: lower_snake_case semantic reason token
- `error.target`: optional field/path associated with caller input
- `error.details`: optional structured metadata already exposed by the API

## Type To Status Mapping

| `error.type`            | HTTP status |
| ----------------------- | ----------- |
| `bad_request`           | `400`       |
| `unauthorized`          | `401`       |
| `forbidden`             | `403`       |
| `not_found`             | `404`       |
| `conflict`              | `409`       |
| `unprocessable`         | `422`       |
| `rate_limited`          | `429`       |
| `internal_server_error` | `500`       |
| `service_unavailable`   | `503`       |

## Header Rules

- `retry-after` remains an HTTP header for backpressure/rate-limit responses.
- Retry metadata is not duplicated into `error.details` unless a route has a
  separate domain reason to expose.

## Reason Conventions

- Reasons are lower_snake_case.
- Reasons describe semantics, not presentation.
- When an upstream typed rejection code already exists, `error.reason` should
  preserve that stable rejection class instead of collapsing distinct cases into
  a generic fallback.
- Parser outcomes must derive status from parse branches/discriminants, not from
  configurable code equality.
- Route/domain mapping must derive status from typed semantic outcomes or typed
  errors, not from exception message text.

Examples:

- `missing_tenant_scope`
- `missing_tenant_id`
- `invalid_tenant_id`
- `invalid_run_id`
- `missing_capability`
- `unsupported_plan_version`
- `run_not_found`
- `run_already_exists`
- `tenant_access_denied`

## Details Rules

`error.details` may contain only structured metadata already exposed by current
API behavior, such as:

- `runId`
- `adapter`
- `cause`
- `supportedVersions`
- `message`

## Legacy Mapping

| Legacy payload                                                                                                  | `HttpErrorEnvelope.v1`                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `{ "error": "BAD_REQUEST", "code": "INVALID_TENANT_ID" }`                                                       | `{ "error": { "type": "bad_request", "reason": "invalid_tenant_id", "target": "tenantId" } }`                                                 |
| `{ "error": "BAD_REQUEST", "code": "MISSING_TENANT_ID" }`                                                       | `{ "error": { "type": "bad_request", "reason": "missing_tenant_id", "target": "tenantId" } }`                                                 |
| `{ "error": "FORBIDDEN", "code": "MISSING_TENANT_SCOPE" }`                                                      | `{ "error": { "type": "forbidden", "reason": "missing_tenant_scope", "target": "tenantId" } }`                                                |
| `{ "error": "NOT_FOUND", "code": "RUN_NOT_FOUND" }`                                                             | `{ "error": { "type": "not_found", "reason": "run_not_found", "details": { "runId": "<optional>" } } }`                                       |
| `{ "error": "PLAN_REJECTED", "code": "UNSUPPORTED_PLAN_VERSION", "reason": "...", "supportedVersions": [...] }` | `{ "error": { "type": "unprocessable", "reason": "unsupported_plan_version", "details": { "message": "...", "supportedVersions": [...] } } }` |
| `{ "error": "PLAN_REJECTED", "code": "MISSING_CAPABILITY", "reason": "...", "cause": "workflow.pause" }`        | `{ "error": { "type": "unprocessable", "reason": "missing_capability", "details": { "message": "...", "cause": "workflow.pause" } } }`        |

## Scope

This contract governs caller-visible errors emitted by:

- `startRun`
- `cancelRun`
- `signalRun`
- `getRun`
- `getRunEvents`
- `listRuns`
- `admin` operational routes in `apps/api`
