---
slice: mw-a2-e-determinism-and-integration-hardening
date: 2026-04-06
author: AI (GPT-5)
last_reviewed: 2026-04-06
status: Accepted
---

# Closeout: MW-A2-E Determinism And Integration Hardening

## Think-First Analysis

- Problem summary:
  `MW-A2-D` closed boundary naming and wiring, but hard deterministic identity
  and negative-path vectors still needed explicit closure across
  contracts/planner/api.
- Root cause:
  The planner input hash still depended on raw input ordering and
  provenance-only node metadata, and contract/API tests did not yet lock all
  frozen negative vectors in one wave.
- Constraints and invariants:
  `AGENTS.md`; `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`;
  `docs/planning/proposals/mandatory/runtime-and-contracts/mw-a2-generic-graph-source-plan-20260404.md`.
- Selected option:
  Harden identity and invariants at source:
  contract-level semantic graph checks + deterministic semantic hashing in
  planner + API parser/integration coverage updates.

## Pre-Implementation Brief

- Mode:
  Full (code + tests + planning closeout)
- Scope:
  Close `MW-A2-E` by enforcing deterministic semantic identity and frozen
  negative-path vectors in contract/planner/api.
- Touched paths:
  `packages/@dvt/contracts/src/schemas.ts`,
  `packages/@dvt/contracts/test/planner.contract.test.ts`,
  `packages/@dvt/planner/src/domain/PlanAssembler.ts`,
  `packages/@dvt/planner/test/unit/determinism.test.ts`,
  `packages/@dvt/planner/test/unit/graph.test.ts`,
  `packages/@dvt/planner/test/unit/planner-facade.test.ts`,
  `apps/api/test/entrypoints/http/startRunRouteParserHelpers.test.ts`,
  `apps/api/test/integration/plannerEngineContract.test.ts`,
  `docs/planning/state/agent-lane-a.yaml`,
  `docs/planning/closeouts/20260406-mw-a2-e-determinism-and-integration-hardening-closeout.md`.
- Out-of-scope:
  Remaining `MW-A2-B` contract cleanup work and any runtime dispatcher changes.

## Delivered Hardening State

- Contract hardening:
  - `GenericGraphSourceV1Schema` now rejects duplicate `nodeId` values.
  - `GenericGraphSourceV1Schema` now rejects missing dependency targets.
  - `DbtManifestRefSchema` now requires absolute URI format.
- Determinism hardening:
  - Planner semantic input hash now normalizes node ordering,
    dependency ordering, and selection ordering.
  - Provenance-only node metadata is excluded from semantic input hash.
- API/planner coverage hardening:
  - API parser tests now fail-closed on duplicated nodes, broken dependencies,
    and malformed `manifestRef.uri`.
  - Planner facade/integration tests prove plan identity stability when
    `sourceFamily`/`sourceVersion` or node metadata change only.

## Validation Evidence

- `pnpm --filter @dvt/contracts test`
- `pnpm --filter @dvt/planner test`
- `pnpm --filter dvt-api test`
- `pnpm docs:workboard:generate`
- `pnpm docs:sync`
- `pnpm verify:prepush`

## No-Debt / No-Stub Evidence

- No stubs/placeholders/fake paths were introduced.
- No hooks or quality gates were bypassed.
- No lint/type/test rules were relaxed.
- No hidden compatibility downgrade was introduced.
