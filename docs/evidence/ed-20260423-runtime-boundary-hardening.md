---
title: Runtime boundary hardening across engine and API authorization
status: Accepted
date: 2026-04-23
owners:
  - packages/@dvt/engine
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/ports/IWorkflowEngine.ts
  - packages/@dvt/engine/src/index.ts
  - packages/@dvt/engine/src/services/startRun/StartRunValidationPolicy.ts
  - packages/@dvt/engine/test/contracts/package-surface.test.ts
  - packages/@dvt/engine/test/contracts/capabilities.contract.test.ts
  - apps/api/src/application/ports/accessDecision.ts
  - apps/api/src/infrastructure/auth/embeddedAccessDecisionService.ts
  - apps/api/src/modules/protectedRuntime/buildProtectedSecurityRuntime.ts
  - docs/adr/ADR-0051-access-decision-service-and-openfga-adapter.md
  - docs/risk-register/quality/R-20260423-RUNTIME-BOUNDARY-HARDENING.yaml
evidence:
  tests:
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/engine typecheck
    - pnpm --filter dvt-api test:arch
    - pnpm --filter dvt-api build
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test
    - pnpm test:contracts
    - pnpm --filter @dvt/contracts run schema:verify
    - pnpm golden:validate
    - pnpm docs:workboard:generate
    - pnpm docs:sync
    - pnpm docs:status:generate
    - $env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

# Summary

This ARC-2 branch closes three linked runtime hardening moves in one governed
diff:

1. `IWorkflowEngine` is now published only from `@dvt/engine`, with package
   surface tests preventing alternate public import paths.
2. Engine capability validation now fails closed when a run requires adapter
   capabilities but the adapter does not declare them.
3. `apps/api` now authorizes through a DVT-owned `IAccessDecisionService`
   contract with an embedded-first backend, rather than through an app-local
   repository plus policy split.

# What this evidence closes

1. Engine behavioral ownership is explicit and mechanically guarded at the
   public package surface.
2. Capability validation semantics now converge between engine and API
   admission paths on the same fail-closed outcome.
3. The API authorization boundary is now a single seam that can later swap to
   an external PDP without rewriting route or use-case code.
4. The combined engine/API branch passes package validation, contracts schema
   sync, golden validation, ARC inspection, and the repository pre-push gate.

# What remains open

1. The first access-decision backend remains embedded by design; a future
   external PDP adapter still needs its own conformance slice behind the same
   DVT contract.
2. These seams now span engine package ownership, runtime validation, and API
   authorization composition, so future changes still need ARC-tracked
   evidence and risk updates to prevent drift.
