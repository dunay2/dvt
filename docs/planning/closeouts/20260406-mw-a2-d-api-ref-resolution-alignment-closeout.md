---
slice: mw-a2-d-api-ref-resolution-alignment
date: 2026-04-06
author: AI (GPT-5)
last_reviewed: 2026-04-06
status: Accepted
---

# Closeout: MW-A2-D API And Ref-Resolution Alignment

## Think-First Analysis

- Problem summary:
  `MW-A2-C` left generic graph-source ingestion in place, but resolver naming and
  API composition-root wiring still presented a manifest-centric story.
- Root cause:
  Legacy resolver naming (`IArtifactResolver`, `resolver`,
  `manifestRefCacheSize`) persisted across planner/API seams even after
  GenericGraphSource became canonical.
- Constraints and invariants:
  `AGENTS.md`; `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`;
  `docs/planning/proposals/mandatory/runtime-and-contracts/mw-a2-generic-graph-source-plan-20260404.md`.
- Selected option:
  Introduce canonical graph-source resolver naming with compatibility aliases,
  then migrate API/planner wiring and tests to canonical names.

## Pre-Implementation Brief

- Mode:
  Full (code + tests + planning closeout)
- Scope:
  Close `MW-A2-D` by aligning planner/API resolver semantics to graph-source
  language while preserving backward compatibility for existing callers.
- Touched paths:
  `packages/@dvt/planner/src/ports/IGraphSourceResolver.ts`,
  `packages/@dvt/planner/src/ports/IArtifactResolver.ts`,
  `packages/@dvt/planner/src/application/PlannerFacade.ts`,
  `packages/@dvt/planner/src/application/ManifestRefGraphSourceCache.ts`,
  `packages/@dvt/planner/src/index.ts`,
  `packages/@dvt/planner/test/unit/planner-facade.test.ts`,
  `apps/api/src/infrastructure/planner/ManifestArtifactResolver.ts`,
  `apps/api/src/modules/buildProtectedRuntimeModule.ts`,
  `apps/api/test/integration/plannerEngineContract.test.ts`,
  `docs/planning/state/agent-lane-a.yaml`,
  `docs/planning/closeouts/20260406-mw-a2-d-api-ref-resolution-alignment-closeout.md`.
- Out-of-scope:
  `MW-A2-B` contract hard cleanup and `MW-A2-E` determinism/negative-path
  hardening wave.

## Delivered Boundary State

- Planner canonical resolver port is now `IGraphSourceResolver`.
- `PlannerFacade` canonical options are now:
  `graphSourceResolver` and `graphSourceRefCacheSize`.
- Legacy options remain as compatibility aliases:
  `resolver` and `manifestRefCacheSize`.
- API composition root now wires planner using canonical
  `graphSourceResolver` and `GraphSourceArtifactResolver` naming.
- Legacy class name `ManifestArtifactResolver` remains available as explicit
  compatibility alias.

## Validation Evidence

- `pnpm --filter @dvt/planner test`
- `pnpm --filter dvt-api test`
- `pnpm docs:workboard:generate`
- `pnpm docs:sync`
- `pnpm verify:prepush`

## No-Debt / No-Stub Evidence

- No stubs/placeholders/fake paths were introduced.
- No hooks or quality gates were bypassed.
- No lint/type/test rules were relaxed.
- Compatibility aliases are explicit and covered by tests.
