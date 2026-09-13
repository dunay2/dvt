---
title: JOIN unary null predicate admission
status: Accepted
date: 2026-09-13
owners:
  - packages/@dvt/contracts
  - apps/web
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSupportedCapabilities.v1.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitJoinCondition.ts
evidence:
  tests:
    - pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasDvtSubstraitJoinComposition.test.ts src/app/labs/semanticWorkbenchFixture.test.ts
---

# JOIN unary null predicate admission

Issue [#3135](https://github.com/dunay2/dvt/issues/3135) extends the existing
`ConfigureCanvasDvtNode` rail. ADR-0064 and the pinned Substrait v0.101.0
[comparison extension](https://github.com/substrait-io/substrait/blob/v0.101.0/extensions/functions_comparison.yaml)
govern the semantics: `is_null` and `is_not_null` each accept one `any1`
argument and return a required boolean, including for a null input.

## Bounded change

The editor assumes two operands for every condition. Replace that assumption
with a unary/binary condition union, preserving recursive groups, stable field
identities and the canonical Substrait document. No new editor or command.

```text
Before: left + right -> binary comparison -> JoinRel
After:  operand -> null predicate -> existing AND/OR group -> JoinRel
                                                |-> SQL AST / tree / sample
```

The right operand is absent, not a dummy value. Reject malformed arity, unknown
fields and future-input references. Keep the binary relation link unchanged.
Extract only condition inspection from the oversized JOIN composition module.
JSON samples may declare nullable non-key columns; missing cells, null primary
keys and invalid typed values remain errors. Functions propagate null inputs;
comparisons do not convert nulls to strings or zero.

## Validation evidence

The initial focused run failed three tests because binary-only consumers read
the absent right operand. The corrected tests prove serialization/reload,
PostgreSQL projection and rejection of a second argument on a unary predicate.
Fixture tests prove one incoming expression edge, function null propagation and
`AND (upper(trim(country)) IS NULL OR discount IS NULL)` grouping.

- Web unit: JOIN composition, condition labels, dataset and fixture tests passed.
- Web architecture: 10 semantic workbench guards passed.
- Web presentation: 4 existing card gesture tests passed.
- Web typecheck and lint passed.
- Contracts: focused capability catalog tests passed (22); typecheck passed.

The running application at `http://127.0.0.1:5174/lab/semantic-workbench`
was exercised through the available browser automation. Adding
`raw.orders.discount IS NULL` hides the right operand and reduces the Transform
sample to one row. Reopening and saving `IS NOT NULL` gives nine rows. Switching
back and double-clicking the Transform opens the existing data table containing
`ORD-1008` with a genuine JSON null discount. No backend execution is claimed.

The integrated browser connection could not start because of the host sandbox
ACL failure; the available test browser completed the real UI checks instead.
Final lint/pre-push evidence is recorded in the issue. No stub, alternative
editor, disabled rule or hook bypass is part of the implementation.
