---
slice: mw-a1-step-kind-registry-governance
date: 2026-04-06
author: AI (GPT-5)
last_reviewed: 2026-04-06
status: Accepted
---

# Closeout: MW-A1 StepKindRegistry Governance

## Think-First Analysis

- Problem summary:
  Step-kind validation existed, but runtime governance was incomplete: there
  was no canonical adapter-to-kind execution mapping and no per-kind capability
  projection path.
- Root cause:
  `IStepTypeRegistry` focused on schema validation only, while executability
  checks depended mainly on plan-level metadata and adapter-local declarations.
- Constraints and invariants:
  `AGENTS.md`; `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`; `docs/planning/state/agent-lane-a.yaml`;
  `docs/planning/proposals/mandatory/runtime-and-contracts/dvt-dbt-agnostic-generalization-plan-20260403.md`.
- Options considered:
  1. Keep schema-only registry and continue capability/adapter checks outside it.
  2. Add execution metadata to registry and consume it in planner/admission.
- Selected option and rationale:
  Option 2. It turns step-kind onboarding into a governed, testable operation
  with one explicit contract surface.
- Rejected alternatives:
  Option 1 keeps split ownership and makes new-kind rollout error-prone.

## Pre-Implementation Brief

- Mode:
  Full
- Scope:
  Implement `MW-A1` by extending step-kind registry contracts with execution
  metadata and wiring planner/admission usage.
- Touched files or paths:
  `packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts`,
  `packages/@dvt/contracts/test/step-registry.test.ts`,
  `packages/@dvt/planner/src/domain/Planner.ts`,
  `packages/@dvt/planner/src/domain/PlanAssembler.ts`,
  `packages/@dvt/planner/test/unit/step-registry-integration.test.ts`,
  `apps/api/src/application/services/StoredPlanExecutabilityValidator.ts`,
  `apps/api/test/application/services/StoredPlanExecutabilityValidator.test.ts`,
  `docs/planning/state/agent-lane-a.yaml`,
  `docs/planning/closeouts/20260406-mw-a1-step-kind-registry-governance-closeout.md`.
- Risks and mitigations:
  Contract-shape drift risk was mitigated with contract tests plus planner/API
  integration negative-path tests.
- Out-of-scope:
  GenericGraphSource migration (`MW-A2`) and artifact model generalization
  (`MW-A3`).

## Implementation

- Added `StepKindExecutionProfile` to step-type registry entries with:
  `supportedAdapters` and `requiredCapabilities`.
- Kept backward compatibility for existing custom registries by making
  `getExecutionProfile` optional in `IStepTypeRegistry`.
- Added helper functions in contracts:
  `isStepKindSupportedByAdapter` and `collectRequiredCapabilitiesForSteps`.
- Planner now derives required capabilities from step-kind registry metadata and
  projects them into `ExecutionPlan.metadata.requiresCapabilities`.
- API executability validator now:
  - rejects step kinds unsupported by selected adapter (`INVALID_STEP_KIND`);
  - merges required capabilities from registry + plan metadata + planRef and
    enforces capability gate deterministically.
- Added/updated tests in contracts, planner, and API for:
  profile metadata handling, adapter-step kind incompatibility, and capability
  projection.

## Validation Evidence

- `pnpm --filter @dvt/contracts test`
- `pnpm --filter @dvt/planner test`
- `pnpm --filter dvt-api test`
- `pnpm --filter dvt-api typecheck`
- `pnpm docs:workboard:generate`
- `pnpm docs:sync`
- `pnpm verify:prepush`

## No-Debt / No-Stub Evidence

- No stubs/placeholders/TODO markers were introduced.
- No lint/type/test gates were disabled or bypassed.
- No hook bypass flags were used.
