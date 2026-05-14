---
title: WE-HX-0 hardcut canonical map closeout
status: Draft
date: 2026-05-14
owner: codex
---

# WE-HX-0 Hardcut Canonical Map Closeout

## Think-First Analysis

Problem summary: `WE-HX-0` is meant to deliver the canonical WorkflowEngine map
and documentation replacement, but the active docs still describe the work as a
compatibility-first migration. The current instruction explicitly rejects
retrocompatibility posture and asks for a hardcut.

Root cause: previous WE-HX slices correctly reduced runtime responsibility, but
the planning and component docs kept migration vocabulary as current truth. That
lets future work preserve "compatibility adapter" semantics even when the code
path is already a normal run-control delegator over command and signal services.

Constraints and invariants:

- `ADR-0003`: execution lifecycle authority remains DVT-owned.
- `ADR-0004`: run lifecycle state remains event-sourced.
- `ADR-0012`: plan identity trust remains behind `PlanRef`.
- `ADR-0015`: query/read separation remains explicit.
- `ADR-0034`: bounded-context ownership must stay explicit.
- `docs/architecture/command-query-rail-governance.md`: no new externally
  observable rail is introduced by this documentation/architecture guard slice.
- `docs/architecture/fowler-opportunity-planning-governance.md`: drift must be
  represented in a planning matrix before implementation.

Options considered:

1. Keep compatibility wording and add a note that hardcut is preferred.
   Rejected because it preserves two active truths.
2. Rename all code symbols that include historic control-service naming.
   Rejected for this slice because `WE-HX-0` is the canonical map/doc
   replacement slice, not a runtime API rename.
3. Hardcut the active canonical docs and architecture tests while preserving
   actual plugin compatibility semantics. Selected because it removes drift
   without creating an unrelated runtime refactor.

Selected option and rationale: hardcut the active WorkflowEngine architecture
language, update the owned-concern docblocks that define the same semantic role,
and add a semantic architecture guard. This keeps current runtime behavior
intact but removes the compatibility posture from canonical truth.

Rejected alternatives: no runtime API removal in this slice; no edits to plugin
compatibility fingerprint semantics; no new command/query rail.

## Pre-Implementation Brief

Mode: Full.

Scope:

- Add a WE-HX-0 semantic architecture guard.
- Update WorkflowEngine canonical docs to hardcut language.
- Update run-control owned-concern comments/tests away from compatibility
  vocabulary.
- Keep plugin compatibility fingerprint docs and code untouched.

Touched files or paths:

- `buzon/20260514-codex-fowler-we-hx-0-hardcut-map-analysis.md`
- `docs/planning/closeouts/20260514-we-hx-0-hardcut-canonical-map-closeout.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md`
- `docs/architecture/components/engine/architecture/**`
- `docs/guides/workflow-engine-user-manual.v1.md`
- `packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts`
- `packages/@dvt/engine/src/services/runControl/RunCommandService.ts`
- `packages/@dvt/engine/src/services/runControl/RunSignalService.ts`
- `packages/@dvt/engine/test/architecture/**`

Expected outcome: current docs and tests describe the WorkflowEngine subsystem
as a hardcut canonical command/query boundary with explicit use-case delegation
and run-control services, not as a compatibility migration path.

Risks and mitigations:

- Risk: over-removing legitimate compatibility language for plugin fingerprints.
  Mitigation: scope the guard to WorkflowEngine canonical docs and run-control
  semantics, not start-run plugin compatibility policy docs.
- Risk: large docs churn. Mitigation: edit only active WorkflowEngine canonical
  surfaces and architecture tests.

Out-of-scope items:

- Removing public `IWorkflowEngine` methods.
- Renaming package exports or contract files.
- Changing provider/runtime behavior.
- Changing plugin compatibility fingerprint checks.

Validation plan:

- `pnpm docs:feature-mechanization -- --feature WE-HX-0-HARDCUT-CANONICAL-MAP`
- `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineCanonicalMapHardcut.architecture.test.ts test/architecture/workflowEngineSemanticClosure.architecture.test.ts test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts`
- `pnpm --filter @dvt/engine typecheck`
- `pnpm docs:sync`
- `pnpm governance:refresh`
- `pnpm docs:feature-mechanization:implementation`
- `pnpm verify:prepush`

Test coverage plan:

- Negative architecture path: reject "compatibility-first",
  "compatibility facade", and "compatibility adapter" in active WE-HX-0
  canonical docs.
- Semantic source path: require run-control modules to declare delegator,
  command, and signal ownership without compatibility wording.
- Documentation path: require current component paths in the user manual.

Libraries evaluated: none. This is documentation and architecture-test drift
closure; no external library is needed.

Command/query rail impact: no new rail. Existing rails remain
`IWorkflowEngine.startRun`, `IWorkflowEngine.recoverRun`,
`IWorkflowEngine.cancelRun`, `IWorkflowEngine.getRunStatus`, and
`IWorkflowEngine.signal`.

## Fowler Opportunity Matrix

| Scenario                                                 | Opportunity         | Fowler pattern                                                      | DDD owner                    | Command/query rail                                    | Implementation surfaces                           | Unit or package test | Architecture test                                        | User-flow test | Out of scope           |
| -------------------------------------------------------- | ------------------- | ------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------- | ------------------------------------------------- | -------------------- | -------------------------------------------------------- | -------------- | ---------------------- |
| WE-HX-0 docs still promise compatibility-first posture   | Documentation drift | Replace ambiguous migration language with explicit current boundary | Engine architecture map      | none - internal architecture docs                     | WorkflowEngine docs, proposal, closeout, mailbox  | n/a                  | `workflowEngineCanonicalMapHardcut.architecture.test.ts` | n/a            | runtime API removal    |
| Run-control semantic docblocks say compatibility adapter | Duplicate semantics | Rename semantic role to current delegator                           | Engine run-control delegator | `IWorkflowEngine.cancelRun`, `IWorkflowEngine.signal` | run-control source headers and architecture tests | n/a                  | `workflowEngineSemanticClosure.architecture.test.ts`     | n/a            | public contract rename |
| User manual points to stale architecture paths           | Documentation drift | Consolidate canonical reading path                                  | Engine documentation         | none                                                  | user manual and architecture guard                | n/a                  | `workflowEngineCanonicalMapHardcut.architecture.test.ts` | n/a            | unrelated guides       |

## Normative Baseline

Verified baseline before implementation:

- `ADR-0003` authorizes DVT-owned execution semantics.
- `ADR-0004` preserves event-sourced run lifecycle authority.
- `ADR-0012` keeps plan identity trust behind `PlanRef`.
- `ADR-0015` keeps read/query separation explicit.
- `ADR-0034` keeps bounded-context ownership explicit.

## Traceability

- Governing task: `A/WE-HX-0`.
- Analysis: `buzon/20260514-codex-fowler-we-hx-0-hardcut-map-analysis.md`.
- Architecture guard:
  `packages/@dvt/engine/test/architecture/workflowEngineCanonicalMapHardcut.architecture.test.ts`.
- Canonical docs:
  `docs/architecture/components/engine/architecture/workflow-engine-subsystem-context.md`,
  `docs/architecture/components/engine/architecture/workflow-engine-target-architecture.v1.md`,
  `docs/guides/workflow-engine-user-manual.v1.md`.
