---
title: Structured contracts error model rollout
status: Accepted
date: 2026-04-03
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/artifacts
  - packages/@dvt/planner
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/errorContract.ts
  - packages/@dvt/contracts/src/errors.ts
  - packages/@dvt/contracts/src/validation.ts
  - packages/@dvt/contracts/src/contracts/planner/PlannerPolicyVocabulary.v2.ts
  - packages/@dvt/contracts/src/ports/artifact-store.ts
  - packages/@dvt/artifacts/src/compiledCode/adapters/InMemoryCompiledCodeStorage.ts
  - packages/@dvt/artifacts/src/compiledCode/adapters/FileSystemCompiledCodeStorage.ts
  - packages/@dvt/artifacts/src/compiledCode/adapters/MinioCompiledCodeStorage.ts
  - packages/@dvt/artifacts/src/compiledCode/adapters/S3CompiledCodeStorage.ts
  - packages/@dvt/engine/test/core/WorkflowEngine.test.ts
  - packages/@dvt/engine/test/core/WorkflowEngine.intent-id-deterministic.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- test/errors.test.ts test/validation.test.ts test/planner-policy-vocabulary.test.ts
    - pnpm --filter @dvt/engine test -- test/core/WorkflowEngine.test.ts test/core/WorkflowEngine.intent-id-deterministic.test.ts
    - pnpm --filter @dvt/artifacts test -- test/artifactSurface.test.ts
    - pnpm --filter @dvt/planner test -- test/unit/planner-facade.test.ts test/unit/policies.test.ts test/compiledCode/InMemoryCompiledCodeStorage.test.ts test/compiledCode/FileSystemCompiledCodeStorage.test.ts test/compiledCode/attachCompiledCodeRefs.test.ts
    - pnpm --filter @dvt/adapter-temporal test -- test/TemporalPolicyMapper.test.ts
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm docs:sync
    - pnpm verify:prepush
---

# ED-20260403 Structured contracts error model rollout

## Decision captured

This evidence records the breaking repo-wide cutover from stringly
`@dvt/contracts` errors to a structured shared-kernel error model with
`code`, `messageKey`, and `messageParams`.

## What this evidence proves

1. Public `@dvt/contracts` errors now expose structured semantic metadata.
2. `ValidationErrorResponse` is now a structured boundary contract instead of a
   message-only payload.
3. Artifact-storage adapters no longer construct shared-kernel errors with
   ad hoc string messages.
4. Engine boundary tests no longer use `/Validation failed/` as the semantic
   assertion for contract rejections.
5. Planner and Temporal policy-mapper flows remain compatible with the new
   structured error model.

## Validation notes

- Focused package and consumer tests were executed before docs/governance
  regeneration to catch stringly-message regressions early.
- ARC validation is included because this slice touches the `contracts`
  trigger path and therefore requires evidence plus a risk update.
