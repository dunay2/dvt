---
title: Source FilterRel capability admission
status: Accepted
date: 2026-09-03
owners:
  - '@dvt/contracts'
  - '@dvt/web'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSupportedCapabilities.v1.ts
  - apps/web/src/app/views/canvas/canvasDvtSubstraitFilter.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- dvt-substrait-capability-catalog
    - pnpm --filter @dvt/web test:canvas:run -- canvasDvtSubstraitFilter.test.ts
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web lint
    - pnpm verify:prepush
---

Issue #2894 admits the pinned standard `substrait.FilterRel` for one bounded PostgreSQL
Source predicate. The initial shape is equality between one stable text field and one string
literal. Existing admitted standard identities provide `equal`, literal, string, selection,
ReadRel and ProjectRel semantics.

The Canvas command persists the same Substrait plan and stable DVT sidecar on the Source card;
it does not introduce a Source recipe, SQL model, hidden Transform, store or command. Strict
inspection rejects unsupported functions, operands, providers, identities and relation shapes.
Target and visible evidence are completed by the focused Web behavior and PostgreSQL tests.
