---
slice: s14-gateway-context-across-continue-as-new
date: 2026-03-24
author: AI (GPT-5)
last_reviewed: 2026-03-24
---

# Closeout: S14 Gateway Context Across Continue-As-New

## Think-First Analysis

### Problem summary

`S14` captured a real correctness gap in the workflow runtime: gateway
evaluation could cross a `continueAsNew` boundary with incomplete context. The
runtime already carried some state, but `completedStepResults` was not part of
the continue-as-new payload, so later segments could only see degraded facts.

That risk was subtle because the workflow kept running, but the domain decision
context was no longer complete.

### Root cause

The continue-as-new handoff preserved `gatewayDecisions` and skipped-step
metadata, but not the completed step result map that gateway evaluation depends
on. The runtime therefore had an implicit context hole rather than an explicit
handoff contract.

### Constraints and invariants

- `AGENTS.md`: read governance first, keep evidence, do not create hidden debt,
  and finish with the required validation baseline.
- `docs/guides/ai-work-protocol.md`: planning-affecting work must keep the
  workboard and related status surfaces synchronized.
- `20260322 DVT Corrected Code Grounded Review`: the continue-as-new gateway
  context gap is a correctness issue and must be closed explicitly.
- DDD/Fowler discipline: preserve domain decision context at the application
  boundary instead of reconstructing it from partial runtime state.

### Options considered

- Recompute gateway context from partial step facts after `continueAsNew`.
  - Rejected because it degrades correctness and hides the missing state.
- Keep the runtime as-is and document the limitation.
  - Rejected because the repo treats correctness gaps as implementation issues,
    not documentation-only concerns.
- Carry `completedStepResults` across the `continueAsNew` payload and treat
  missing context as a contract defect.
  - Selected because it preserves the decision boundary explicitly.

### Selected option and rationale

Thread `completedStepResults` through the workflow input/state handoff, clone it
defensively, and preserve it in the continue-as-new payload. This keeps gateway
evaluation deterministic across workflow segments and avoids silent fallback to
partial facts.

### Rejected alternatives

- Returning to the gateway with incomplete facts and hoping the existing
  decision map is enough.
- Encoding the missing context as a warning only. Warnings are not a contract.

## Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - preserve gateway evaluation context across `continueAsNew`
  - add a positive test for carrying `completedStepResults`
  - keep the workflow helper deterministic and clone the handoff state
  - close the planning surfaces for `S14`
- Touched files or paths:
  - `packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts`
  - `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
  - `packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts`
  - `docs/planning/state/agent-lane-d.yaml`
  - `docs/planning/state/agent-lane-d.md`
  - `docs/planning/state/execution-workboard.md`
  - `docs/planning/state/open-task-route.md`
  - `docs/planning/state/domain-status-board.md`
  - `docs/planning/closeouts/20260324-s14-gateway-context-across-continue-as-new-closeout.md`
- Expected outcome:
  - `completedStepResults` survives `continueAsNew`
  - gateway evaluation context remains explicit across workflow segments
  - `S14` is no longer shown as open work
- Risks and mitigations:
  - The handoff state could diverge between helper and workflow input types.
    Mitigation: update both together and keep the payload clone explicit.
  - Planning counts could drift if only one surface is edited.
    Mitigation: update the lane YAML, generated lane markdown, workboard, route,
    and domain board together.
- Out-of-scope items:
  - unrelated workflow runtime refactors
  - gateway rule changes beyond context preservation
  - broader roadmap changes
- Validation plan:
  - `pnpm --filter @dvt/adapter-temporal test`
  - `pnpm --filter @dvt/adapter-temporal build`
  - `pnpm docs:sync`
  - `pnpm verify:prepush`
- Test coverage plan:
  - positive path: `completedStepResults` survives continue-as-new rollover
  - negative path: workflow helper remains strict about handoff shape and
    cloning
- Libraries evaluated:
  - None. This slice reuses the existing workflow helper and adapter-temporal
    test coverage.

## Changes made

| File or path                                                                                                                                               | Change                                                           | Why                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| [packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts](../../../packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts)                | Added `completedStepResults` to the continue-as-new handoff      | Preserve gateway evaluation context across workflow segments     |
| [packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts](../../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts)                | Threaded `completedStepResults` through workflow state transfer  | Keep the application boundary explicit and deterministic         |
| [packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts](../../../packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts)      | Added a continue-as-new rollover test for `completedStepResults` | Prove the context survives the segment boundary                  |
| [docs/planning/state/agent-lane-d.yaml](../state/agent-lane-d.yaml)                                                                                        | Marked `S14` as `done`                                           | Make the lane source of truth match the delivered implementation |
| [docs/planning/state/agent-lane-d.md](../state/agent-lane-d.md)                                                                                            | Regenerated via `pnpm docs:sync`                                 | Keep rendered lane aligned with YAML                             |
| [docs/planning/state/execution-workboard.md](../state/execution-workboard.md)                                                                              | Marked `S14` as `Done`                                           | Reflect closure in the operational tracker                       |
| [docs/planning/state/open-task-route.md](../state/open-task-route.md)                                                                                      | Removed `S14` from actionable routing                            | Prevent closed work from appearing as open                       |
| [docs/planning/state/domain-status-board.md](../state/domain-status-board.md)                                                                              | Removed `S14` from active execution-runtime tasks                | Keep the domain board aligned with the closed status             |
| [docs/planning/closeouts/20260324-s14-gateway-context-across-continue-as-new-closeout.md](20260324-s14-gateway-context-across-continue-as-new-closeout.md) | Recorded the closeout and validation evidence                    | Required closeout artifact for the slice                         |

## Docs Synced

- [x] [docs/planning/state/agent-lane-d.md](../state/agent-lane-d.md) via `pnpm docs:sync`

## Validation Evidence

| Command                                     | Result |
| ------------------------------------------- | ------ |
| `pnpm --filter @dvt/adapter-temporal test`  | Passed |
| `pnpm --filter @dvt/adapter-temporal build` | Passed |
| `pnpm docs:sync`                            | Passed |
| `pnpm verify:prepush`                       | Passed |

## Debt Introduced

None. No new debt item was created, no rules were relaxed, and no hooks were
bypassed.

## No-stub Evidence

No stubs, placeholders, fake adapters, or TODO/FIXME markers were introduced.
The work carries a real workflow state field through the continue-as-new handoff
and validates the preserved context with a real test.

## Residual Follow-up

- If future gateway rules need additional context, the same explicit handoff
  pattern should be extended deliberately, not by inference.
