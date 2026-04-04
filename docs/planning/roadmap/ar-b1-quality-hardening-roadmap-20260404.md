---
title: AR-B1 quality hardening roadmap
status: Active
owner: Product / Architecture / Engine
last_reviewed: 2026-04-04
planning_type: proposal
---

# AR-B1 quality hardening roadmap

Execution sequence derived from Fowler-hard QA findings for AR-B1.

## Itemized execution

1. `TransitionPolicy` declarative model in `@dvt/run-domain`  
   status: `done`  
   outcome:
   - transition policy extracted to one declarative module
   - `applyRunEvent` now consumes the shared policy maps

2. `SignalTransitionGuard` service extraction  
   status: `done`  
   outcome:
   - `WorkflowEngineCoreService` no longer owns snapshot rebuild/precheck internals
   - signal pre-validation is isolated in a dedicated service class

3. test harness modularization/templates  
   status: `done`  
   outcome:
   - shared run lifecycle fixture helpers added for queued/start transitions
   - core and mock-adapter tests now reuse helpers instead of duplicating event envelopes

4. doc alignment with shipped behavior  
   status: `done`  
   outcome:
   - technical and user manuals explicitly document signal precheck behavior
   - `CANCELLING` clarified as derived substatus, not persisted run status

5. nightly postgres integration execution  
   status: `done`  
   outcome:
   - scheduled workflow added for nightly adapter-postgres integration smoke

## Validation baseline

```bash
pnpm --filter @dvt/run-domain test
pnpm --filter @dvt/engine test -- test/core/WorkflowEngineCoreService.test.ts
pnpm test:engine
pnpm docs:workboard:generate
pnpm docs:sync
pnpm verify:prepush
```
