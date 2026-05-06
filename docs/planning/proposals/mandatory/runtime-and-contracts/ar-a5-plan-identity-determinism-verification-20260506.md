---
title: AR-A5 Plan Identity Determinism Verification
status: Accepted
owner: Architecture / Planner / Contracts
last_reviewed: 2026-05-06
planning_type: mandatory-proposal
---

# AR-A5 Plan Identity Determinism Verification

## Summary

`AR-A5` verifies that volatile creation time is not part of plan identity.

The implementation already follows the intended boundary: `PlanAssembler`
derives `planId` from `sha256(JCS(planCore))`, where `planCore` contains only
`metadata.planVersion`, `metadata.inputHashSha256`, and `steps`.
`createdAtIso` is added later to final `ExecutionPlan` metadata and is therefore
record provenance, not content-addressed identity input.

## Scope

In scope:

- close `AR-A5` in Lane A as verified;
- cite the planner, contracts, and engine evidence that already enforces the
  boundary;
- keep generated governance fingerprints aligned.

Out of scope:

- changing `PlanAssembler` hashing behavior;
- changing `ExecutionPlan` metadata shape;
- changing plan storage, run execution, or adapter behavior.

## Command And Query Rail Impact

This slice adds no externally observable product behavior. The governing rail is
a planning and architecture verification query over existing planner identity
evidence.

- Rail: `VerifyPlanIdentityDeterminism`.
- Type: query.
- Bounded context: Planner and contracts.
- DDD owner: `PlanIdentityDeterminismEvidence`.
- Use: confirms `createdAtIso` is outside the plan-core identity hash path.

## Evidence

- `packages/@dvt/planner/src/domain/PlanAssembler.ts` builds `planCore` before
  adding `createdAtIso`.
- `packages/@dvt/planner/test/unit/determinism.test.ts` proves
  `canonicalPlanCoreJson` excludes `createdAtIso` and that different timestamps
  keep the same `planId`.
- `packages/@dvt/contracts/src/schema-packs/planner-build.ts` validates
  `plan.metadata.planId === sha256(canonicalPlanCoreJson)`.
- `packages/@dvt/engine/src/security/planIntegrity.ts` recomputes identity from
  the same plan-core fields.

```feature-mechanization
version: 1
featureId: AR-A5-PLAN-IDENTITY-DETERMINISM
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/ar-a5-plan-identity-determinism-verification-20260506.md
componentGuides:
  - docs/architecture/reference-architecture.md
  - docs/planning/reviews/architecture-and-governance/20260402-deep-architectural-review.md
userStories:
  - docs/planning/proposals/mandatory/runtime-and-contracts/ar-a5-plan-identity-determinism-verification-20260506.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/runtime-and-contracts/ar-a5-plan-identity-determinism-verification-20260506.md
  - docs/planning/state/agent-lane-a.yaml
  - docs/planning/state/agent-lane-a.md
  - docs/planning/state/execution-workboard.md
  - docs/planning/state/open-task-route.md
  - docs/planning/index.md
  - docs/planning/proposals/index.md
  - docs/.manifest.json
  - docs/planning/status/**
forbiddenImplementationSurfaces:
  - apps/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/planner/**
  - packages/@dvt/adapter-*/**
commandQueryRails:
  - name: VerifyPlanIdentityDeterminism
    type: query
    dddOwner: PlanIdentityDeterminismEvidence
domainObjects:
  - name: PlanIdentityDeterminismEvidence
    type: read model
    owner: Planner and contracts
fowlerSignals:
  - Content-addressed identity
  - Determinism guard
architectureGuards:
  - pnpm --filter @dvt/planner test -- test/unit/determinism.test.ts
cypressFlows:
  - Not applicable - planner identity verification only
completionGate:
  - pnpm --filter @dvt/planner test -- test/unit/determinism.test.ts
  - pnpm docs:sync
  - pnpm docs:workboard:generate
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: created-at-iso-plan-id-exclusion
    redTest: pnpm --filter @dvt/planner test -- test/unit/determinism.test.ts
    expectedFailure: The determinism test would fail if `createdAtIso` were included in `canonicalPlanCoreJson` or plan identity derivation.
    patchSurfaces:
      - docs/planning/state/agent-lane-a.yaml
      - docs/planning/proposals/mandatory/runtime-and-contracts/ar-a5-plan-identity-determinism-verification-20260506.md
    greenTest: pnpm --filter @dvt/planner test -- test/unit/determinism.test.ts
symbols:
  - name: PlanAssembler.execute
    path: packages/@dvt/planner/src/domain/PlanAssembler.ts
    dddOwner: PlanIdentityDeterminismEvidence
    cqRails:
      - VerifyPlanIdentityDeterminism
    fowlerSignals:
      - Content-addressed identity
      - Determinism guard
    architectureGuard: pnpm --filter @dvt/planner test -- test/unit/determinism.test.ts
    cypressCoverage: Not applicable - planner identity verification only
    unitTests:
      - pnpm --filter @dvt/planner test -- test/unit/determinism.test.ts
```
