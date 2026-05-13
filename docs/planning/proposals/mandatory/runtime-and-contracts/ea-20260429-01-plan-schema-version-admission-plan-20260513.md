---
title: EA-20260429-01 Plan Schema-Version Admission Plan
status: Accepted
owner: Architecture / Runtime Safety And Admission
last_reviewed: 2026-05-13
planning_type: mandatory-proposal
---

# EA-20260429-01 Plan Schema-Version Admission Plan

## Think-First Analysis

EA-20260429-01 closes the remaining start-run admission drift where the current
runtime truth was already an exact `(planVersion, schemaVersion)` matrix, but
the engine module language still exposed generic plan admission rather than a
schema-version admission component.

The command rail is the existing `StartRun` command. No new externally
observable command is introduced. The DDD owner is the engine admission policy:
it rejects unsupported plan schema versions before plan fetch, bootstrap, or
provider adapter dispatch.

The Fowler move is **Encapsulate Policy** plus **Introduce Intention-Revealing
Interface**. Mature runtime systems keep version admission as an ingress policy
with one compatibility authority and typed fail-closed outcomes; adapters do
not discover unsupported payload formats after side effects have begun.

## Fowler Planning Matrix

| Scenario                     | Opportunity         | Fowler pattern                    | DDD owner                 | Command/query rail                | Implementation surfaces  | Unit or package test              | Architecture test                                 | User-flow test                          | Out of scope            |
| ---------------------------- | ------------------- | --------------------------------- | ------------------------- | --------------------------------- | ------------------------ | --------------------------------- | ------------------------------------------------- | --------------------------------------- | ----------------------- |
| Current pair admitted        | Primitive obsession | Encapsulate Policy                | `PlanSchemaVersionPolicy` | `StartRun` command                | engine contracts, docs   | `PlanSchemaVersionPolicy.test.ts` | `planSchemaVersionAdmission.architecture.test.ts` | Existing engine start-run workflow test | New plan-version line   |
| Future schema rejected       | Boundary drift      | Fail-fast Service Layer policy    | `PlanSchemaVersionPolicy` | `StartRun` command                | engine contracts, docs   | `PlanSchemaVersionPolicy.test.ts` | semantic architecture test                        | Existing no-dispatch test               | Adapter decode redesign |
| Unsupported major rejected   | Duplicate semantics | Intention-revealing interface     | `PlanSchemaVersionPolicy` | `StartRun` command                | engine contracts, docs   | `PlanSchemaVersionPolicy.test.ts` | semantic architecture test                        | Existing no-dispatch test               | Matrix expansion        |
| Documentation and code align | Documentation drift | Component guide as local contract | architecture docs         | none - documentation traceability | docs, architecture tests | N/A                               | semantic architecture test                        | N/A                                     | Public barrel reduction |

## Feature Mechanization

```feature-mechanization
version: 1
featureId: EA-20260429-01-PLAN-SCHEMA-VERSION-ADMISSION
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/ea-20260429-01-plan-schema-version-admission-plan-20260513.md
componentGuides: [docs/architecture/components/engine/contracts/plan-schema-version-admission-component.md]
userStories: [docs/architecture/components/engine/contracts/plan-schema-version-admission-user-stories.md]
governingSources: [AGENTS.md, docs/planning/status/governance-document-rule-inventory.md, docs/guides/ai-work-protocol.md, docs/architecture/command-query-rail-governance.md, docs/architecture/fowler-opportunity-planning-governance.md, docs/adr/ADR-0003-execution-model.md, docs/adr/ADR-0012-plan-integrity-ownership.md, docs/adr/ADR-0017_ExecutionPlan_Schema_Versioning.md, docs/adr/ADR-0036-execution-plan-planversion-registry-and-runtime-matrix.md, docs/planning/reviews/architecture-and-governance/20260429-dvt-engine-package-audit-review.md]
allowedImplementationSurfaces: [buzon/20260513-codex-fowler-ea-20260429-01-schema-version-admission-analysis.md, docs/planning/proposals/mandatory/runtime-and-contracts/ea-20260429-01-plan-schema-version-admission-plan-20260513.md, docs/planning/closeouts/20260513-ea-20260429-01-plan-schema-version-admission-closeout.md, docs/architecture/components/engine/contracts/plan-admission-matrix.md, docs/architecture/components/engine/contracts/plan-schema-version-admission-component.md, docs/architecture/components/engine/contracts/plan-schema-version-admission-user-stories.md, docs/evidence/ed-20260513-ea-20260429-01-plan-schema-version-admission.md, docs/risk-register/quality/R-20260513-PLAN-SCHEMA-VERSION-ADMISSION.yaml, packages/@dvt/engine/src/contracts/PlanSchemaVersionPolicy.ts, packages/@dvt/engine/src/services/startRun/StartRunValidationPolicy.ts, packages/@dvt/engine/src/index.ts, packages/@dvt/engine/test/contracts/PlanSchemaVersionPolicy.test.ts, packages/@dvt/engine/test/architecture/planSchemaVersionAdmission.architecture.test.ts]
forbiddenImplementationSurfaces: [apps/**, packages/@dvt/adapter-*/**, packages/@dvt/planner/**, packages/@dvt/contracts/src/contracts/planner/PlanAdmission.v1.ts]
commandQueryRails:
  - {name: StartRun, type: command, dddOwner: PlanSchemaVersionPolicy}
domainObjects:
  - {name: PlanSchemaVersionPolicy, type: policy, owner: packages/@dvt/engine/src/contracts/PlanSchemaVersionPolicy.ts}
fowlerSignals: [Primitive obsession around schemaVersion strings, Duplicate semantics between matrix and engine wording, Documentation drift around explicit schema-version component]
architectureGuards: [pnpm --filter @dvt/engine test -- test/architecture/planSchemaVersionAdmission.architecture.test.ts, pnpm docs:feature-mechanization:implementation]
cypressFlows: [N/A - engine admission command only]
completionGate: [pnpm docs:feature-mechanization -- --feature EA-20260429-01-PLAN-SCHEMA-VERSION-ADMISSION, pnpm --filter @dvt/engine test -- test/contracts/PlanSchemaVersionPolicy.test.ts test/architecture/planSchemaVersionAdmission.architecture.test.ts test/core/WorkflowEngine.test.ts, pnpm --filter @dvt/engine typecheck, GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs, pnpm docs:sync, pnpm docs:status:generate, pnpm governance:refresh, pnpm docs:feature-mechanization:implementation, pnpm verify:prepush]
redGreenCycles:
  - {id: schema-version-policy-red, redTest: pnpm --filter @dvt/engine test -- test/contracts/PlanSchemaVersionPolicy.test.ts test/architecture/planSchemaVersionAdmission.architecture.test.ts, expectedFailure: PlanSchemaVersionPolicy module missing, patchSurfaces: [packages/@dvt/engine/test/contracts/PlanSchemaVersionPolicy.test.ts, packages/@dvt/engine/test/architecture/planSchemaVersionAdmission.architecture.test.ts], greenTest: pnpm --filter @dvt/engine test -- test/contracts/PlanSchemaVersionPolicy.test.ts test/architecture/planSchemaVersionAdmission.architecture.test.ts}
  - {id: start-run-policy-wiring, redTest: pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.test.ts, expectedFailure: direct generic admission wording remains, patchSurfaces: [packages/@dvt/engine/src/contracts/PlanSchemaVersionPolicy.ts, packages/@dvt/engine/src/services/startRun/StartRunValidationPolicy.ts], greenTest: pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.test.ts}
symbols:
  - {name: PlanSchemaVersionAdmissionInput, path: packages/@dvt/engine/src/contracts/PlanSchemaVersionPolicy.ts, dddOwner: PlanSchemaVersionPolicy, cqRails: [StartRun], fowlerSignals: [typed policy input], architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/planSchemaVersionAdmission.architecture.test.ts, cypressCoverage: N/A - engine admission command only, unitTests: [pnpm --filter @dvt/engine test -- test/contracts/PlanSchemaVersionPolicy.test.ts]}
  - {name: PlanSchemaVersionPolicy, path: packages/@dvt/engine/src/contracts/PlanSchemaVersionPolicy.ts, dddOwner: PlanSchemaVersionPolicy, cqRails: [StartRun], fowlerSignals: [policy], architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/planSchemaVersionAdmission.architecture.test.ts, cypressCoverage: N/A - engine admission command only, unitTests: [pnpm --filter @dvt/engine test -- test/contracts/PlanSchemaVersionPolicy.test.ts]}
  - {name: assertSupportedPlanSchemaVersion, path: packages/@dvt/engine/src/contracts/PlanSchemaVersionPolicy.ts, dddOwner: PlanSchemaVersionPolicy, cqRails: [StartRun], fowlerSignals: [intention-revealing API], architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/planSchemaVersionAdmission.architecture.test.ts, cypressCoverage: N/A - engine admission command only, unitTests: [pnpm --filter @dvt/engine test -- test/contracts/PlanSchemaVersionPolicy.test.ts]}
  - {name: TEST_ROOT, path: packages/@dvt/engine/test/architecture/planSchemaVersionAdmission.architecture.test.ts, dddOwner: PlanSchemaVersionPolicyArchitectureGuard, cqRails: [StartRun], fowlerSignals: [semantic architecture guard], architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/planSchemaVersionAdmission.architecture.test.ts, cypressCoverage: N/A - engine admission command only, unitTests: [N/A]}
  - {name: ENGINE_ROOT, path: packages/@dvt/engine/test/architecture/planSchemaVersionAdmission.architecture.test.ts, dddOwner: PlanSchemaVersionPolicyArchitectureGuard, cqRails: [StartRun], fowlerSignals: [semantic architecture guard], architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/planSchemaVersionAdmission.architecture.test.ts, cypressCoverage: N/A - engine admission command only, unitTests: [N/A]}
  - {name: REPO_ROOT, path: packages/@dvt/engine/test/architecture/planSchemaVersionAdmission.architecture.test.ts, dddOwner: PlanSchemaVersionPolicyArchitectureGuard, cqRails: [StartRun], fowlerSignals: [semantic architecture guard], architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/planSchemaVersionAdmission.architecture.test.ts, cypressCoverage: N/A - engine admission command only, unitTests: [N/A]}
  - {name: POLICY_SOURCE, path: packages/@dvt/engine/test/architecture/planSchemaVersionAdmission.architecture.test.ts, dddOwner: PlanSchemaVersionPolicyArchitectureGuard, cqRails: [StartRun], fowlerSignals: [semantic architecture guard], architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/planSchemaVersionAdmission.architecture.test.ts, cypressCoverage: N/A - engine admission command only, unitTests: [N/A]}
  - {name: START_RUN_VALIDATION_SOURCE, path: packages/@dvt/engine/test/architecture/planSchemaVersionAdmission.architecture.test.ts, dddOwner: PlanSchemaVersionPolicyArchitectureGuard, cqRails: [StartRun], fowlerSignals: [semantic architecture guard], architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/planSchemaVersionAdmission.architecture.test.ts, cypressCoverage: N/A - engine admission command only, unitTests: [N/A]}
  - {name: COMPONENT_GUIDE, path: packages/@dvt/engine/test/architecture/planSchemaVersionAdmission.architecture.test.ts, dddOwner: PlanSchemaVersionPolicyArchitectureGuard, cqRails: [StartRun], fowlerSignals: [semantic architecture guard], architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/planSchemaVersionAdmission.architecture.test.ts, cypressCoverage: N/A - engine admission command only, unitTests: [N/A]}
  - {name: USER_STORIES, path: packages/@dvt/engine/test/architecture/planSchemaVersionAdmission.architecture.test.ts, dddOwner: PlanSchemaVersionPolicyArchitectureGuard, cqRails: [StartRun], fowlerSignals: [semantic architecture guard], architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/planSchemaVersionAdmission.architecture.test.ts, cypressCoverage: N/A - engine admission command only, unitTests: [N/A]}
  - {name: MAILBOX_ANALYSIS, path: packages/@dvt/engine/test/architecture/planSchemaVersionAdmission.architecture.test.ts, dddOwner: PlanSchemaVersionPolicyArchitectureGuard, cqRails: [StartRun], fowlerSignals: [semantic architecture guard], architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/planSchemaVersionAdmission.architecture.test.ts, cypressCoverage: N/A - engine admission command only, unitTests: [N/A]}
  - {name: PROPOSAL, path: packages/@dvt/engine/test/architecture/planSchemaVersionAdmission.architecture.test.ts, dddOwner: PlanSchemaVersionPolicyArchitectureGuard, cqRails: [StartRun], fowlerSignals: [semantic architecture guard], architectureGuard: pnpm --filter @dvt/engine test -- test/architecture/planSchemaVersionAdmission.architecture.test.ts, cypressCoverage: N/A - engine admission command only, unitTests: [N/A]}
```

## Red/Green Cycle 1

The first red run introduces tests for `PlanSchemaVersionPolicy` before the
module exists. The green step adds the semantic policy facade and routes
`StartRunValidationPolicy` through it.

## Red/Green Cycle 2

The second red run protects semantic encapsulation: docs, mailbox analysis,
owned-concern docblocks, and architecture tests must all name the same
component and invariants.
