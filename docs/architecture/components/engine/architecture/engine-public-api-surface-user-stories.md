---
title: Engine public API surface user stories
status: Active
owner: Architecture / Engine
last_reviewed: 2026-05-14
---

# Engine Public API Surface User Stories

## Stories

### US-EA-20260429-05-001 - Stable Consumers Import Contracts From Root

As an API or adapter developer, I want `@dvt/engine` to expose stable engine
contracts, errors, ports, and role interfaces only, so that root imports do not
become accidental dependencies on implementation classes.

Acceptance criteria:

- Root exports include engine contracts, errors, ports, and domain role
  interfaces.
- Root exports exclude runtime builders, workers, security implementation
  classes, in-memory stores, and fake provider adapters.
- The architecture test names each forbidden export family.

### US-EA-20260429-05-002 - Composition Roots Use Runtime Entry Point

As an API composition-root owner, I want runtime builders and policies behind
`@dvt/engine/runtime`, so that production assembly can stay explicit without
polluting the stable root package surface.

Acceptance criteria:

- `@dvt/engine/runtime` exports runtime builders, policies, services, provider
  registry helpers, and workers needed by composition roots.
- API and worker source imports runtime implementation symbols from
  `@dvt/engine/runtime`.
- Typecheck proves the entrypoint is usable by consumers.

### US-EA-20260429-05-003 - Test Doubles Stay Test-Only

As an integration-test author, I want in-memory stores and fake provider
adapters behind `@dvt/engine/testing`, so that tests can compose engine ports
without treating those doubles as production API.

Acceptance criteria:

- `@dvt/engine/testing` exports in-memory stores and provider test doubles.
- Root and runtime entrypoints do not export in-memory stores or fake provider
  adapters.
- Existing API integration tests continue to import testing doubles through the
  testing entrypoint.

### US-EA-20260429-05-004 - Future Barrel Drift Fails Fast

As an engine maintainer, I want a semantic architecture guard for the package
surface, so that future broad root exports fail during package tests.

Acceptance criteria:

- The guard validates entrypoint headers, package `exports`, documentation
  coverage, and forbidden root/runtime/testing cross-leaks.
- The guard proves semantics instead of only checking that a barrel is short.
- The component guide and user stories are required by the guard.

## Negative Scenarios

- Given `src/index.ts` exports `RunMaintenanceService`, the architecture guard
  fails because runtime service implementation leaked into the root.
- Given `src/index.ts` exports `IntentReconcilerWorker`, the guard fails because
  worker implementation leaked into the root.
- Given `src/index.ts` exports `InMemoryTxStore`, the guard fails because a test
  double leaked into the stable public API.
- Given `package.json` omits `./runtime`, the guard fails because production
  composition has no governed entrypoint.
- Given `src/runtime.ts` exports `InMemoryProviderAdapter`, the guard fails
  because test doubles leaked into runtime composition.

## Scenario Coverage Matrix

| Story                 | Scenario                   | Required proof                                                            |
| --------------------- | -------------------------- | ------------------------------------------------------------------------- |
| US-EA-20260429-05-001 | Stable root import         | `enginePublicApiSurface.architecture.test.ts`                             |
| US-EA-20260429-05-002 | Runtime composition import | `pnpm --filter @dvt/engine typecheck`                                     |
| US-EA-20260429-05-003 | Test double import         | `enginePublicApiSurface.architecture.test.ts` and API integration imports |
| US-EA-20260429-05-004 | Future drift prevention    | package-surface architecture guard                                        |

## Requirement Trace

- Task: `A/EA-20260429-05`.
- Audit finding: broad public package barrel in
  `docs/planning/reviews/architecture-and-governance/20260429-dvt-engine-package-audit-review.md`.
- Component guide:
  `docs/architecture/components/engine/architecture/engine-public-api-surface-component.md`.
- Plan:
  `docs/planning/proposals/mandatory/runtime-and-contracts/ea-20260429-05-engine-public-api-surface-plan-20260514.md`.
