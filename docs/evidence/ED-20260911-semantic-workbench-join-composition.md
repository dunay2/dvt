---
title: Semantic Workbench join composition evidence
status: Accepted
date: 2026-09-11
owners:
  - web
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: false
code_refs:
  - apps/web/src/app/labs/SemanticWorkbenchLab.tsx
  - apps/web/src/app/labs/SemanticWorkbenchJoinConditionEditor.tsx
  - apps/web/src/app/labs/SemanticWorkbenchJoinOperandEditor.tsx
  - apps/web/src/app/views/canvas/canvasDvtSubstraitJoinComposition.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitJoinCondition.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitJoinOperand.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitStandardCandidates.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSupportedCapabilities.v1.ts
evidence:
  tests:
    - pnpm test:web:semantic-lab
    - pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/labs/SemanticWorkbenchJoinConditionEditor.test.ts src/app/labs/SemanticWorkbenchJoinOperandEditor.test.ts src/app/views/canvas/canvasDvtSubstraitExpression.test.ts src/app/views/canvas/canvasDvtSubstraitJoinComposition.test.ts src/app/views/canvas/canvasDvtSubstraitPostgresProjection.test.ts
    - pnpm --filter @dvt/contracts test -- dvt-substrait-capability-catalog.contract.test.ts
    - pnpm --filter @dvt/web lint
    - pnpm --filter @dvt/web typecheck
    - pnpm verify:prepush
---

# Semantic Workbench join composition evidence

The Workbench projects real JSON-backed sources into deterministic relational-flow cards. A selected
join expands its canonical Substrait predicate on demand, including grouped `AND`/`OR` conditions,
comparison operators, field or literal operands, and ordered unary-function chains.

Edits use the existing `ConfigureCanvasDvtNode` authority. Unsupported types, functions, malformed
groups, and unresolved fields fail closed. PostgreSQL preview consumes the same governed expression;
no second expression model, fake relation, or Web-only persistence store was introduced.
