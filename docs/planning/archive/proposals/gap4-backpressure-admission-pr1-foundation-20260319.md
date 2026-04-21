---
title: Gap 4 PR1 Admission Foundation
status: In Progress
owner: Architecture / API / Delivery
last_reviewed: 2026-03-19
planning_type: proposal
---

# Gap 4 PR1 Admission Foundation

## Goal

Establish the API-side admission orchestration without yet introducing the full
raw snapshot implementation or the projected read model.

## Scope

This PR defines and wires:

- `BackpressureAwareStartRunUseCase`
- `DuplicateRunProbe`
- backend-agnostic admission telemetry contract
- mode handling:
  `off | observe | enforce`
- admission error mapping to HTTP
- ordering:
  duplicate probe -> backpressure -> rate limiter -> engine

## In Scope

- API application service wiring
- duplicate probe port and first adapter contract
- integration into `startRunRoute` composition
- observe-mode behavior contract
- async telemetry contract shape
- route and use-case tests

## Out Of Scope

- raw SQL snapshot implementation
- cache and circuit breaker
- persisted fallback
- projected read model
- dynamic `Retry-After`
- custom production rate limiter implementation

Library note:

- if a concrete admission limiter is introduced later, prefer wrapping a mature
  library such as `rate-limiter-flexible` instead of implementing a bespoke
  limiter

## File Areas

- `apps/api/src/application/ports/*`
- `apps/api/src/application/services/*`
- `apps/api/src/entrypoints/http/*`
- `apps/api/src/modules/*`
- tests under `apps/api/test/*`

## DDD Boundary

This PR stays in the API application boundary.

Domain or application responsibilities introduced here:

- duplicate detection as an application precondition
- admission orchestration as an application service
- backend-agnostic telemetry contract
- overload result translation into HTTP semantics

Responsibilities explicitly kept outside this PR:

- engine execution invariants
- delivery-health snapshot acquisition
- database-specific backlog queries
- circuit-breaker runtime policy

This keeps the PR aligned with hexagonal and DDD boundaries:

- ports in `application/ports`
- orchestration in `application/services`
- HTTP mapping in `entrypoints/http`
- wiring in `modules`

## File-By-File Implementation Plan

### Existing files to change

- `apps/api/src/application/ports/auth.ts`
  extend the start-run facade and use-case result model with duplicate and
  admission outcomes needed by PR1
- `apps/api/src/application/services/startRunAuthorizedFacade.ts`
  preserve authn and authz role while allowing the new use case outcomes to pass
  through cleanly
- `apps/api/src/application/services/engineStartRunUseCase.ts`
  remains the delegate used after admission
- `apps/api/src/entrypoints/http/authErrorMapper.ts`
  map duplicate and admission outcomes to stable HTTP responses
- `apps/api/src/modules/buildProtectedRuntimeModule.ts`
  compose the PR1 collaborators with admission left `off` until PR2 provides a
  real snapshot source
- `apps/api/test/application/services/startRunAuthorizedFacade.test.ts`
- `apps/api/test/entrypoints/http/startRunRoute.test.ts`
- `apps/api/test/entrypoints/http/httpErrorTranslation.test.ts`

### New files expected in PR1

- `apps/api/src/application/ports/DuplicateRunProbe.ts`
- `apps/api/src/application/ports/AdmissionTelemetry.ts`
- `apps/api/src/application/ports/IAdmissionMode.ts`
- `apps/api/src/application/services/BackpressureAwareStartRunUseCase.ts`
- `apps/api/src/application/services/NoopDuplicateRunProbe.ts`
- `apps/api/src/application/services/NoopAdmissionTelemetry.ts`
- `apps/api/test/application/services/BackpressureAwareStartRunUseCase.test.ts`
- `apps/api/test/application/services/NoopDuplicateRunProbe.test.ts`

### Optional helper files if the implementation needs them

- `apps/api/src/application/admission/*`
  only if keeping orchestration helpers outside `services` improves cohesion

## TDD Sequence

The PR should be built outside-in.

### Step 1: HTTP result mapping tests

Add failing tests in:

- `apps/api/test/entrypoints/http/httpErrorTranslation.test.ts`

Cover:

- duplicate result mapping
- tenant overload mapping
- system overload mapping
- observe-mode accepted result remains `202`

### Step 2: Route tests

Add failing tests in:

- `apps/api/test/entrypoints/http/startRunRoute.test.ts`

Cover:

- route returns mapped duplicate response
- route returns mapped tenant reject response
- route returns mapped system reject response

### Step 3: Application service tests

Add failing tests in:

- `apps/api/test/application/services/BackpressureAwareStartRunUseCase.test.ts`

Cover:

- duplicate probe executes before admission
- admission executes before engine delegate
- engine delegate is not called on duplicate
- engine delegate is not called on reject
- observe mode records hypothetical reject but returns accepted delegate result

### Step 4: Facade compatibility tests

Adjust:

- `apps/api/test/application/services/startRunAuthorizedFacade.test.ts`

Cover:

- authenticated and authorized requests preserve the richer use-case result
- unrelated runtime exceptions still rethrow

### Step 5: No-op collaborator tests

Add small unit tests for:

- `NoopDuplicateRunProbe`
- `NoopAdmissionTelemetry`

### Step 6: Wiring

Only after the tests above are red:

- wire the use case in `buildProtectedRuntimeModule.ts`
- keep the collaborators no-op or in-memory in PR1

## Target Result Shapes For PR1

PR1 should stabilize the application contracts, even if they are still backed
by no-op adapters.

Recommended duplicate result shape:

```ts
type DuplicateRunProbeResult =
  | { readonly kind: 'not_found' }
  | { readonly kind: 'found_run'; readonly runId: string }
  | { readonly kind: 'found_intent'; readonly runId: string };
```

Recommended admission mode shape:

```ts
type AdmissionMode = 'off' | 'observe' | 'enforce';
```

Recommended telemetry contract:

```ts
interface AdmissionTelemetry {
  recordDecision(input: {
    requestId: string;
    tenantId: string;
    runId: string;
    mode: AdmissionMode;
    decision:
      | 'accept'
      | 'duplicate'
      | 'reject_tenant'
      | 'reject_system'
      | 'would_reject_tenant'
      | 'would_reject_system';
    retryAfterSeconds?: number;
  }): Promise<void>;
}
```

The contract is intentionally async from the beginning.

## Library Guidance

Libraries are relevant here, but PR1 should only prepare for them.

Allowed to reference now:

- `rate-limiter-flexible`
  candidate for future admission limiter wrapper
- `opossum`
  candidate for future circuit-breaker wrapper

Not to introduce in PR1 unless a concrete need appears:

- Redis-backed limiter
- distributed cache
- bespoke in-house limiter
- bespoke in-house breaker

Why:

- PR1 is a contract and orchestration slice
- production-grade limiter and breaker selection belongs to later slices where
  the infrastructure boundary is actually implemented

## Acceptance Standard

PR1 is acceptable only if:

- the API remains green with no dependency on raw snapshot SQL
- the new ports are narrow and stable
- the test order proves duplicate -> admission -> delegate
- no engine package contract is modified
- no delivery package contract is modified

## Implementation Notes

- `DuplicateRunProbe` is implemented as a port plus no-op collaborator in PR1
  so the orchestration contract is stable before a production adapter exists
- duplicate semantics are still protected in runtime because
  `StartRunAuthorizedFacade` maps engine duplicate errors as a fallback
- `buildProtectedRuntimeModule.ts` wires PR1 in `off` mode intentionally; real
  admission enforcement waits for PR2 snapshot acquisition

## Verification Target

- route-level tests for:
  accept, duplicate, tenant reject, system reject
- use-case ordering tests
- `pnpm --filter dvt-api test`
- `pnpm --filter dvt-api build`

## Checklist

- [x] `DuplicateRunProbe` contract added
- [x] `BackpressureAwareStartRunUseCase` added
- [x] admission telemetry contract is async from the beginning
- [x] duplicate probe runs before backpressure
- [x] observe mode returns accepted response while emitting hypothetical decision
- [x] error mapping distinguishes tenant and system overload
- [x] rate limiter ordering documented in code or tests
- [x] no custom production rate limiter is introduced in this PR
- [x] API tests cover duplicate and reject paths
- [x] docs and comments do not imply projected snapshot already exists

## Resolution Table

| Item                     | Status              | Notes                                                          |
| ------------------------ | ------------------- | -------------------------------------------------------------- |
| Duplicate probe contract | Implemented locally | Port plus no-op collaborator; production adapter deferred      |
| Admission orchestrator   | Implemented locally | Decorator around existing start-run use case                   |
| Telemetry contract       | Implemented locally | Async and backend-agnostic, with enforce and observe decisions |
| Observe mode             | Implemented locally | Same telemetry shape as enforce, no rejection                  |
| Review readiness         | Green in `dvt-api`  | `pnpm --filter dvt-api test` and `build` pass                  |
