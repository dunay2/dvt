---
slice: 20260318-stage-1-1-planner-canonicalization-policy-vocabulary-contracts
date: 2026-03-18
last_reviewed: 2026-03-18
gap: planner-stage-1-1
author: AI (GPT-5)
---

# Closeout: Stage 1.1 Policy Vocabulary In Contracts

## Think-First Analysis

### Problem summary

The proposal already claimed that retry, timeout, and concurrency classes should
be canonical planner policy vocabulary, but the repository still only had:

- numeric `PlannerPolicies` fields in public contracts and planner-local types
- a hard-coded Temporal retry literal in the adapter
- no shared runtime-neutral value objects or adapter mapping interface

### Baseline inventory

Current repository state before this slice:

| Surface                                                             | Current fields or behavior                                                                                     | Classification                                 |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts` | `stepTimeoutMs`, `retries.maxAttempts`, `retries.backoffMs`, `concurrency.maxInFlight` under `PlannerPolicies` | numeric legacy policy shape at plan level      |
| `packages/@dvt/planner/src/domain/types.ts`                         | same numeric `PlannerPolicies` shape duplicated locally                                                        | duplicate planner-local legacy policy shape    |
| `packages/@dvt/planner/src/domain/policies.ts`                      | resolves those numeric fields with defaults and numeric validation                                             | planner-local numeric semantics                |
| `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`   | hard-coded Temporal retry literal (`maximumAttempts`, intervals, error types)                                  | adapter-local runtime mapping with no contract |

### Root cause

Stage 1.1 fixed the architectural stance before the shared-kernel contract
surface existed, so runtime-neutral semantics and adapter-specific enforcement
were still mixed together in implementation-local numbers.

### Constraints and invariants

- the vocabulary must live in `@dvt/contracts`
- the slice must not force planner consumer migration yet
- the adapter mapping contract must stay runtime-generic
- Temporal should serve as the first real implementation, not as pseudocode

### Selected design decisions

- `RetryPolicy`, `TimeoutPolicy`, and `ConcurrencyPolicy` are added as shared
  value-object unions in `@dvt/contracts`
- `RetryPolicy.maxAttempts` counts total attempts including the first execution
  and is validated with an upper bound of `20`
- `TimeoutPolicy` models one end-to-end execution budget, not a schedule-vs-run
  split
- `ConcurrencyPolicy` is plan-wide in this slice, not per-step-kind
- `AdapterPolicyMapper` is the canonical runtime mapping interface
- `TemporalPolicyMapper` is the first reference implementation

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - add canonical policy vocabulary to `@dvt/contracts`
  - add typed adapter mapping boundary
  - implement Temporal reference mapper
  - update Stage 1.1 docs and manifest to reflect the new state
- Touched files or paths:
  - `packages/@dvt/contracts/src/contracts/planner/PlannerPolicyVocabulary.v2.ts`
  - `packages/@dvt/contracts/src/index.ts`
  - `packages/@dvt/contracts/test/planner-policy-vocabulary.test.ts`
  - `packages/@dvt/adapter-temporal/src/TemporalPolicyMapper.ts`
  - `packages/@dvt/adapter-temporal/src/index.ts`
  - `packages/@dvt/adapter-temporal/test/TemporalPolicyMapper.test.ts`
  - `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
  - `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`
  - `docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-policy-vocabulary-contracts-closeout.md`
- Expected outcome:
  - the shared-kernel contract contains the canonical policy classes and adapter
    mapping interface, with Temporal proving they are implementable
- Risks and mitigations:
  - Risk: silently break the current planner input contract
  - Mitigation: keep legacy numeric `PlannerPolicies` untouched in this slice
- Out-of-scope items:
  - planner migration to emit canonical policy classes
  - non-Temporal adapter mappings
  - full executability validation result contract
- Validation plan:
  - `pnpm --filter @dvt/contracts test`
  - `pnpm --filter @dvt/contracts build`
  - `pnpm --filter @dvt/adapter-temporal test -- --runInBand`
  - `pnpm --filter @dvt/adapter-temporal build`
  - `pnpm exec markdownlint-cli2 ...`
  - `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`
- Libraries evaluated:
  - `zod`
  - `@temporalio/common`
  - `@temporalio/worker`

## Changes made

| File                                                                                                          | Change                                                                                           | Why                                                              |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `packages/@dvt/contracts/src/contracts/planner/PlannerPolicyVocabulary.v2.ts`                                 | Added canonical policy unions, zod schemas, mapper interface, and typed unsupported-policy error | Create the shared-kernel vocabulary and mapping boundary         |
| `packages/@dvt/contracts/src/index.ts`                                                                        | Re-exported policy vocabulary from `@dvt/contracts` root barrel                                  | Make the types importable from the public package surface        |
| `packages/@dvt/contracts/test/planner-policy-vocabulary.test.ts`                                              | Added valid and invalid schema coverage                                                          | Prove the vocabulary is executable and validated                 |
| `packages/@dvt/adapter-temporal/src/TemporalPolicyMapper.ts`                                                  | Added Temporal reference implementation of `AdapterPolicyMapper`                                 | Prove the canonical vocabulary maps into a real runtime          |
| `packages/@dvt/adapter-temporal/src/index.ts`                                                                 | Re-exported Temporal mapper                                                                      | Make the reference implementation available from adapter surface |
| `packages/@dvt/adapter-temporal/test/TemporalPolicyMapper.test.ts`                                            | Added mapping coverage for every canonical class                                                 | Prove Temporal implementation exists for each current class      |
| `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`                                   | Updated section 13 from future intent to actual contract state                                   | Keep the human proposal aligned with the shared-kernel reality   |
| `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`                                    | Moved `G-01.7` to partial-canonicalization state with remaining artifacts                        | Keep machine-readable gap state aligned with the repository      |
| `docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-policy-vocabulary-contracts-closeout.md` | Recorded inventory, decisions, and evidence                                                      | Satisfy workflow requirements                                    |

## Governing sources used

- `docs/planning/status/governance-document-rule-inventory.md`
- `AGENTS.md`
- `docs/adr/ADR-0018_Shared_Kernel_Ownership_Governance.md`
- `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
- `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`

## Docs synced

- [ ] `docs/planning/proposals/index.md` - not required for this existing proposal edit

## Test evidence

| Command                                                                                                                                                                                                             | Result |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `pnpm --filter @dvt/contracts test`                                                                                                                                                                                 | Passed |
| `pnpm --filter @dvt/contracts build`                                                                                                                                                                                | Passed |
| `pnpm --filter @dvt/adapter-temporal test`                                                                                                                                                                          | Passed |
| `pnpm --filter @dvt/adapter-temporal build`                                                                                                                                                                         | Passed |
| `pnpm exec markdownlint-cli2 packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-policy-vocabulary-contracts-closeout.md` | Passed |
| `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`                                                                                                                                                   | Passed |

## Debt introduced

None.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden debt entry was created.

## No-stub evidence

- No placeholder mapper or fake adapter contract was added.
- The Temporal mapper is executable code with tests, not pseudocode.
