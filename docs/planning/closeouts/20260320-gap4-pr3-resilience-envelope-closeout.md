---
slice: gap4-pr3-resilience-envelope
date: 2026-03-20
author: AI (GPT-5)
last_reviewed: 2026-03-20
---

# Closeout: Gap 4 PR3 Resilience Envelope

## Think-First Analysis

### Problem summary

`apps/api` already wires the start-run admission path to a real SQL-backed
backpressure snapshot source, duplicate probe, and delivery-owned admission
guard.

What is still missing is the resilience envelope described by `G4-PR3`:

- low-TTL cache around snapshot acquisition
- bounded circuit breaker behavior for repeated acquisition failures
- last-known-good fallback use while the source is degraded
- persisted fallback reuse across hot restart

Without that envelope, `observe` and `enforce` modes remain operationally
fragile. A transient database timeout, pool exhaustion episode, or transport
fault becomes an immediate `BACKPRESSURE_SNAPSHOT_UNAVAILABLE` path with no
bounded recovery behavior.

### Root cause

`G4-PR1` and `G4-PR2` closed the first bridge between API admission and
delivery health, but they stopped at the raw source:

- `RawSqlBackpressureStore` exposes the minimal two-field contract needed by
  `StartRunAdmissionGuard`
- `buildProtectedRuntimeModule` composes that raw source directly into the
  protected runtime
- the current store contract does not preserve acquisition metadata, so there
  is no way to reason about freshness or a last-known-good snapshot lifecycle

The result is a correct but brittle bootstrap implementation.

### Constraints and invariants

- `AGENTS.md`: inventory first, no hidden debt, no stubs, required validation,
  and no hook bypassing.
- `docs/guides/ai-work-protocol.md`: this is `Full` mode because it introduces
  new runtime behavior, new config, new infrastructure helpers, and new test
  artifacts.
- `ADR-0003`: execution semantics stay outside the engine core; command
  admission remains an entry/application concern, not an engine invariant.
- `ADR-0004`: admission reads must remain tenant-scoped and must not weaken
  write/read separation by smuggling runtime state mutation into the read path.
- `ADR-0033`: delivery-health hardening must respect worker/runtime ownership
  and not re-couple delivery semantics back into the engine.
- `ADR-0034`: the resilience chain belongs in `apps/api` composition and
  infrastructure. It must consume delivery-owned contracts and adapter-backed
  readers without pushing peer-context internals into engine or delivery.
- `docs/planning/proposals/gap4-backpressure-admission-design-20260319.md`:
  low cache TTL, instance-local breaker state, fresh fallback only, and fail
  closed when no trustworthy snapshot exists.
- `docs/planning/proposals/gap4-backpressure-admission-pr3-resilience-20260319.md`:
  required checklist items are configurable cache TTL, 5-failure circuit trip,
  30s open state, single half-open probe, stale fallback rejection, and hot
  restart fallback reuse.

### Options considered

- Keep the raw SQL store as-is and rely on `mode=off` in production.
  - Rejected because it preserves the gap instead of closing it.
- Add cache only.
  - Rejected because repeated source failures would still flap directly into
    request failures, and restart would still lose all bounded fallback state.
- Add a circuit-breaker library such as `opossum` and wrap the current store.
  - Rejected for this slice because the repo does not already depend on it, and
    we still need custom logic for snapshot freshness, persisted fallback, and
    per-tenant snapshot reuse. The library would not eliminate most of the
    required code.
- Add an API-local snapshot envelope seam plus small focused wrappers for TTL
  cache, breaker, and persisted fallback.
  - Selected because it preserves the current delivery contract, keeps the
    resilience policy in API infrastructure, and implements exactly the
    bounded behavior required by `G4-PR3`.

### Selected option and rationale

Introduce an internal API-only snapshot envelope layer:

1. `RawSqlBackpressureStore` remains the bridge from the Postgres reader to the
   delivery contract, but it also becomes the live source of acquisition
   envelopes with fetch timestamps.
2. `CachedBackpressureStore` caches successful live envelopes for a short TTL
   without altering delivery-owned decision logic.
3. `CircuitBreakingBackpressureStore` wraps the live source, counts only
   acquisition failures, opens after 5 consecutive failures for 30 seconds,
   permits one half-open probe, and falls back only to a fresh last-known-good
   snapshot.
4. `FileBackpressureFallbackStore` persists the last-known-good envelope locally
   per replica so hot restart can reuse bounded fallback state.
5. `buildProtectedRuntimeModule` wires the resilience chain and derives the
   freshness budget from cache TTL plus acquisition timeout.

This keeps the domain boundary stable while making the admission source safe
enough to move beyond the raw bootstrap shape.

### Rejected alternatives

- Moving breaker or fallback policy into `@dvt/delivery`.
- Adding a distributed cache or shared fallback persistence in this slice.
- Making fallback unconditional or indefinite.
- Treating stale fallback snapshots as acceptable just because they exist on
  disk.

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  - add the `G4-PR3` resilience envelope in `apps/api` infrastructure
  - expose the minimal new env/config needed for TTL-based caching
  - wire the resilient store into the protected runtime module
  - add unit tests for cache, breaker, and persisted fallback behavior
  - record the slice in this mandatory closeout and update affected docs if the
    shipped behavior changes the active reader path
- Touched files or paths:
  - `apps/api/src/infrastructure/backpressure/*`
  - `apps/api/src/modules/buildProtectedRuntimeModule.ts`
  - `apps/api/src/plugins/env.ts`
  - `apps/api/test/infrastructure/backpressure/*`
  - `apps/api/test/plugins/env.test.ts`
  - `apps/api/test/modules.test.ts` if the wiring contract needs coverage
  - `docs/planning/closeouts/20260320-gap4-pr3-resilience-envelope-closeout.md`
- Expected outcome:
  - backpressure snapshot acquisition becomes cache-backed and circuit-broken
  - fresh fallback snapshots survive hot restart on the same replica
  - repeated database faults degrade predictably instead of flapping live SQL on
    every request
  - stale or missing fallback still fails closed
- Risks and mitigations:
  - cache can hide replica skew:
    keep TTL low and document instance-local behavior
  - persisted fallback can become stale:
    store fetch timestamps and enforce a strict max-age budget
  - circuit state can accidentally count business rejections:
    count only acquisition failures from the live source
  - filesystem fallback can fail on write:
    treat persistence as advisory and never let it override freshness checks
- Out-of-scope items:
  - projected `delivery_backpressure_snapshot` read model
  - dynamic `Retry-After`
  - dashboards and metrics export wiring
  - distributed cache or cross-replica coordination
  - changes in planner, engine, delivery decision semantics, or frontend code
- Validation plan:
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-api test`
  - targeted lint on touched API files if needed
  - docs checks for the touched closeout and any updated planning/status docs
  - `pnpm verify:prepush`
- Test coverage plan:
  - positive path: cache hit avoids repeated live reads
  - negative path: consecutive acquisition failures open the circuit
  - negative path: stale fallback is rejected
  - recovery path: half-open probe closes the circuit after backend recovery
  - restart path: persisted fallback is reused only while still fresh
- Libraries evaluated:
  - `opossum`: evaluated, not adopted because most slice-specific behavior
    remains custom
  - direct cache dependency: not adopted; a tiny TTL map is sufficient for this
    narrow API-internal wrapper

## Changes made

| File or path                                                                                          | Change                                                                          | Why                                                                  |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `apps/api/src/infrastructure/backpressure/types.ts`                                                   | Added the API-local snapshot envelope seam                                      | Preserve acquisition metadata without changing the delivery contract |
| `apps/api/src/infrastructure/backpressure/RawSqlBackpressureStore.ts`                                 | Extended the raw store with envelope acquisition metadata                       | Make the live SQL source usable by resilience wrappers               |
| `apps/api/src/infrastructure/backpressure/CircuitBreakingBackpressureStore.ts`                        | Added live-failure counting, open/half-open logic, and bounded fallback use     | Implement the `G4-PR3` breaker policy                                |
| `apps/api/src/infrastructure/backpressure/CachedBackpressureStore.ts`                                 | Added low-TTL cache wrapper                                                     | Bound live SQL pressure and keep replica drift small                 |
| `apps/api/src/infrastructure/backpressure/FileBackpressureFallbackStore.ts`                           | Added replica-local persisted fallback storage                                  | Reuse last-known-good snapshots across hot restart                   |
| `apps/api/src/modules/buildProtectedRuntimeModule.ts`                                                 | Wired `raw -> circuit -> cache -> guard` in the protected runtime               | Make the resilient source authoritative for `startRun` admission     |
| `apps/api/src/plugins/env.ts`                                                                         | Added `DVT_START_RUN_BACKPRESSURE_CACHE_TTL_MS`                                 | Expose the slice's explicit operator knob for cache TTL              |
| `apps/api/test/infrastructure/backpressure/RawSqlBackpressureStore.test.ts`                           | Added envelope metadata coverage                                                | Prove the raw source exposes acquisition metadata                    |
| `apps/api/test/infrastructure/backpressure/CachedBackpressureStore.test.ts`                           | Added cache-hit and no-cache-for-fallback tests                                 | Prove TTL behavior and prevent stale fallback extension              |
| `apps/api/test/infrastructure/backpressure/CircuitBreakingBackpressureStore.test.ts`                  | Added breaker-open, stale-fallback, half-open-recovery, and restart reuse tests | Prove the `G4-PR3` resilience contract end to end                    |
| `apps/api/test/plugins/env.test.ts` and `apps/api/test/plugins/observability.test.ts`                 | Updated env baselines for the new cache TTL knob                                | Keep config coverage aligned with the shipped env schema             |
| `docs/planning/proposals/gap4-backpressure-admission-pr3-resilience-20260319.md`                      | Promoted the slice status to `Review` and checked the completed checklist       | Keep the active slice proposal aligned with the shipped behavior     |
| `docs/planning/proposals/gap4-backpressure-admission-design-20260319.md`                              | Updated the PR resolution table                                                 | Reflect real progress across `G4-PR1` to `G4-PR3`                    |
| `docs/architecture/system-delivery-status.md` and `docs/planning/status/canonical-doc-code-matrix.md` | Recorded the resilient admission chain in active status surfaces                | Keep current status and traceability aligned with runtime            |
| `docs/planning/closeouts/20260320-gap4-pr3-resilience-envelope-closeout.md`                           | Recorded think-first, implementation, validation, and no-debt evidence          | Mandatory repo closeout requirement                                  |

## Libraries evaluated

- `opossum`
  - Rejected because we still need custom tenant-scoped freshness handling,
    persisted last-known-good reuse, and replica-local fallback semantics.
- dedicated cache package
  - Rejected because the cache surface is a tiny API-internal TTL map and does
    not justify a new dependency for this slice.

## Docs synced

- [x] `docs/planning/proposals/gap4-backpressure-admission-pr3-resilience-20260319.md`
- [x] `docs/planning/proposals/gap4-backpressure-admission-design-20260319.md`
- [x] `docs/architecture/system-delivery-status.md`
- [x] `docs/planning/status/canonical-doc-code-matrix.md`
- [x] `docs/planning/closeouts/20260320-gap4-pr3-resilience-envelope-closeout.md`
- [x] `docs/index.md` and planning indexes stayed normalized via `pnpm docs:sync`

## Test evidence

| Command                                                                                                                                                                                                                                                                                                                                                                                                                                   | Result                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter dvt-api typecheck`                                                                                                                                                                                                                                                                                                                                                                                                         | Passed                                                                                                                                             |
| `pnpm --filter dvt-api test`                                                                                                                                                                                                                                                                                                                                                                                                              | Initial sandboxed run failed in Vitest while resolving workspace runtime imports; per repo validation rule, the escalated rerun is the real result |
| `pnpm install`                                                                                                                                                                                                                                                                                                                                                                                                                            | Passed; lockfile already up to date and no dependency graph changes were needed                                                                    |
| `pnpm --filter dvt-api test`                                                                                                                                                                                                                                                                                                                                                                                                              | Passed with escalated execution: `30` test files passed, `1` file skipped, `98` tests passed, `2` skipped                                          |
| `pnpm --filter dvt-api test:arch`                                                                                                                                                                                                                                                                                                                                                                                                         | Passed; `0` dependency violations                                                                                                                  |
| `pnpm docs:sync`                                                                                                                                                                                                                                                                                                                                                                                                                          | Passed                                                                                                                                             |
| `pnpm docs:canonical:check`                                                                                                                                                                                                                                                                                                                                                                                                               | Passed                                                                                                                                             |
| `pnpm docs:quality:check`                                                                                                                                                                                                                                                                                                                                                                                                                 | Passed with pre-existing non-blocking warnings on unrelated docs                                                                                   |
| `pnpm docs:doctor`                                                                                                                                                                                                                                                                                                                                                                                                                        | Passed with pre-existing `last_reviewed` warnings on older closeouts                                                                               |
| `pnpm docs:gov`                                                                                                                                                                                                                                                                                                                                                                                                                           | Passed with `13` pre-existing ADR frontmatter warnings                                                                                             |
| `pnpm exec eslint apps/api/src/infrastructure/backpressure/*.ts apps/api/src/modules/buildProtectedRuntimeModule.ts apps/api/src/plugins/env.ts apps/api/test/infrastructure/backpressure/*.test.ts apps/api/test/plugins/env.test.ts apps/api/test/plugins/observability.test.ts --max-warnings 0`                                                                                                                                       | Failed in the local toolchain because `eslint` could not resolve `debug`; repo gate still passed through `verify:prepush`                          |
| `pnpm exec markdownlint-cli2 "docs/planning/closeouts/20260320-gap4-pr3-resilience-envelope-closeout.md" "docs/planning/proposals/gap4-backpressure-admission-pr3-resilience-20260319.md" "docs/planning/proposals/gap4-backpressure-admission-design-20260319.md" "docs/architecture/system-delivery-status.md" "docs/planning/status/canonical-doc-code-matrix.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` | Failed in the local toolchain because `markdownlint-cli2` could not resolve `fastq`; docs governance and quality gates passed                      |
| `pnpm verify:prepush`                                                                                                                                                                                                                                                                                                                                                                                                                     | Passed                                                                                                                                             |

## Debt introduced

None. No debt record was added, no rule was relaxed, and no hook was bypassed.

## No-stub evidence

No stub, placeholder, fake adapter, or TODO/FIXME marker was added. The new
runtime path uses the real SQL snapshot source, a real cache wrapper, a real
circuit policy, and a real persisted fallback helper.

## Worktree note

The pre-existing untracked local file
`docs/reviews/dvt-top3-gaps-roadmap-20260319.md` remained untouched and is not
part of this slice.
