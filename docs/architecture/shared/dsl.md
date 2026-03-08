---
title: Gateway DSL Package
status: Active
owner: Architecture / Adapter Runtime
last_reviewed: 2026-03-08
---

# Gateway DSL Package

This page is the canonical package reference for `@dvt/dsl`.

## Current Reality

`@dvt/dsl` is a very small deterministic expression package. It is not a rich
policy engine and it is not yet backed by an accepted repository-wide DSL
specification.

DSL v1 currently supports:

- one identifier on the left;
- one equality operator (`=`);
- one literal on the right (`string`, `number`, or `boolean`).

It explicitly does not support:

- `AND` or `OR`;
- function calls;
- compound expressions;
- side effects.

## Why It Matters

The package is small, but gateway decisions run inside workflow execution. That
means even a minimal expression evaluator must stay deterministic and clearly
scoped.

## Primary Code Anchors

- Public package entrypoint:
  [packages/@dvt/dsl/src/index.ts](../../../packages/@dvt/dsl/src/index.ts)
- AST:
  [packages/@dvt/dsl/src/v1/ast.ts](../../../packages/@dvt/dsl/src/v1/ast.ts)
- Parser:
  [packages/@dvt/dsl/src/v1/parser.ts](../../../packages/@dvt/dsl/src/v1/parser.ts)
- Evaluator:
  [packages/@dvt/dsl/src/v1/evaluator.ts](../../../packages/@dvt/dsl/src/v1/evaluator.ts)
- Package tests:
  [packages/@dvt/dsl/test/dsl-v1.test.ts](../../../packages/@dvt/dsl/test/dsl-v1.test.ts)
- Runtime consumer:
  [packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts](../../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts)

## Verification

- `pnpm --filter @dvt/dsl test`

## Open Gaps

- There is still no accepted repository-wide DSL specification.
- The current grammar is intentionally tiny and should not be oversold as a
  general workflow decision language.
- Any future grammar growth must preserve deterministic workflow execution.

## Related Docs

- [Risk: workflow gateway context guard](../../risk-register/adapters/R-20260307-workflow-gateway-context-guard.md)
- [Canonical Doc Code Matrix](../../planning/status/canonical-doc-code-matrix.md)
- [Repository Map](../../concepts/repository-map.md)
