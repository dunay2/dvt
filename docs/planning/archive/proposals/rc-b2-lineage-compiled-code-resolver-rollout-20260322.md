---
title: RC-B2 Lineage Compiled Code Resolver Rollout
status: Closed
owner: Traceability / Delivery
last_reviewed: 2026-03-24
planning_type: proposal
---

# RC-B2 Lineage Compiled Code Resolver Rollout

## Goal

Replace lineage worker `noopResolver` wiring with a real compiled code resolver
so SQL job facets can be emitted from `compiledCodeRef`.

## Dependency

- None (`RC-B2` is unblocked and independent in the execution workboard).

## Scope

In scope:

- production resolver wiring in lineage worker composition root
- environment/config support for resolver backend selection
- runtime tests for successful and fail-open resolution paths

Out of scope:

- planner compiled artifact generation changes
- OpenLineage sink contract redesign

## Work Breakdown

| Item    | Task                                                          | Output                                             |
| ------- | ------------------------------------------------------------- | -------------------------------------------------- |
| `B2-T1` | Add resolver factory in lineage worker bootstrap.             | Concrete `compiledCodeResolver` is injected.       |
| `B2-T2` | Add env configuration for resolver backend and credentials.   | Deployment-ready configuration surface.            |
| `B2-T3` | Replace noop wiring in server startup.                        | Runtime emits SQL facets when refs resolve.        |
| `B2-T4` | Add tests for resolved and unresolved compiled code behavior. | Evidence for expected fail-open and success paths. |
| `B2-T5` | Update planning traceability links.                           | Workboard and proposal index are aligned.          |

## File Plan

| Action | Path                                                            | Reason                                                 |
| ------ | --------------------------------------------------------------- | ------------------------------------------------------ |
| Modify | `apps/lineage-worker/src/server.ts`                             | Replace `noopResolver` with concrete resolver wiring.  |
| Modify | `apps/lineage-worker/src/env.ts`                                | Add resolver backend/env validation fields.            |
| Create | `apps/lineage-worker/src/compiledCodeResolver.ts`               | Isolate resolver creation logic from bootstrap wiring. |
| Create | `apps/lineage-worker/test/compiledCodeResolver.test.ts`         | Validate resolver factory and configuration behavior.  |
| Create | `apps/lineage-worker/test/server.lineage-mapper-wiring.test.ts` | Validate mapper receives non-noop resolver.            |
| Modify | `docs/planning/state/execution-workboard.md`                    | Make this proposal the primary source for `RC-B2`.     |

## Validation Criteria

1. Lineage worker no longer instantiates `noopResolver`.
2. A valid compiled code reference produces SQL job facets in mapper output.
3. Resolver failures remain fail-open (base facets still emitted, no worker crash).

Validation commands:

- `pnpm --filter dvt-lineage-worker test`
- `pnpm --filter dvt-lineage-worker typecheck`
- `pnpm verify:prepush`

## Exit Criteria

- `RC-B2` closed in mainline with lineage wiring evidence.
- No hidden stubs remain in production composition root.

## Closeout

- Implemented in `apps/lineage-worker/src/bootstrap.ts`, `apps/lineage-worker/src/server.ts`, and `apps/lineage-worker/src/compiledCodeResolver.ts`.
- Regression coverage is in `apps/lineage-worker/test/bootstrap.test.ts`, `apps/lineage-worker/test/compiledCodeResolver.test.ts`, and `apps/lineage-worker/test/server.lineage-mapper-wiring.test.ts`.
- Merged in main via `Fix/rc b2 lineage resolver (#584)` / commit `80558fbf`.
