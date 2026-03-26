---
title: API HTTP EntryPoints Fowler Refactor Status
status: Active
owner: API / Architecture
last_reviewed: 2026-03-25
planning_type: status
---

# API HTTP EntryPoints Fowler Refactor Status

## Checklist

- [x] `COMPLETED` Item 1: Homogeneizar el patrón parser + policy/constants en `listRunsRoute`, `getRunRoute`, `getRunEventsRoute`.
- [x] `COMPLETED` Item 2: Eliminar `TenantId.unsafe(...)` en rutas HTTP y usar parseo explícito en borde.
- [x] `COMPLETED` Item 3: Reducir duplicación de parsing/rules HTTP (runId, tenantId, enteros y límites) con helpers de parser.
- [x] `COMPLETED` Item 4: Separar constantes de `signal` por responsabilidad (autorización vs validación/errores).

## Validation

- `pnpm --filter dvt-api typecheck` ✅
- `pnpm --filter dvt-api test -- test/entrypoints/http/signalRunRouteParser.test.ts test/entrypoints/http/signalRunRoute.test.ts test/entrypoints/http/listRunsRoute.test.ts test/entrypoints/http/getRunRoute.test.ts test/entrypoints/http/getRunEventsRoute.test.ts` ✅
  - Nota: se ejecutó en modo escalado por `spawn EPERM` del sandbox.
- `pnpm verify:prepush` ✅
