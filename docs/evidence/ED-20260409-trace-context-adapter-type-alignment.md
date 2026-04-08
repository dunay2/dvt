---
title: StartRun trace context adapter type aligned with traceable runtimes
status: Accepted
date: 2026-04-09
owners:
  - packages/@dvt/engine
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/core/WorkflowEngine.ts
  - packages/@dvt/engine/src/services/startRun/StartRunTypes.ts
  - packages/@dvt/engine/src/core/lifecycle/coreDomainConstants.ts
  - packages/@dvt/engine/test/core/WorkflowEngine.planRef.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine build
    - pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.planRef.test.ts
    - pnpm --filter @dvt/engine test -- test/services/StartRunApplicationService.test.ts
    - pnpm verify:prepush
---

## Summary

`WorkflowEngine` and `StartRunTraceContext` still declared `'local'` as a
possible `adapter` value even though the runtime trace model only emits
traceable provider adapters and the implementation already reduced the
effective set to `temporal | conductor`.

This slice removes the dead union member and reuses the canonical
`TraceableAdapter` type so trace context typing matches the actual runtime
behavior.

## What changed

- `StartRunTraceContext.adapter` now reuses
  `coreDomainConstants.TraceableAdapter`.
- `IStartRunApplicationService.startRun(...)` in `WorkflowEngine` now consumes
  `StartRunTraceContext` directly instead of an inline duplicated trace-context
  shape.
- `WorkflowEngine.buildTraceContext(...)` now derives `adapter` from
  `TRACEABLE_ADAPTERS` instead of carrying its own stale union declaration.
- The planRef normalization test now imports the shared trace-context type,
  removing the last test-only reference to the dead `'local'` branch.

## Expected effect

- Engine trace context typing matches the runtime-owned adapter model.
- Internal start-run seams no longer advertise an impossible `'local'`
  adapter path.
- Future trace-context changes have one canonical type source instead of
  drifting duplicated unions.
