---
title: Transform bigint DIVIDE evidence
status: Accepted
date: 2026-09-28
owners:
  - web
  - packages/@dvt/contracts
  - packages/@dvt/postgres-projection
planning_type: evidence
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitStandardCandidates.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSupportedCapabilities.v1.ts
  - packages/@dvt/postgres-projection/src/relationalSql/scalarBindings.ts
  - packages/@dvt/postgres-projection/test/relationalArithmetic.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresAppRoleRuntime.integration.test.ts
  - apps/web/src/app/views/canvas/canvasDerivedOutputFormula.ts
  - apps/web/src/app/views/canvas/canvasDerivedOutputVisualFormula.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/postgres-projection test
    - pnpm --filter @dvt/adapter-postgres test -- PostgresAppRoleRuntime.integration.test.ts
    - pnpm --filter @dvt/web test:unit:run
    - pnpm --filter @dvt/web typecheck
    - pnpm verify:prepush
---

# Transform bigint DIVIDE evidence

## Scope

Issue [#3434](https://github.com/dunay2/dvt/issues/3434) admits one additional
arithmetic capability for Transform formulas:

```text
i64 / i64 -> i64
```

The semantic identity is the official Substrait v0.101.0
`extension:io.substrait:functions_arithmetic` scalar function `divide`.
The admitted invocation is exactly `divide:i64_i64`; fp64 division remains
outside this slice.

## Semantic and target posture

Pinned Substrait defines integer division as truncation toward zero. The
selected invocation fixes these options:

```text
overflow=ERROR
on_domain_error=ERROR
on_division_by_zero=ERROR
```

PostgreSQL bigint division uses the native `/` operator. The required
provider-native integration proof executes the database and verifies all three
semantic boundaries: `-5 / 2 = -2` (truncation toward zero), a zero divisor
raises SQLSTATE `22012` (`division_by_zero`), and
`INT64_MIN / -1` raises SQLSTATE `22003`
(`numeric_value_out_of_range`). This matches the selected error posture.

The PostgreSQL projection keeps both operands explicitly cast to `bigint`.
No implicit numeric coercion, decimal overload, fp64 overload, alternative
error policy, or UI-local semantic identity is introduced.

## Authoring and round-trip

The existing bounded Transform formula syntax now recognizes `/` at the same
precedence level as multiplication. It lowers through
`compileDerivedOutputFormula`, resolves the admitted capability from the
catalog, and writes the canonical typed Substrait scalar expression.

The visual Formula Builder consumes the same capability projection. It exposes
the admitted operation as the catalog-driven `DIVIDE` function node, validates
the serialized formula through the existing compiler, and keeps fp64 DIVIDE
unavailable. The bounded formula grammar itself owns the equivalent infix `/`
syntax and round-trip.

Persistence remains the existing typed Substrait plan plus the stable DVT
identity/provenance sidecar. The visual tree remains ephemeral.

## Negative guarantees

- fp64 DIVIDE is not admitted.
- mixed operand types fail capability resolution.
- malformed arity, output type, options, or signature fail target projection.
- a forged non-error division-by-zero policy is rejected.
- no new parser authority, expression IR, persistence rail, or provider-specific
  semantic registry is introduced.

## Validation status

Executable proof is carried by the arithmetic projection suite, the
provider-native PostgreSQL integration cases, formula compiler tests, visual
formula tests, capability-catalog contracts and the repository's governed
pull-request checks.

The reviewed head `3cd8aad9eddafae4fab9b1cc7a18bcc03c46da1a` completed Dependency Review,
Contracts & Determinism, CodeQL, Test Suite, PR Quality Gate and CI Code Quality
successfully before this evidence was promoted to Accepted.
