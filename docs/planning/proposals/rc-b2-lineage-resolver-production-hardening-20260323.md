---
title: RC-B2 Lineage Resolver Production Hardening
status: Proposed
owner: Traceability / Architecture
last_reviewed: 2026-03-23
planning_type: proposal
---

# RC-B2 Lineage Resolver Production Hardening

## Goal

Align the lineage worker resolver with the compiled-code reference contract so
production deployments cannot silently accept `file://` compiled-code refs and
S3 configuration fails fast instead of degrading into implicit defaults.

## Dependency

- `RC-B2` (the resolver wiring slice must exist before this hardening slice).

## Scope

In scope:

- production validation for resolver backend selection
- explicit `file://` denial in `NODE_ENV=production`
- fail-fast configuration for `s3` backend credentials/region
- runtime tests for production rejection and configuration errors

Out of scope:

- changing `StepStartedLineageMapper` fail-open semantics
- introducing new storage backends
- planner compiled artifact generation changes

## Work Breakdown

| Item    | Task                                                                 | Output                                                  |
| ------- | -------------------------------------------------------------------- | ------------------------------------------------------- |
| `B2-H1` | Define production backend policy for compiled-code resolution.       | `file://` is rejected in production.                    |
| `B2-H2` | Tighten env validation for backend-specific resolver configuration.  | Missing S3 config fails fast instead of defaulting.     |
| `B2-H3` | Update resolver factory to enforce backend policy consistently.      | Composition root cannot construct an invalid resolver.  |
| `B2-H4` | Add regression tests for prod file rejection and S3 bootstrap error. | Proof that hardening closes the contract drift.         |
| `B2-H5` | Update planning traceability links.                                  | Workboard and route map reference this follow-up slice. |

## File Plan

| Action | Path                                                            | Reason                                                       |
| ------ | --------------------------------------------------------------- | ------------------------------------------------------------ |
| Modify | `apps/lineage-worker/src/env.ts`                                | Validate backend-specific resolver settings explicitly.      |
| Modify | `apps/lineage-worker/src/compiledCodeResolver.ts`               | Enforce production backend policy and fail-fast config.      |
| Modify | `apps/lineage-worker/test/compiledCodeResolver.test.ts`         | Add regression coverage for contract and bootstrap failures. |
| Modify | `apps/lineage-worker/test/server.lineage-mapper-wiring.test.ts` | Preserve end-to-end wiring coverage while hardening policy.  |
| Modify | `docs/planning/state/execution-workboard.md`                    | Make this proposal visible as the next traceability slice.   |
| Modify | `docs/planning/state/open-task-route.md`                        | Add the follow-up slice to the execution route.              |

## Validation Criteria

1. `NODE_ENV=production` cannot resolve `file://` compiled-code refs.
2. `s3` backend with incomplete configuration fails fast and clearly.
3. Existing resolver success/fail-open tests still pass unchanged.
4. The worker bootstrap continues to wire the real resolver, not a noop.

Validation commands:

- `pnpm --filter dvt-lineage-worker test`
- `pnpm --filter dvt-lineage-worker typecheck`
- `pnpm verify:prepush`

## Exit Criteria

- `RC-B2-H1` status can move from `Queued` to `Review` once the hardening lands.
- No contract drift remains between ADR-0032 and runtime resolver behavior.
