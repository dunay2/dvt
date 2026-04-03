---
title: S08-5-B runExecutionContext governed boundary
status: Accepted
date: 2026-04-03
owners:
  - '@dvt/contracts'
  - '@dvt/engine'
  - '@dvt/artifacts'
  - 'dvt-api'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/types/contracts.ts
  - packages/@dvt/contracts/src/contracts/engine/RunExecutionContext.v1.ts
  - packages/@dvt/contracts/src/validation.ts
  - packages/@dvt/artifacts/src/ports/IRunExecutionContextReader.ts
  - packages/@dvt/engine/src/services/startRun/RunExecutionContextAdmissionPolicy.ts
  - packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts
  - apps/api/src/application/services/engineStartRunUseCase.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/artifacts build
    - pnpm --filter @dvt/engine build
    - pnpm --filter @dvt/engine test
    - pnpm --filter dvt-api test -- test/application/services/engineStartRunUseCase.test.ts test/entrypoints/http/startRunRouteCommandBuilder.test.ts test/entrypoints/http/startRunRouteParserHelpers.test.ts
---

# Summary

S08-5-B promotes `runExecutionContext` from convention to a governed public
boundary. The runtime transport is `runExecutionContextRef`, while the
serialized payload is validated as a dedicated shared contract.

# What changed

1. Added shared contracts and parsers for `RunExecutionContext` and
   `RunExecutionContextRef` in `@dvt/contracts`.
2. Added artifacts-owned read-side port `IRunExecutionContextReader`.
3. Added engine admission policy
   `RunExecutionContextAdmissionPolicy` and integrated it into
   `StartRunAdmissionGuard`.
4. Extended start-run transport (`RunContext` and API `StartRunCommand`) with
   optional `runExecutionContextRef`.
5. Mapped provenance rejection to existing API `planRejected` surface with
   `code: REJECTED` and `cause: run_execution_context`.

# Validation notes

- `@dvt/contracts`, `@dvt/artifacts`, and `@dvt/engine` pass build/test for
  this slice.
- Targeted `dvt-api` tests covering the changed parser/use-case surfaces pass.
- Full `dvt-api` suite in this environment still reports pre-existing missing
  dependency `@aws-sdk/client-s3` from unrelated planner resolver tests.
