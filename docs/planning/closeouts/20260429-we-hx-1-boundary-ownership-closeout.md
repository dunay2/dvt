---
title: WE-HX-1 boundary ownership closeout
status: Draft
owner: Architecture / Engine / Artifacts / API
last_reviewed: 2026-04-29
planning_type: closeout
---

# WE-HX-1 Boundary Ownership Closeout

## Think-First Analysis

### Problem Summary

`WE-HX-1` needs to close boundary ownership mapping for the external seams around
`WorkflowEngine`: `PlanRef`, `runExecutionContextRef`, the engine resolver seam,
and artifact-backed plan or context readers. The current docs describe the target
shape, but the implementation still leaves one ownership smell: plan artifact
fetching is declared inside `IRunStateStore`, while a second `IPlanFetcher` file
exists under `src/adapters` with a different return shape. That makes the seam
look state-store-owned or adapter-owned when the active behavior is really an
engine-owned need fulfilled by an artifact-backed reader at composition time.

### Root Cause

The engine ports were previously collected in broad files during the RC-G1
migration. `IRunStateStore` retained non-state-store symbols because it was the
historical place where engine persistence-adjacent types lived. Later
PlanRef/artifact work introduced dedicated artifact ownership, but the code did
not finish the semantic split: plan fetching stayed physically grouped with run
state, and the unused `src/adapters/IPlanFetcher.ts` drifted away from the
runtime contract shape.

### Constraints And Invariants

- `ADR-0003`: DVT owns execution semantics; adapters translate provider runtime
  behavior and must not own lifecycle semantics.
- `ADR-0004`: persisted run facts and projections remain event-sourced and
  state-store-owned; non-state artifact reading should not be hidden in the run
  state port.
- `ADR-0012`: engine owns the authoritative plan integrity gate before adapter
  dispatch; adapters receive the verified immutable `PlanRef`.
- `ADR-0014`: provider adapters are run-driven and execute an engine-approved
  `PlanRef`; they are not the authoritative plan verifier.
- `ADR-0034`: artifact behavior belongs to the Artifacts bounded context; engine
  may define its own port for execution use-case needs, and composition roots
  adapt artifact readers to that port.
- `ADR-0042`: public `ExecutionPlan` identity stays in `@dvt/contracts`; engine
  must not invent an alternate plan shape.
- `ADR-0043`: plan-storage behavior belongs to `@dvt/artifacts`; the engine may
  consume a narrow port that returns bytes plus execution policy for integrity
  validation.

### Options Considered

1. **Docs-only ownership map.** Rejected because the duplicate `IPlanFetcher`
   and `IRunStateStore` grouping would keep misleading code-level drift.
2. **Move all plan fetch behavior into `@dvt/artifacts` and import it directly
   from `@dvt/engine`.** Rejected because it would make the execution domain
   depend on artifact behavior directly instead of consuming an engine-owned
   port wired by composition roots.
3. **Create a narrow engine-owned plan artifact reader port and update docs and
   tests around it.** Selected because it preserves hexagonal direction:
   `@dvt/engine` defines the need, `apps/api` wires an artifact-backed
   implementation, and `@dvt/artifacts` remains the artifact behavior owner.

### Selected Option And Rationale

Create a dedicated `packages/@dvt/engine/src/ports/IPlanArtifactReader.ts` for
`IPlanFetcher`, `IPlanIntegrityValidator`, and `StoredPlanArtifact`; remove the
duplicate `src/adapters/IPlanFetcher.ts`; update engine imports and public
exports; and add a semantic architecture test proving ownership rather than
checking only barrel thinness.

### Rejected Alternatives

- Keep compatibility aliases in `IRunStateStore`: rejected because the user has
  explicitly ruled out legacy compatibility drift.
- Rename the port to an artifacts-domain name inside engine: rejected because
  engine should describe its use-case need, not the implementation package.
- Add a shared-kernel port to `@dvt/contracts`: rejected by ADR-0034 and
  RC-G1; behavior ports do not belong in the shared kernel.

## Pre-Implementation Brief

- **Mode:** Full.
- **Scope:** Engine boundary ownership docs/tests/code, with API import fallout
  only where root exports are consumed.
- **Touched paths:** `packages/@dvt/engine/src/ports`, engine application and
  security imports, engine public exports, engine architecture tests, workflow
  engine architecture docs, planning closeout, evidence/risk if ARC requires it.
- **Expected outcome:** `IRunStateStore` contains only run-state concerns;
  plan artifact fetching is a separate engine-owned port; docs explain the
  `PlanRef` and `runExecutionContextRef` ownership chain with diagrams; tests
  fail if the seam drifts back into state store or adapter-local duplicate
  contracts.
- **Risks and mitigations:** Public engine export movement may affect `apps/api`;
  keep the root `@dvt/engine` symbol stable while changing the source module.
  Docs changes can stale indexes; run `pnpm docs:sync`.
- **Out of scope:** No runtime behavior change, no new endpoint, no adapter
  execution behavior change, no provider routing model.
- **Validation plan:** targeted engine architecture test red/green, engine test,
  engine typecheck/build, affected API typecheck/build if imports require it,
  ARC check, docs sync, and `pnpm verify:prepush`.
- **Test coverage plan:** negative architecture checks that reject
  `IPlanFetcher` returning to `IRunStateStore`, reject duplicate
  `src/adapters/IPlanFetcher.ts`, require owned-concern docblocks, and require a
  component guide with public API/invariants/transitions/consumers/diagrams.
- **Libraries evaluated:** None evaluated; this is boundary ownership and
  TypeScript module hygiene, not a new algorithm or infrastructure need.

## Normative Baseline

- `ADR-0003`
- `ADR-0004`
- `ADR-0012`
- `ADR-0014`
- `ADR-0034`
- `ADR-0042`
- `ADR-0043`

## Work Performed

- Added `packages/@dvt/engine/src/ports/IPlanArtifactReader.ts` as the
  engine-owned plan artifact reader port.
- Removed `packages/@dvt/engine/src/adapters/IPlanFetcher.ts`.
- Removed `IPlanFetcher`, `IPlanIntegrityValidator`, and `StoredPlanArtifact`
  from `IRunStateStore`.
- Updated start-run, recover-run, and plan-integrity imports to use the new
  dedicated port.
- Added `workflowEngineBoundaryOwnership.architecture.test.ts` to prove
  semantic ownership, not only barrel thinness.
- Added the local component guide
  `workflow-engine-boundary-ownership-component.md`.
- Added local user stories in
  `workflow-engine-boundary-ownership-user-stories.md`, including negative
  scenarios for state-store drift, duplicate fetcher contracts, API DTO
  redeclaration, missing review material, and missing owned-concern docblocks.
- Added Fowler review mailbox analysis in
  `docs/planning/reviews/architecture-and-governance/20260429-we-hx-1-fowler-architecture-review.md`.
- Reused the engine-owned `StoredPlanArtifact` shape from
  `apps/api/src/application/ports/storedPlan.ts` instead of keeping an
  equivalent API-local interface.
- Added `@ownedConcern` module headers to the start-run, recovery, and
  plan-integrity modules touched by the boundary split.
- Updated engine architecture docs, implementation diagrams, generated code
  status, evidence, risk, and Lane A planning state.

## Validation Evidence

- `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts`
  - Red first: failed because `IPlanArtifactReader.ts` and the component guide
    did not exist, and duplicate `adapters/IPlanFetcher.ts` still existed.
  - Green after implementation: passed, 3 tests.
- `pnpm --filter @dvt/engine typecheck`
  - Passed.
- `pnpm --filter @dvt/engine test`
  - Passed: 47 files, 378 tests.
- `pnpm --filter dvt-api typecheck`
  - Passed.
- `pnpm docs:workboard:generate`
  - Passed.
- `pnpm docs:status:generate`
  - Passed.
- `pnpm docs:sync`
  - Passed.
- `$env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs`
  - Passed.
  - Result: `effectiveArcLevel = ARC-2`, `evidenceDoc = true`,
    `riskUpdate = true`.
- `pnpm verify:prepush`
  - Passed after commit.
  - Included docs generated-artifact checks, changed markdown lint, ARC evidence
    validation, changed-file checks, forbidden tracked-file check, and affected
    workspace typecheck for `@dvt/engine` plus downstream affected packages.
- Follow-up TDD pass:
  - Red:
    `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts`
    failed because local user stories and the Fowler review were missing,
    application/security modules lacked owned-concern docblocks, and API still
    redeclared `StoredPlanArtifact`.
  - Green:
    passed with 5 tests after adding the stories, review, owned-concern
    headers, and API artifact-shape reuse.

## No-Debt And No-Stub Evidence

- No compatibility alias was left in `IRunStateStore`.
- No new TODO/FIXME, placeholder, or fake implementation was added.
- No lint, type, test, docs, or hook rules were relaxed.
- No hooks were bypassed.
- No CodeRabbit workflow was used.
- No new ADR was required; this slice applies the accepted ADR baseline rather
  than introducing a new architectural decision.
