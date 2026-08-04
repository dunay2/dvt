---
title: Bounded object-file to PostgreSQL step admission
status: Accepted
date: 2026-08-04
owners:
  - packages/@dvt/contracts
  - packages/@dvt/planner
  - packages/@dvt/plan-verifier
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/ObjectFileToPostgresStepTypeConfig.v1.ts
  - packages/@dvt/contracts/src/step-registry/BuiltInStepTypeEntries.ts
  - packages/@dvt/planner/src/domain/Planner.ts
  - packages/@dvt/plan-verifier/src/stepTypeConfig.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/planner test
    - pnpm --filter @dvt/planner typecheck
    - pnpm --filter @dvt/plan-verifier test
    - pnpm --filter @dvt/plan-verifier typecheck
    - pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/StoredPlanExecutabilityValidator.test.ts
    - pnpm --filter dvt-api typecheck
    - pnpm docs:feature-mechanization:implementation
    - pnpm verify:prepush
---

## Decision

`LOAD_OBJECT_FILE_TO_POSTGRES` extends the existing typed step registry. Its
versioned configuration admits exactly one content-addressed S3 object, one
explicit CSV or JSON Lines mapping, and one PostgreSQL `staging` replacement
target. The immutable plan contains only bounded metadata and opaque credential
references.

Planner compilation and stored-plan verification pass plan ownership into the
same registry validator. Scope drift, unsupported inputs, malformed identity,
and missing ownership therefore fail before execution. The registry projects
the dedicated `executor.object-file-postgres-load` capability, which remains
absent until the runtime slice in issue 2179 is implemented.

## Evidence

Contract tests cover accepted CSV and JSON Lines fixtures plus unsupported
formats, encodings, load modes, locators, sizes, credentials, mappings, and
unknown fields. Planner tests prove canonical hash stability and capability
projection. Stored-plan and API admission tests prove ownership revalidation
and fail-closed behavior when the runtime capability is unavailable. Existing
DBT and PostgreSQL transformation profiles remain unchanged.
