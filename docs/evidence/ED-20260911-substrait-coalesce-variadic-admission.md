---
title: Substrait variadic invocation and COALESCE admission
status: Accepted
date: 2026-09-11
owners:
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitCapabilityCatalogSchema.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSupportedCapabilities.v1.ts
  - packages/@dvt/contracts/test/dvt-substrait-capability-catalog.contract.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts exec vitest run test/dvt-substrait-capability-catalog.contract.test.ts
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/contracts schema:verify
    - pnpm --filter @dvt/contracts test
---

# Substrait variadic invocation and COALESCE admission

## Scope

Issue #2935 replaces the exact invocation arity field with an explicit range:

```text
minimumArgumentCount
maximumArgumentCount?
```

The hard cut rejects the retired `argumentCount` shape. Fixed invocations retain equal
minimum and maximum bounds. Variadic invocations omit the maximum.

## Semantic admission

The pinned Substrait v0.101.0 `functions_comparison.yaml` defines
`coalesce:any1` as variadic with a minimum of two arguments and no maximum. The
catalog admits that official identity with PostgreSQL target conformance. The bounded
product exposure is PostgreSQL text; consumers must preserve the standard `any1`
signature and enforce the admitted type projection without creating another function
catalog.

The catalog schema rejects a minimum below the signature arity, a maximum below the
minimum, malformed fixed CONCAT bounds, malformed COALESCE bounds, and legacy exact
arity payloads.

## Validation

The focused contract test first failed four cases against the old shape: missing range
bounds for CONCAT and EXTRACT, missing COALESCE admission, and acceptance of the retired
field. After implementation the same file passed 20 tests.

The package typecheck passed. Schema verification passed 25 tests. The complete
`@dvt/contracts` suite passed 59 files and 540 tests.
