---
title: RC-C1 HTTP Error Envelope Normalization Plan
status: Active
owner: API / Architecture / Delivery / Docs
last_reviewed: 2026-03-31
planning_type: proposal
---

# RC-C1 HTTP Error Envelope Normalization Plan

## Task

Re-scope `RC-C1` from lane C to normalize the caller-visible HTTP error
contract across `apps/api`, replace parser-local wire shaping with semantic
parse issues, and consolidate transport serialization in one boundary mapper.

References:

- `docs/planning/state/agent-lane-c.yaml`
- `docs/planning/state/execution-workboard.md`
- `docs/contracts/shared/HttpErrorEnvelope.v1.md`
- `apps/api/src/entrypoints/http/`

## Rationale

Current HTTP entrypoints mix at least three independent responsibilities:

1. semantic input validation
2. transport-specific status/body shaping
3. domain/auth/runtime error translation

That shape already produced a concrete regression in `cancelRunRouteParser.ts`
and `signalRunRouteParser.ts`, where `403` versus `400` is derived from string
equality against customizable error-code values. Once the code map became open,
semantic meaning and transport mapping drifted apart.

This proposal narrows responsibilities to a hexagonal entrypoint shape:

- parsers produce semantic issues only
- mappers decide HTTP envelope and status
- routes orchestrate transport and use-case delegation only

## Think-First Analysis

- Problem summary:
  `apps/api` returns multiple ad hoc error envelopes, and some route parsers
  decide HTTP status from wire-code equality instead of explicit semantic
  branches.
- Root cause:
  parser helpers currently collapse semantic validation outcome and HTTP wire
  representation into the same return object, so any extension of caller-visible
  codes can silently alter status mapping.
- Constraints and invariants:
  - `ADR-0003`: execution/runtime authority stays inside DVT boundaries
  - `ADR-0004`: tenant scoping is explicit and enforced at boundaries
  - `ADR-0005` and `ADR-0006`: public boundary changes need explicit canonical
    contract and repository-authoritative validation
  - `ADR-0034`: communication between bounded contexts must stay explicit and
    responsibility-narrow
- Options considered:
  - minimal patch in `cancel/signal` only
  - generic helper-only patch preserving current `{ error, code }` wire shape
  - full HTTP boundary refactor with canonical error envelope
- Selected option and rationale:
  full HTTP boundary refactor. The narrower patches would remove the immediate
  bug but preserve the architectural coupling that caused it and would keep
  different route families on divergent error contracts.
- Rejected alternatives:
  - route-local string comparison fixes: insufficient, still transport-coupled
  - compatibility alias layer as default: keeps two public contracts alive
    without a governing need

## Scope

In scope:

- `apps/api` route parsers, runtime command executor, auth/runtime HTTP mapper,
  and admin routes
- typed maintenance-boundary handling for
  `IRunStateStoreMaintenance.rebuildSnapshot`
- the owning adapter and contract surfaces required to enforce that boundary:
  `packages/@dvt/adapter-postgres/src/PostgresRunSnapshotStore.ts` and
  `packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`
- new canonical shared contract doc for HTTP error envelopes
- route/unit/integration test updates for the new error shape
- planning proposal, lane re-scope, closeout, and evidence/risk artifacts

Out of scope:

- success payload redesign
- unrelated adapter metadata-repository legacy errors that do not cross the
  rebuilt-snapshot/public HTTP boundary
- engine, delivery, or planner contract redesign beyond the
  `rebuildSnapshot` maintenance contract note
- consumer compatibility shims unless a real non-test consumer is discovered

## Execution Plan

1. Re-scope `RC-C1` in lane C and regenerate workboard views.
2. Publish `HttpErrorEnvelope.v1` as the canonical shared contract for
   caller-visible API errors.
3. Introduce semantic parse-issue types in `apps/api` and remove parser-local
   HTTP shaping.
4. Consolidate auth, parser, and runtime/domain translation in one HTTP mapper.
5. Migrate all current HTTP routes in `apps/api` to the new envelope.
6. Rewrite route, parser, mapper, and integration tests for the new contract.
7. Lift `rebuildSnapshot` not-found handling to a typed maintenance-boundary
   error and remove remaining parser-local legacy in start-run/admin paths.
8. Sync docs, generate closeout/evidence/risk artifacts, and run validation
   baseline.

## Design Notes

- `error.type` is the transport category (`bad_request`, `forbidden`,
  `unauthorized`, `not_found`, `conflict`, `rate_limited`,
  `service_unavailable`, `unprocessable`, `internal_server_error`).
- `error.reason` is a stable machine token in `lower_snake_case`.
- `error.target` is optional and points to the input field when relevant.
- `error.details` carries route/domain-specific metadata already exposed today
  (for example supported versions, retry metadata, adapter name, runId).
- `retry-after` remains an HTTP header where already applicable.

## Work Breakdown

| ID  | Task                                    | Complexity | Effort | Initial progress |
| --- | --------------------------------------- | ---------- | ------ | ---------------- |
| A0  | Baseline and think-first                | M          | 0.5d   | 100%             |
| A1  | Persist planning surfaces               | S          | 0.5d   | 100%             |
| A2  | Publish canonical HTTP error contract   | M          | 1.0d   | 100%             |
| A3  | Separate parse semantics from transport | L          | 1.5d   | 100%             |
| A4  | Unify HTTP mapper and migrate routes    | L          | 2.0d   | 100%             |
| A5  | Tests, docs, closeout, validation       | M          | 1.5d   | 100%             |

## DoD Checklist (Verifiable)

- [x] `RC-C1` lane entry re-scoped and workboard regenerated
- [x] `docs/contracts/shared/HttpErrorEnvelope.v1.md` published
- [x] no parser in `apps/api/src/entrypoints/http/` returns `{status, body}`
- [x] `cancel/signal` no longer derive status from error-code equality
- [x] all HTTP routes use one mapper module for error serialization
- [x] `rebuildSnapshot` not-found handling uses a typed error at the
      maintenance boundary
- [x] `adminRoutes` no longer parse exception message text to derive `404`
- [x] start-run parser helpers no longer round-trip internal `INVALID_*`
      legacy codes before producing semantic issues
- [x] route/unit/integration tests assert the new envelope
- [x] closeout includes commands run, outcomes, and no-debt/no-stub evidence
- [x] `pnpm --filter dvt-api typecheck` passes
- [x] `pnpm --filter dvt-api test` passes
- [x] `pnpm --filter dvt-api test:integration` passes
- [x] `pnpm --filter dvt-api test:arch` passes
- [x] `pnpm --filter @dvt/adapter-postgres typecheck` passes
- [x] `pnpm --filter @dvt/adapter-postgres test` passes
- [x] `pnpm verify:prepush` passes

## Validation Commands

```bash
pnpm docs:workboard:generate
pnpm docs:status:generate
pnpm docs:sync
node tools/ci/arc-check.mjs
pnpm --filter dvt-api typecheck
pnpm --filter dvt-api test
pnpm --filter dvt-api test:integration
pnpm --filter dvt-api test:arch
pnpm --filter @dvt/adapter-postgres typecheck
pnpm --filter @dvt/adapter-postgres test
pnpm verify:prepush
```

## Tracking Log

| Date       | Owner  | Status         | Notes                                                                                                                               |
| ---------- | ------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-31 | Lane C | Planned        | RC-C1 re-scoped and execution plan captured.                                                                                        |
| 2026-03-31 | Lane C | Implemented    | Canonical envelope published, parsers/routes migrated, tests and prepush baseline passed.                                           |
| 2026-03-31 | Lane C | Reopened       | Follow-up approved to eliminate remaining parser and maintenance-boundary legacy.                                                   |
| 2026-03-31 | Lane C | Re-implemented | Typed `rebuildSnapshot` not-found handling lifted to the boundary, start-run parser legacy removed, and negative regressions added. |
| 2026-03-31 | Lane C | Documented     | Closeout plus evidence/risk artifacts updated to reflect the reopened scope and residual out-of-scope adapter legacy.               |

## Risks And Coordination

- Public API error shape changes are intentional; any discovered real consumer
  outside tests/docs must be documented immediately and may force a temporary
  compatibility shim.
- Start-run already has mapper-local transport semantics; regression risk is
  mitigated by route-level and mapper-level tests.
- Active docs should use `httpErrorMapper`; any remaining `authErrorMapper`
  references are historical only.
- `PostgresRunMetadataRepository` still contains unrelated stringly errors for
  internal adapter invariants; they remain outside RC-C1 unless they become
  caller-visible across a public or maintenance boundary.
