---
title: VTX1 visual timestamptz cast drift fix
status: Accepted
date: 2026-08-25
owners:
  - apps/web
arc_level: ARC-2
breaking: false
code_refs:
  - apps/web/src/app/views/canvas/canvasVisualTransformSqlCompiler.ts
  - apps/web/src/app/views/canvas/DvtVisualTransformRecipeAuthoringSection.tsx
evidence:
  tests:
    - pnpm --filter dvt-web test -- canvasVisualTransformSqlCompiler.test.ts
---

# VTX1 visual timestamptz cast drift fix

The visual authoring UI already exposes `timestamptz` as a PostgreSQL cast target, while the VTX1 visual SQL compiler rejected that exact value as `unsupported_cast_type`.

This change fixes only that functional mismatch by admitting PostgreSQL's `timestamptz` alias in the existing compiler allow-list and adding a regression test that compiles the exact UI-exposed value.

It deliberately does not consolidate the Web/compiler discovery lists or redefine portable type semantics. SUB1 #2640/#2642 owns that later convergence through the Substrait-backed semantic capability catalog and visual projection.
