---
title: F-17-E Monaco Bundle Isolation Closeout
status: Draft
owner: Frontend / Architecture
date: 2026-05-22
featureId: F17E-MONACO-BUNDLE-ISOLATION-20260522
---

# F-17-E Monaco Bundle Isolation Closeout

## Result

Implemented a testable Monaco bundle isolation boundary:

- added `resolveWebManualChunk()` as the pure Vite manual chunk resolver;
- delegated `vite.config.ts` manual chunking to that resolver;
- added a Monaco architecture guard for lazy gateways, surface-only
  `@monaco-editor/react` imports, and chunk names;
- routed Monaco/config changes to the Monaco focus suite;
- added component documentation, user stories, Fowler analysis, and inventory
  drift fixes.

## Validation

- `pnpm --filter @dvt/web exec vitest run --config vitest.monaco.config.ts src/app/components/monaco/monacoBundleIsolation.architecture.test.ts`
- `pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts`

## No-Debt Evidence

No stubs, placeholders, fake Monaco surfaces, save/apply commands, rule
relaxations, skipped hooks, or hidden debt were added.
