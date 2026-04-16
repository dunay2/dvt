---
title: Closeout - AR-A12-A contract-pack reset
status: Complete
owner: Architecture / Engine / Docs
last_reviewed: 2026-04-13
planning_type: closeout
slice: 20260413-ar-a12-a-contract-pack-reset
---

# Closeout: AR-A12-A contract-pack reset

## Think-First Analysis

### Problem summary

The top-level contract registries were already describing a single active `v1`
runtime pack, but the live docs tree still preserved alternate reading paths:

- `IRunEnrichmentService.v1.md` was still elevated into the active pack list
  even though the reset plan treats it as a companion service contract;
- `RunEventCatalog.v1.md` remained as an alias entrypoint for `RunEvents`;
- `GlossaryContract.v2.0.md` still coexisted with `GlossaryContract.v1.md`;
- the machine-readable event-schema entrypoint still published
  `RunEventRecord.v2.0.schema.json` and `RunEventWrite.v2.0.schema.json` as
  current assets.

That meant the repo still asked readers to infer which surfaces were canonical,
which is exactly the ambiguity `AR-A12-A` exists to remove.

### Root cause

The reset began by rewriting the main `v1` contracts and the high-level
registry pages first, but older alias and sibling assets remained in the active
tree because they were treated as harmless companions. In a pre-stable
single-line policy, they are not harmless: they preserve a second reading path.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, docs/contracts/planning alignment,
  no hidden debt, required validation, and explicit closeout evidence.
- `docs/guides/ai-work-protocol.md`: this is a `Full` slice because it changes
  the governed runtime contract surface and planning posture.
- `docs/architecture/components/engine/contracts/VERSIONING.md`: the active
  engine-runtime boundary must keep one live `v1` file per topic and remove
  `v1.1`, `v2`, `reference`, redirect, and migration companions from the
  active reading path.
- `docs/planning/proposals/mandatory/runtime-and-contracts/contract-pack-and-read-boundary-reset-plan-20260410.md`:
  the active pack after reset must expose only `IWorkflowEngine.v1`,
  `IProviderAdapter.v1`, `RunEvents.v1`, `ExecutionSemantics.v1`, and
  `SignalsAndAuth.v1`.
- `docs/planning/reviews/architecture-and-governance/20260410-contract-pack-and-read-boundary-reset-fowler-review.md`:
  the docs tree must stop publishing mixed-generation truth.

### Selected approach

Rewrite the active registries and companion entrypoints so the pack contains
only the five canonical `v1` contracts, then remove every remaining alias or
parallel sibling in the active tree for the touched topics.

This keeps git as the historical record and leaves the live docs tree with one
truth only.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - demote `IRunEnrichmentService.v1.md` from active pack to companion page
  - remove the `RunEventCatalog` alias entrypoint from the active tree
  - remove the parallel `GlossaryContract.v2.0.md` sibling
  - rename the active run-event machine-readable schemas onto the `v1` line
  - align workflow references, glossary references, ADR pointers, and planning
    state to the same one-line policy
- Touched files or paths:
  - `docs/architecture/components/engine/contracts/index.md`
  - `docs/architecture/components/engine/contracts/README.md`
  - `docs/architecture/components/engine/contracts/engine/index.md`
  - `docs/architecture/components/engine/contracts/capabilities/README.md`
  - `docs/architecture/components/engine/contracts/engine/events/index.md`
  - `docs/architecture/components/engine/contracts/engine/events/*.schema.json`
  - `docs/architecture/components/engine/architecture/workflows.md`
  - `docs/concepts/glossary.md`
  - `docs/adr/ADR-0005-contract-formalization-tooling.md`
  - `docs/CONTRIBUTING.md`
  - `docs/planning/state/agent-lane-a.yaml`
- Expected outcome:
  - the published engine-runtime pack exposes one canonical read order only
  - no alias or parallel sibling remains in the active tree for the touched
    runtime topics
  - contributor guidance and workflow/navigation docs match the same policy
- Risks and mitigations:
  - Risk: deleting alias or old-version files can leave dead links in docs
  - Mitigation: update every active reference in the same slice and run docs
    sync plus link validation
  - Risk: the planning state could lag behind the actual closure
  - Mitigation: close `AR-A12-A` and the umbrella `AR-A12` in the same slice
- Out-of-scope items:
  - rewriting historical ADR reasoning that mentions older version numbers as
    historical context
  - removing non-runtime contract families that evolve on different timelines
    under the same component tree
  - code-path changes already handled under `AR-A12-B` and `AR-A12-C`
- Validation plan:
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm lint:md`
  - `pnpm docs:gov:links:changed`
  - `pnpm verify:prepush`

## Final Closeout

### Implementation summary

`AR-A12-A` is now true in the active docs tree.

- The active pack in the contracts landing page, registry, and engine-runtime
  index now exposes only:
  - `IWorkflowEngine.v1`
  - `IProviderAdapter.v1`
  - `RunEvents.v1`
  - `ExecutionSemantics.v1`
  - `SignalsAndAuth.v1`
- `IRunEnrichmentService.v1` remains available, but only as a companion
  entrypoint rather than part of the published pack.
- The alias page `RunEventCatalog.v1.md` was removed from the active tree and
  workflow references now point directly at `RunEvents.v1.md`.
- `GlossaryContract.v2.0.md` was removed so the active tree no longer keeps two
  glossary generations for the same topic.
- The active run-event machine-readable assets were renamed to
  `RunEventRecord.v1.schema.json` and `RunEventWrite.v1.schema.json`, and the
  event-schema index plus ADR references now point at the `v1` line.
- The generated contracts index now resolves against
  `packages/@dvt/contracts/src/contracts/engine/ExecutionSemantics.v1.ts` and
  `RunEvents.v1.ts` because the last `v2` contract filenames in
  `@dvt/contracts` were aligned to the active line.
- `AgnosticEventLayerStrategy.v2.0.1.md` and
  `DECISION_AND_RISK_LOG_v2.0.0.md` were removed from the active tree because
  they preserved a second `v2` explanation for the run-events topic.
- Contributor guidance now spells out the canonical read order and clarifies
  that companion docs must not become alternate normative entrypoints.

### Acceptance check

| Requirement                                                                  | Result |
| ---------------------------------------------------------------------------- | ------ |
| One canonical read order exists for the engine-runtime pack                  | Passed |
| No active surface points readers into mixed-generation truth                 | Passed |
| Published registries and companion entrypoints expose the same one-line pack | Passed |
| Contributor-facing versioning guidance matches the one-line policy           | Passed |
| No parallel file remains in the active tree for the touched runtime topics   | Passed |

### Validation evidence

- `pnpm docs:sync`
- `pnpm docs:workboard:generate`
- `pnpm docs:status:generate`
- `node scripts/generate-spec-traceability-report.cjs`
- `pnpm --filter @dvt/contracts build`
- `pnpm --filter @dvt/contracts test`
- `pnpm test:engine`
- `pnpm exec eslint --max-warnings 0 packages/@dvt/contracts/src/contracts/engine/ExecutionSemantics.v1.ts packages/@dvt/contracts/src/contracts/engine/RunEvents.v1.ts packages/@dvt/contracts/src/schemas.ts packages/@dvt/contracts/src/validation.ts packages/@dvt/engine/test/idempotency.vectors.test.ts`
- `pnpm lint:md`
- `pnpm docs:gov:links:changed`
- `pnpm verify:prepush`

### No-debt and no-stub evidence

- No new debt entry was created.
- No rules, hooks, or quality gates were relaxed.
- No placeholder, fake implementation, compatibility alias, or redirect stub
  was introduced.
