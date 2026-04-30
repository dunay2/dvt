---
title: AR-D continuation safety closeout
status: Draft
owner: Runtime / Temporal / Contracts
last_reviewed: 2026-04-30
planning_type: closeout
task_id: AR-D-PLAN-POINTER
---

# AR-D Continuation Safety Closeout

## Think-First Analysis

Problem summary: `AR-D-PLAN-POINTER` removed full-plan workflow input, but
continuation safety still had weak failure semantics and one unbounded cursor
field.

Root cause: `PlanRef.expiresAt` was contract data without executable lifecycle
behavior, `processedControlSignalIds` was treated as append-only cursor state,
and workflow failure payloads collapsed distinct continuation failures into
generic `WORKFLOW_FAILURE`.

Constraints and invariants: ADR-0003 keeps lifecycle authority in DVT, ADR-0004
requires event-sourced run truth, ADR-0008 owns signal idempotency, ADR-0012
owns plan integrity, ADR-0014 keeps provider adapters behind run-driven ports,
and ADR-0052 defines the continuation safety semantics added by this slice.

Options considered:

- Leave errors generic and rely on logs: rejected because operators and tests
  cannot distinguish cursor overflow from unavailable plan artifacts.
- Store every processed signal id forever: rejected because cursor payloads
  become unbounded under long-running control traffic.
- Externalize signal id history now: rejected as larger than this slice; bounded
  recent retention removes the immediate continuation payload risk without a
  new storage contract.

Selected option and rationale: add governed `RunFailed.reason` values, enforce
`PlanRef.expiresAt` at the integrity boundary, map continuation failures to
typed runtime reasons, and retain only a bounded recent control-signal id
window in cursor state.

## Pre-Implementation Brief

Mode: Full.

Scope:

- Contracts: add continuation safety `RunFailed.reason` values.
- Engine: reject expired `PlanRef` values before fetching plan bytes.
- Temporal adapter: bound cursor signal-id retention and map continuation
  failures to governed reasons.
- Docs: ADR, component guide, spec, evidence, risk, and closeout.

Out of scope:

- Full AR-D2 production capacity SLA.
- Indexed segment-manifest artifacts.
- Mixed old/new Temporal workflow replay compatibility.

Validation plan:

- `pnpm --filter @dvt/contracts test`
- `pnpm --filter @dvt/engine test`
- `pnpm --filter @dvt/adapter-temporal test`
- targeted Temporal continuation tests
- `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`
- `pnpm docs:sync`
- `pnpm docs:status:generate`
- `pnpm verify:prepush`

## Result

The implementation adds explicit continuation failure reasons:
`CURSOR_OVERFLOW`, `PLAN_REF_EXPIRED`, and `PLAN_REF_UNAVAILABLE`.

Expired `PlanRef` values now fail in `PlanIntegrityValidator` before the
fetcher is called. Continue-as-new cursor construction now keeps only the
recent bounded control-signal id window. Workflow failure payload shaping maps
cursor overflow, expired PlanRef, and unavailable PlanRef artifact errors to
governed `RunFailed` reasons.

## Residual Risk

AR-D2 remains open. This closeout improves correctness and observability of
continuation failures, but it does not define final production thresholds for
maximum workflow history size, segment count, or plan artifact retention by
deployment profile.
