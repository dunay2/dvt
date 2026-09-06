---
title: ENG1 Start failure preparation authority
status: Accepted
date: 2026-09-06
owners:
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/services/startRun/StartRunTypes.ts
  - packages/@dvt/engine/src/services/startRun/StartRunFailurePolicy.ts
  - packages/@dvt/engine/src/services/startRun/StartRunExecutionService.ts
  - packages/@dvt/engine/src/application/StartRunApplicationService.ts
  - packages/@dvt/engine/src/application/IStartRunApplicationService.ts
  - packages/@dvt/engine/src/application/RecoverRunApplicationService.ts
  - packages/@dvt/engine/test/core/WorkflowEngine.startMutationAuthority.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine exec vitest run --coverage
    - pnpm --filter @dvt/engine build
    - pnpm --filter @dvt/engine typecheck
    - pnpm exec eslint packages/@dvt/engine/src packages/@dvt/engine/test --max-warnings 0
    - pnpm --filter dvt-api test:unit
    - pnpm --filter dvt-api proof:start-run-otel
    - pnpm arch:deps
    - pnpm traceability:adr0
---

# Start Failure Preparation Authority

## Governed Claim

The common start failure handler cannot emit RunFailed merely because a run
exists. It requires this invocation's successful preparation receipt and an
eligible phase, before reading metadata/intent for failure emission.
Recovery created/reused dispositions come from their actual preparation paths.

The existing IWorkflowEngine.startRun rail and recovery service remain the
owners. ADR-0013 governs bootstrap atomicity; ADR-0030 governs existing intent
and compensation behavior. The bounded design is recorded in
[the implementation plan](../planning/proposals/mandatory/runtime-and-contracts/eng1-start-mutation-authority-plan-20260906.md)
and [StartRunProtocol](../architecture/components/engine/contracts/engine/StartRunProtocol.v1.md).

## Executable Evidence

Before production changes, 14 actual Engine regressions produced nine expected
failures: duplicate PENDING/RUNNING/PAUSED, tenant/PlanRef/schema rejection with
an existing run, concurrent estimated bootstrap loss, and both recovery reuse
paths appended unauthorized RunFailed. Five controls passed.

The final suite has 16 passing regressions. Two additional cases hold the
artifact read after duplicate preflight while another invocation creates the run;
capability/context rejection then preserves the winner exactly.
Tests clone complete metadata, ordered events, snapshot and intent. Promise
barriers force the winner intent to DISPATCHED before releasing the loser.
Own reconciliation failure still compensates the exact provider ref and persists
the legitimate RunFailed; prepared recovery with failed intent creation stays
PENDING. Barriers are released and calls drained in finally blocks.

Full Engine coverage: 64 files, 479 tests passed; V8 measured 89.5% statements and
lines, 86.81% branches and 93.43% functions. Replay, architecture and contract
golden-path suites are included. Engine build, typecheck, package lint,
arch:deps and traceability:adr0 passed.

API unit evidence: 1,080 tests passed; 27 existing PostgreSQL-dependent tests
were skipped because that unit invocation did not set database connection
variables. Those tests concern onboarding, auth audit, Canvas authority and dbt
import storage. No skip was added by this change. The separate protected
StartRun OpenTelemetry integration passed all three tests against the compiled
Engine and provider adapter boundary; it does not certify a live Temporal worker.

## Delivery And Remaining Scope

The repository coverage wrapper passed --coverage after a bare -- and did not
activate measurement. The direct command above supplied actual coverage.
The wrapper defect is recorded in
[#2942](https://github.com/dunay2/dvt/issues/2942#issuecomment-5559368086);
CI configuration is outside this PR.

This receipt proves run preparation, not exclusive ownership of the deterministic
intent or provider effect. No-estimate dispatch and reused recovery can perform
intent/reconciliation/compensation writes before the common error handler.
[#2678](https://github.com/dunay2/dvt/issues/2678) owns durable claims/fencing;
[#2679](https://github.com/dunay2/dvt/issues/2679) owns unknown provider outcomes.
[#2676](https://github.com/dunay2/dvt/issues/2676) remains open for its global
invariant. No new stub, bypass, relaxed rule or hidden debt is introduced.

Final delivery gates, review/merge state and checked closeout evidence are recorded
in #2676; this artifact records the bounded semantic proof.
