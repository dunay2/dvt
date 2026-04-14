---
slice: TF-C2-runtime-vertical-acceptance
date: 2026-04-13
lane: C
author: AI (Codex)
last_reviewed: 2026-04-13
---

# Closeout: TF-C2 runtime vertical acceptance

## Think-First Analysis

### Problem summary

`TF-C2-A` and `TF-C2-B` are already landed with code, tests, runbook, and
accepted evidence, but the parent `TF-C2` still sits open in the runtime lane.

That left the planning system saying the first PostgreSQL-backed
execution-first runtime vertical was still unfinished even though the executor
path, the caller-visible evidence path, and the canonical local proof wrapper
already existed in mainline.

### Root cause

The vertical was deliberately sliced into executor and read-surface work, and
those slices closed with their own evidence. The parent task never got its own
acceptance artifact that answers the only remaining question:

is the first runtime vertical now credible enough to treat as shipped while
leaving repeatability/reset discipline and phase-2 executor expansion to their
own downstream tasks?

Without that parent acceptance record, status surfaces kept presenting the
runtime vertical as open work instead of distinguishing:

1. shipped runtime behavior in `TF-C2`;
2. repeatability and reset discipline in `TF-D1`; and
3. phase-2 dbt executor expansion in `TF-C3`.

Validation also exposed two local proof-path assumptions that were not yet
governed enough for the canonical wrapper:

1. the Vitest lane assumed a workspace install had already materialized the
   `@dvt/adapter-postgres` package link for `@dvt/adapter-temporal`;
2. the proof wrapper assumed only the `docker compose` v2 subcommand existed.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, doc-driven closure, no hidden debt, and
  mandatory validation evidence.
- `docs/guides/ai-work-protocol.md`: this is `Slim` mode because it closes and
  synchronizes an existing shipped behavior rather than introducing a new API or
  runtime contract.
- `docs/planning/state/planning-control-tower.md`: closing implementation work
  must update the closeout, the owning lane YAML, and the canonical status
  surfaces whose posture changes.
- `docs/adr/ADR-0003-execution-model.md`: DVT remains the lifecycle authority;
  the provider-owned PostgreSQL execution seam is valid only because it stays
  inside DVT-owned runtime semantics.
- `docs/adr/ADR-0004-event-sourcing-strategy.md`: caller-visible runtime truth
  must remain projection-backed, not route-local inference.
- `docs/adr/ADR-0015-getRunStatus-read-model-separation.md`: runtime read
  surfaces must stay snapshot-owned and provider-independent by default.
- `docs/planning/proposals/mandatory/runtime-and-contracts/transformation-flow-delivery-plan-20260405.md`:
  `TF-C2` is complete when a persisted `PlanRef` can execute one PostgreSQL
  transformation end to end, the local Docker proof path is canonical, and read
  surfaces expose sink evidence and failure diagnostics.

### Options considered

1. Leave `TF-C2` open until `TF-D1` closes the repeatable reset and retention
   lifecycle.
2. Close `TF-C2` now with a parent acceptance artifact that cites the landed
   executor, read-surface, and proof-environment evidence, while hardening the
   local proof path so it matches the documented wrapper contract and keeping
   `TF-D1`, `TF-C1`, and `TF-C3` explicitly open.
3. Reopen executor or read-surface code and add a new third runtime slice just
   to manufacture more implementation churn before closure.

### Selected option and rationale

Choose option 2.

The parent target for `TF-C2` is already satisfied by shipped code:

1. persisted `PlanRef` execution through the PostgreSQL runtime exists;
2. the canonical Docker proof wrapper exists; and
3. caller-visible read surfaces expose materialization and failure evidence.

What was missing was parent-level acceptance evidence, status synchronization,
and one last hardening pass on the canonical local proof path. Closing the
parent now is the honest move because it separates delivered runtime truth from
the still-open repeatability and phase-2 work.

### Rejected alternatives

- Option 1 was rejected because it incorrectly folds Lane D repeatability work
  into Lane C runtime-delivery closure and keeps the planning system noisier
  than the shipped code truth.
- Option 3 was rejected because there is no missing executor or read-surface
  implementation left to justify a new runtime code slice.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `docs/planning/closeouts/20260413-tf-c2-runtime-vertical-acceptance-closeout.md`
  - `docs/evidence/ED-20260413-tf-c2-runtime-vertical-acceptance.md`
  - `docs/risk-register/quality/R-20260413-TF-C2-LOCAL-POSTGRES-PROOF-COMPATIBILITY.yaml`
  - `docs/planning/state/agent-lane-c.yaml`
  - `docs/planning/state/domain-status-board.md`
  - `docs/architecture/system-delivery-status.md`
  - `docs/planning/roadmap/strategic-product-roadmap.md`
  - `docs/planning/roadmap/roadmap-by-domain.md`
  - `docs/runbooks/temporal-postgres-proof-environment.md`
  - `scripts/README.md`
  - `scripts/run-temporal-postgres-proof.cjs`
  - `packages/@dvt/adapter-temporal/vitest.config.ts`
- Expected outcome:
  - `TF-C2` is marked `done` with a parent-level acceptance record
  - runtime status surfaces stop describing the first PostgreSQL execution
    vertical as still pending
  - the canonical local proof wrapper no longer depends on a preexisting
    workspace symlink for `@dvt/adapter-postgres` or on Docker Compose v2 only
  - downstream work remains explicit under `TF-D1`, `TF-C1`, `TF-C3`, and
    `WE-HX`
- Risks and mitigations:
  - Risk: close the parent too early and blur the still-open repeatability work
  - Mitigation: state explicitly that `TF-D1` remains open and is not absorbed
    into `TF-C2`
  - Risk: status docs overclaim end-to-end product closure
  - Mitigation: keep Lane A, Lane C preview convergence, and Lane E parent
    dependencies explicitly open
- Out of scope:
  - new PostgreSQL executor behavior
  - new read-surface contract changes
  - Docker reset or retention lifecycle implementation under `TF-D1`
  - dbt executor phase-2 work under `TF-C3`
- Validation plan:
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm docs:gov:links:changed`
  - `pnpm exec eslint --max-warnings 0 packages/@dvt/adapter-temporal/vitest.config.ts scripts/run-temporal-postgres-proof.cjs`
  - `pnpm test:adapter-temporal:integration:postgres:docker`
  - `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`
  - `ARC_JSON=arc.json node tools/ci/doc-check.mjs`
  - `pnpm --filter dvt-api test`
  - `pnpm --filter @dvt/web typecheck`
  - `pnpm --filter @dvt/web test`
  - `pnpm verify:prepush`
- Test coverage plan:
  - canonical local Docker PostgreSQL proof still completes end to end
  - API run reads stay green while exposing the shipped outcome evidence
  - web run detail still renders the shipped result surface
  - generated planning views and docs indexes stay synchronized

## Implementation Summary

- Added a parent closeout and accepted evidence record for `TF-C2` instead of
  inventing a new runtime implementation slice.
- Hardened the canonical local Postgres proof path so the Vitest lane resolves
  the built `@dvt/adapter-postgres` entry explicitly and the wrapper supports
  both `docker compose` and `docker-compose`.
- Marked `TF-C2` as closed in Lane C and linked the parent task to the shipped
  Postgres-capability proof and caller-visible read-surface evidence.
- Updated the domain, roadmap, and current-status surfaces so they no longer
  describe the first PostgreSQL execution vertical as unresolved runtime work.
- Kept the remaining open work explicit:
  - `TF-D1` owns proof-environment reset and retention discipline
  - `TF-C1` still owns final preview-persist convergence
  - `TF-C3` still owns phase-2 dbt executor mode
  - `WE-HX` still owns broader runtime boundary hardening

## Validation Run

- `pnpm docs:sync`
- `pnpm docs:workboard:generate`
- `pnpm docs:gov:links:changed`
- `pnpm test:adapter-temporal:integration:postgres:docker`
- `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`
- `ARC_JSON=arc.json node tools/ci/doc-check.mjs`
- `pnpm --filter dvt-api test`
- `pnpm --filter @dvt/web typecheck`
- `pnpm --filter @dvt/web test`
- `pnpm verify:prepush`
