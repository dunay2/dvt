---
title: Transform i64 arithmetic evidence
status: Accepted
date: 2026-09-28
owners:
  - web
  - packages/@dvt/contracts
  - packages/@dvt/postgres-projection
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitStandardCandidates.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSupportedCapabilities.v1.ts
  - packages/@dvt/postgres-projection/src/substraitColumnFunctionCatalog.ts
  - packages/@dvt/postgres-projection/src/relationalSql/scalarBindings.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitScalarFunction.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitCalculatedExpression.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts exec vitest run test/dvt-substrait-capability-catalog.contract.test.ts
    - pnpm --filter @dvt/postgres-projection exec vitest run test/relationalI64Arithmetic.test.ts
    - pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasDvtSubstraitCalculatedExpression.i64.test.ts
    - pnpm --filter @dvt/contracts schema:verify
    - pnpm --filter @dvt/web typecheck
    - pnpm verify:prepush
---

# Transform i64 arithmetic evidence

## Scope

Issue #3434 admits a bounded integer arithmetic slice for Transform formulas:

```text
i64 + i64 -> i64
i64 - i64 -> i64
i64 * i64 -> i64
i64 / i64 -> i64
```

The semantic identities are the official Substrait v0.101.0
`extension:io.substrait:functions_arithmetic` scalar functions `add`, `subtract`,
`multiply` and `divide`. DVT does not define aliases for those identities and does not
introduce a second operator registry.

The V1 cut deliberately excludes fp32/fp64, decimal arithmetic, mixed numeric types and
implicit coercion.

## Exact invocation posture

The selected signatures are:

```text
add:i64_i64
subtract:i64_i64
multiply:i64_i64
divide:i64_i64
```

All are exactly binary and return i64.

For add, subtract and multiply the admitted Substrait `overflow` preference is `ERROR`.
For divide, DVT also selects `on_domain_error=ERROR` and
`on_division_by_zero=ERROR`.

This matches the bounded PostgreSQL bigint target posture used by this slice: arithmetic is
lowered through the governed PostgreSQL AST to `+`, `-`, `*` and `/`; overflow and
division-by-zero remain errors rather than being silently saturated or converted to NULL.

## Literal and authoring boundary

Signed i64 literals reuse the existing canonical Substrait literal representation and are
range checked against:

```text
-9223372036854775808 .. 9223372036854775807
```

The visual Formula Builder consumes these capabilities through
`resolveDvtSubstraitColumnFunctions` and writes through the existing
`ConfigureCanvasDvtNode` path. The UI draft is transient; persisted meaning remains the typed
Substrait plan plus stable DVT RelationId/FieldId/provenance sidecar.

Unsupported provider, mixed operand types, malformed arity/signature/options and out-of-range
literals fail closed.


## Validation result

GitHub CI on the governed branch completed the required routed checks successfully:

- Contracts & Determinism — PASS.
- Test Suite required gate — PASS.
- PR Quality Gate — PASS.
- CI Code Quality affected-workspace build/lint/typecheck — PASS.

Dependency Review and CodeQL were skipped by repository routing for this diff. No rule, test,
lint threshold or provider guard was relaxed.
