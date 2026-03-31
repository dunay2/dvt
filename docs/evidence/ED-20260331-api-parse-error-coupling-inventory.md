---
title: API parser error-coupling inventory for future PR planning
status: Accepted
date: 2026-03-31
owners:
  - apps/api
arc_level: ARC-1
breaking: false
code_refs:
  - apps/api/src/entrypoints/http/runCommandFieldParsers.ts
  - apps/api/src/entrypoints/http/cancelRunRouteParser.ts
  - apps/api/src/entrypoints/http/signalRunRouteParser.ts
  - apps/api/src/entrypoints/http/signalRunRouteValidation.constants.ts
  - apps/api/src/entrypoints/http/getRunRouteParser.ts
  - apps/api/src/entrypoints/http/getRunEventsRouteParser.ts
  - apps/api/src/entrypoints/http/listRunsRouteParser.ts
evidence:
  tests:
    - pnpm --filter dvt-api test -- runCommandFieldParsers
    - pnpm --filter dvt-api test -- cancelRunRouteParser
    - pnpm --filter dvt-api test -- signalRunRouteParser
  analysis:
    - rg --line-number "type .*ParseErrorCode|const .*PARSE_ERROR_CODE|function badRequest\\(|function forbidden\\(|parseTenantId\\(" apps/api/src/entrypoints/http
    - rg -l "type .*ParseErrorCode|const .*PARSE_ERROR_CODE|function badRequest\\(|function forbidden\\(|parseTenantId\\(" apps/api/src/entrypoints/http
---

## Summary

This inventory captures parser error-code coupling risk discovered while
implementing generic run-command parser helpers, so future PRs can batch
targeted hardening without repeating discovery work.

## Priority map

### High

- `apps/api/src/entrypoints/http/cancelRunRouteParser.ts`
- `apps/api/src/entrypoints/http/signalRunRouteParser.ts`

Reason: both routes are directly wired to shared run-command parser helpers and
still bind parse responses to route-local closed code unions.

### Medium

- `apps/api/src/entrypoints/http/signalRunRouteValidation.constants.ts`

Reason: aliases run-command parse constants/types directly, so route evolution
can remain implicitly coupled even when helper plumbing is generic.

### Medium-low

- `apps/api/src/entrypoints/http/getRunRouteParser.ts`
- `apps/api/src/entrypoints/http/getRunEventsRouteParser.ts`
- `apps/api/src/entrypoints/http/listRunsRouteParser.ts`
- `apps/api/src/entrypoints/http/getRunRouteParser.constants.ts`
- `apps/api/src/entrypoints/http/getRunEventsRouteParser.constants.ts`
- `apps/api/src/entrypoints/http/listRunsRouteParser.constants.ts`

Reason: route-local closed error catalogs with local `badRequest`/`forbidden`
helpers. Not currently on the shared run-command executor path, but good
candidates for consistency hardening.

## Reuse checklist for future PRs

1. Check whether parser helpers are generic over `string` codes.
2. Verify route parse result types do not over-constrain shared helper outputs.
3. Add regression tests for custom/open parse-code values where plumbing is
   shared.
4. Keep error-code constants in dedicated modules when reused across routes.
