---
title: TF-A1-C SRP and extensibility hardening plan
status: Active
owner: Architecture / Contracts / API / Web
last_reviewed: 2026-04-14
planning_type: proposal
lane: A
task_id: TF-A1-C
---

# TF-A1-C SRP and extensibility hardening plan

## Summary

`TF-A1-A` and `TF-A1-B` froze the first SQL-first transformation contract pack,
preview-persist boundary, and deterministic compiler mapping.

That freeze was correct as a semantic baseline, but the shipped code still
concentrates unrelated responsibilities in the shared planner contracts, the
preview route boundary, and the Canvas preview or execution path.

`TF-A1-C` is the follow-up hardening slice that keeps the frozen semantics while
splitting the implementation into SRP-correct, extension-friendly seams.

No compatibility shim or semantic contract rewrite is planned in this slice.
The goal is structural hardening, not a second contract redesign.

## Governing Sources

- [ADR-0005](../../../../adr/ADR-0005-contract-formalization-tooling.md)
- [ADR-0018](../../../../adr/ADR-0018_Shared_Kernel_Ownership_Governance.md)
- [ADR-0035](../../../../adr/ADR-0035-planner-public-contract-evolution-protocol.md)
- [Reference Architecture](../../../../architecture/reference-architecture.md)
- [Transformation Flow Delivery Plan 2026-04-05](./transformation-flow-delivery-plan-20260405.md)
- [Transformation flow preview and design graph v1](../../../../contracts/planner/TransformationFlowPreview.v1.md)
- [Transformation flow compiler mapping v1](../../../../contracts/planner/TransformationFlowCompiler.v1.md)

## Think-first Analysis

### Problem summary

The current SQL-first transformation pack is semantically frozen but still shows
five structural drifts:

1. `StepTypeRegistry.ts` is not family-neutral and keeps hard-coded DBT plus
   SQL-first default registrations in one shared-kernel module.
2. `TransformationFlowCompiler.v1.ts` mixes contract shape, cross-node
   validation, and plan-summary projection.
3. `previewGraphSource.ts` mixes compiler mapping, signature generation,
   design-graph draft construction, and artifact serialization.
4. `useCanvasExecutionActions.ts` mixes provenance, readiness policy, preview
   command orchestration, start-run orchestration, and UI behavior.
5. `planRoutes.ts` mixes transport parsing, scope or policy checks, planner
   envelope binding, persisted preview orchestration, ownership checks, and
   response projection.

### Root cause

The first vertical was frozen quickly to stop semantic drift across `contracts`,
`api`, and `web`.

That stopped contract drift, but it also let convenience modules become the
place where shape, policy, orchestration, and projection accumulated together.
The freeze solved semantic ambiguity before it solved responsibility ownership.

### Constraints and invariants

- `@dvt/contracts` owns serializable cross-package shape, not broad behavioral
  orchestration ([ADR-0018](../../../../adr/ADR-0018_Shared_Kernel_Ownership_Governance.md)).
- Public planner contract evolution must remain explicit and bounded; this slice
  must not smuggle a semantic contract redesign behind a refactor label
  ([ADR-0035](../../../../adr/ADR-0035-planner-public-contract-evolution-protocol.md)).
- Runtime boundaries must remain machine-validatable and negative-path tested
  ([ADR-0005](../../../../adr/ADR-0005-contract-formalization-tooling.md)).
- The frozen SQL-first semantics stay unchanged:
  `source -> sql_transform -> sink`, explicit preview profile, immutable plan
  persistence, and deterministic compiler output.
- Unknown step kinds must move toward the fail-closed governed inventory model
  already documented in `StepKindRegistry.v1.ts`; this slice must not widen
  the shared-kernel registry into another local allowlist.

### Options considered

1. One large cross-package rewrite
   - Rejected because it would mix contracts, API, and web behavior changes in
     one validation blast radius and make regressions hard to localize.
2. Contracts-only cleanup
   - Rejected because consumer seams would keep duplicating policy and the same
     drift would simply move one layer down into `api` and `web`.
3. Contracts-first seam split with consumer cutover in ordered workstreams
   - Selected because it preserves the frozen semantics while reducing drift in
     the right dependency order.

### Selected option and rationale

Use a contracts-first hardening sequence:

1. make step-kind authority single-sourced and make the default registry
   family-neutral;
2. split compiler contract shape, validation, and summary projection;
3. cut `web` consumers over to smaller preview and execution seams;
4. cut `api` route composition over to smaller transport or policy seams.

This follows the repo dependency direction and keeps the highest-authority seam
(`@dvt/contracts`) clean before downstream consumers are narrowed.

### Rejected alternatives

- Reopening `TF-A1-B` and treating the hardening as part of the freeze itself.
  Rejected because `TF-A1-B` already shipped the semantic contract freeze and
  this new work is a structural remediation slice.
- Introducing compatibility aliases or temporary registries.
  Rejected because it would add hidden debt inside the shared kernel.

## Pre-Implementation Brief

### Mode

`Full`

### Scope

- planner contract seam hardening in `@dvt/contracts`
- preview graph seam hardening in `apps/web`
- preview and start-run action split in `apps/web`
- preview route seam hardening in `apps/api`
- planning, roadmap, and status surfaces for the new follow-up slice

### Touched paths

- `packages/@dvt/contracts/src/contracts/planner/**`
- `packages/@dvt/contracts/src/step-registry/**`
- `apps/web/src/app/views/canvas/**`
- `apps/api/src/entrypoints/http/**`
- planning, roadmap, evidence, and risk surfaces for `TF-A1-C`

### Expected outcome

- one canonical authority for step kinds and default step registration
- compiler contract modules with explicit ownership seams
- web preview generation split into builder, signature, draft, and serializer seams
- web execution hook split into provenance, readiness, preview, and start-run seams
- preview route split into transport, policy, binding, and response projection seams

### Risks and mitigations

| Risk                                                  | Impact                             | Mitigation                                                                           |
| ----------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------ |
| Contracts split changes exports unexpectedly          | Consumer compile failures          | Cut contracts first, keep explicit export map, run affected package builds and tests |
| Unknown-kind handling becomes stricter too early      | Runtime regressions in old callers | Keep semantic behavior explicit in tests and cut consumers over in the same slice    |
| Web or API refactor silently changes operator UX      | Product regression                 | Keep negative-path tests and route or hook behavior assertions active during split   |
| Planning drift between lane, roadmap, and status docs | Governance inconsistency           | Update lane A, roadmap, domain status, and proposal set together                     |

### Out of scope

- new preview profiles
- dbt phase-2 executor mode
- new runtime adapters
- semantic redesign of `DesignGraphDraft`, `PlanRef`, or the SQL-first node vocabulary

### Validation plan

- `pnpm docs:sync`
- `pnpm docs:workboard:generate`
- `pnpm docs:status:generate`
- `pnpm --filter @dvt/contracts build`
- `pnpm --filter @dvt/contracts test`
- `pnpm --filter dvt-api build`
- `pnpm --filter dvt-api test -- planRoutes.test.ts`
- `pnpm --filter @dvt/web typecheck`
- `pnpm --filter @dvt/web test -- plansService.test.ts useCanvasExecutionActions.test.tsx`
- `pnpm verify:prepush`

### Test coverage plan

- negative-path coverage for unknown or unsupported step kinds
- negative-path coverage for compiler graph invariants after module split
- negative-path coverage for preview stale-state and provenance failures
- negative-path coverage for preview route profile, source-policy, and scope handling

### Libraries evaluated

None evaluated. This slice is structural hardening inside governed repo-local seams.

## Workstream backlog

| Workstream | Scope                                       | Primary files                                   | Exit condition                                                                            |
| ---------- | ------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `TF-A1-C1` | step-kind authority and registry neutrality | `StepTypeRegistry.ts`, `StepKindRegistry.v1.ts` | step kinds are single-sourced and the default registry is not a family bag                |
| `TF-A1-C2` | compiler contract decomposition             | `TransformationFlowCompiler.v1.ts`              | contract shape, cross-node validation, and summary projection live in separate seams      |
| `TF-A1-C3` | preview graph builder decomposition         | `previewGraphSource.ts`                         | compiler mapping, signature, draft building, and serialization no longer change together  |
| `TF-A1-C4` | canvas execution action split               | `useCanvasExecutionActions.ts`                  | provenance, readiness, preview, and start-run orchestration are separated                 |
| `TF-A1-C5` | preview/import route split                  | `planRoutes.ts`                                 | transport, policy, binding, ownership, and response projection no longer live in one file |

## Sequencing

1. `TF-A1-C1`
2. `TF-A1-C2`
3. `TF-A1-C3`
4. `TF-A1-C4`
5. `TF-A1-C5`

Rationale: contracts-first hardening narrows authority before `web` and `api`
consumers are refactored.

## Definition of done

1. `TF-A1-C1..5` land with passing package-level validation and `pnpm verify:prepush`.
2. The SQL-first semantics remain unchanged.
3. No new compatibility shim, placeholder, or shadow allowlist is introduced.
4. Planning, roadmap, and status surfaces point to `TF-A1-C` as the active hardening follow-up.
