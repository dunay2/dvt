---
title: Closeout - TF-C4 protected workspace graph-draft boundary
status: Review
owner: API / Runtime / Docs
last_reviewed: 2026-04-16
planning_type: closeout
slice: TF-C4-workspace-graph-draft-protected-boundary
---

# Closeout: TF-C4 protected workspace graph-draft boundary

## Think-First Analysis

### Problem summary

Canvas authoring had a frozen contract (`TF-A2`) but no protected backend path
that actually owned editable graph-draft persistence.

That left the product at risk of drifting into:

- browser-local authority
- route-local DTO behavior
- ambiguous read-only vs writable posture
- stale-write overwrite behavior with no canonical revision owner

### Design rule used here

This slice stayed SRP-aligned by separating the boundary into five concerns:

- authorization and capability mapping
- route parsing and HTTP mapping
- read and write use cases
- persistence and idempotency storage
- audit and telemetry emission

## Implementation Summary

- Added protected `GET /workspace/graph/draft` and `PUT /workspace/graph/draft`
  routes in `apps/api`.
- Added a dedicated capability service that maps protected auth outcomes onto
  `writable`, `read_only`, and `forbidden`.
- Added separate read and write use cases so CAS, typed denial, format failure,
  and audit behavior are not embedded inside route handlers.
- Added a PostgreSQL-backed draft store with:
  - tenant/project/environment scoped records
  - authoritative mutable `revision`
  - compare-and-swap rejection on stale writes
  - scoped idempotency tracking for logical retries
- Added structured audit logging and dedicated observability metrics/traces for
  the protected draft path.
- Added route, service, and integration coverage for authorization posture,
  first-save, conflict, and idempotent retry behavior.

## Format And Compatibility Posture

- Active writer version is `workspace-graph-draft.v1`.
- The current runtime compatibility window is intentionally active-writer-only.
- Unsupported or corrupt persisted drafts fail closed through typed outcomes.
- No read migration or write-back is active yet because this slice does not
  have a governed legacy readable version to carry forward.

## Validation Run

- `pnpm --filter dvt-api typecheck`
- `pnpm --filter dvt-api test`
- `pnpm --filter dvt-api test:integration`

## Residuals

- The slice is backend-complete for the protected draft boundary, but Canvas
  adoption still belongs to `TF-E2-A`.
- Integration coverage for the PostgreSQL-backed protected runtime remains
  environment-gated in the normal integration suite; when no integration
  database is configured, the protected-runtime draft tests skip rather than
  faking the path.
