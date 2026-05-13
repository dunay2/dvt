---
title: S18-F1-A State Store Role Boundary Plan
status: Active
owner: Execution Runtime
last_reviewed: 2026-05-13
planning_type: proposal
---

# S18-F1-A State Store Role Boundary Plan

## Think-First Analysis

### Problem summary

`S18` introduced an explicit state-store role bundle for the API composition
root, but the exported `StateStoreRoleBindings` interface is still structurally
constructible by any caller that can assemble `{ read, write, maintenance,
snapshotStaleness }`. That keeps the runtime wiring explicit while leaving a
TypeScript escape hatch for convenience reconstruction outside the sanctioned
boundary.

### Root cause

The bundle is modeled as a plain exported structural interface. TypeScript
therefore treats a hand-built object with the same public properties as an
equivalent value, so the compiler cannot distinguish a root-owned role binding
from an ad hoc aggregate reconstructed in a caller.

### Constraints and invariants

- `AGENTS.md`: work from canonical governance, no hidden debt, no stubs, no
  skipped checks, and close with concrete validation evidence.
- `docs/guides/ai-work-protocol.md`: non-trivial boundary work must be planned
  before implementation and closed with validation.
- `docs/architecture/command-query-rail-governance.md`: composition behavior
  must use the existing bounded-context rail instead of inventing local service
  semantics.
- `docs/architecture/fowler-opportunity-planning-governance.md`: boundary drift
  and primitive role-bundle semantics require an explicit planning matrix before
  code changes.
- `ADR-0039`: state-store ports remain split into focused read, write,
  maintenance, and snapshot-staleness roles.
- `S18`: API composition roots must expose explicit state-store role bindings
  and avoid reconstructing the aggregate by intersection.

### Options considered

- Leave the structural interface as-is.
  - Rejected because it does not close the S18-F1-A target; callers can still
    reconstruct the bundle outside the sanctioned helper.
- Move the helper into `buildProtectedRuntimeStorage` and stop exporting it.
  - Rejected for this slice because existing tests and the reconciler runtime
    already share the helper; removing the export belongs to the later export
    semantics slice (`S18-F1-C`).
- Add a module-private nominal brand to `StateStoreRoleBindings` and stamp it
  only inside `bindStateStoreRoles`.
  - Selected because it preserves existing runtime wiring while making ad hoc
    structural reconstruction fail at type-check time.

### Selected option and rationale

Add a private `unique symbol` brand to the exported `StateStoreRoleBindings`
type, stamp the frozen bundle inside `bindStateStoreRoles`, and add TDD coverage
that proves the returned bundle carries a non-enumerable root-owned marker. The
brand is not exported, so downstream code can consume the type but cannot
construct it structurally without going through the sanctioned boundary.

### Rejected alternatives

- Adding a public `kind` string field was rejected because callers could copy it
  and it would widen the runtime JSON-like shape.
- Adding another wrapper class was rejected because the current object shape is
  sufficient and changing property access would expand the slice.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - harden `apps/api/src/modules/stateStoreRoles.ts`
  - add direct TDD coverage in `apps/api/test/modules/stateStoreRoles.test.ts`
  - record closeout and planning DB state for `S18-F1-A`
- Expected outcome:
  - only `bindStateStoreRoles` can produce a `StateStoreRoleBindings` value
  - role consumers keep the same `read`, `write`, `maintenance`, and
    `snapshotStaleness` access pattern
  - the bundle remains frozen and no runtime service behavior changes
- Risks and mitigations:
  - Risk: hidden compatibility break for tests that hand-build
    `ProtectedRuntimeModule.stateStore`.
    - Mitigation: update any affected tests to use `bindStateStoreRoles`.
  - Risk: exported runtime fields change.
    - Mitigation: keep the brand as a non-enumerable symbol and validate the
      public role properties remain unchanged.
- Out-of-scope items:
  - removing the helper export entirely (`S18-F1-C`)
  - adding broad architecture grep guards against convenience rewiring
    (`S18-F1-B`)
  - changing adapter, engine, or contract package behavior
- Validation plan:
  - `pnpm docs:feature-mechanization -- --feature S18-F1-A-STATE-STORE-ROLE-BOUNDARY`
  - `pnpm --filter dvt-api test -- stateStoreRoles.test.ts`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm docs:sync`
  - `pnpm governance:refresh`
  - `pnpm docs:feature-mechanization:implementation`
  - `pnpm verify:prepush`
- Test coverage plan:
  - red test: bound role bundles expose a non-enumerable nominal boundary symbol
  - existing negative tests continue to reject null and partial sources
  - type-check validates structural consumers cannot satisfy
    `StateStoreRoleBindings` without the private brand
- Libraries evaluated:
  - None evaluated - no custom implementation or external dependency is needed.
- Command/query rail impact:
  - Reuses the API runtime composition query rail documented by the protected
    runtime component surfaces; no new external command or query is introduced.
- Fowler opportunity matrix:

| scenario                                           | opportunity                          | Fowler pattern           | DDD owner                                                              | command/query rail                        | implementation surfaces                                                                    | unit or package test                                    | architecture test                                | user-flow test                                      | out of scope                                  |
| -------------------------------------------------- | ------------------------------------ | ------------------------ | ---------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------- | --------------------------------------------- |
| API roots consume explicit state-store role bundle | Boundary drift / primitive obsession | Encapsulate Value Object | `StateStoreRoleBindings` value object owned by API runtime composition | `ProtectedRuntimeCompositionQuery` reused | `apps/api/src/modules/stateStoreRoles.ts`, `apps/api/test/modules/stateStoreRoles.test.ts` | `pnpm --filter dvt-api test -- stateStoreRoles.test.ts` | `pnpm docs:feature-mechanization:implementation` | Not applicable - internal composition boundary only | export removal and broad rewiring grep guards |

```feature-mechanization
version: 1
featureId: S18-F1-A-STATE-STORE-ROLE-BOUNDARY
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/s18-f1-a-state-store-role-boundary-plan-20260513.md
componentGuides:
  - docs/architecture/components/api/protected-runtime-and-plan-compile-component.md
userStories:
  - docs/planning/proposals/mandatory/runtime-and-contracts/s18-f1-a-state-store-role-boundary-plan-20260513.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/adr/ADR-0039-hexagonal-port-hardening-and-solid-remediation.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/runtime-and-contracts/s18-f1-a-state-store-role-boundary-plan-20260513.md
  - docs/planning/closeouts/20260513-s18-f1-a-state-store-role-boundary-closeout.md
  - docs/planning/state/**
  - docs/planning/status/**
  - docs/.manifest.json
  - apps/api/src/modules/stateStoreRoles.ts
  - apps/api/test/modules/stateStoreRoles.test.ts
  - apps/api/test/modules/registerOperationalHooks.cases.ts
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - apps/api/src/application/**
  - apps/api/src/entrypoints/http/**
  - apps/api/src/infrastructure/**
  - apps/api/src/runtime/**
  - apps/api/src/modules/buildProtectedRuntimeModule.ts
commandQueryRails:
  - name: ProtectedRuntimeCompositionQuery
    type: query
    dddOwner: StateStoreRoleBindings
domainObjects:
  - name: StateStoreRoleBindings
    type: value object
    owner: API runtime composition
fowlerSignals:
  - Boundary drift
  - Primitive obsession
architectureGuards:
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - Not applicable - internal API composition boundary only
completionGate:
  - pnpm docs:feature-mechanization -- --feature S18-F1-A-STATE-STORE-ROLE-BOUNDARY
  - pnpm --filter dvt-api test -- stateStoreRoles.test.ts
  - pnpm --filter dvt-api typecheck
  - pnpm docs:sync
  - pnpm governance:refresh
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: nominal-state-store-role-boundary
    redTest: pnpm --filter dvt-api test -- stateStoreRoles.test.ts
    expectedFailure: Bound role bundle has no nominal root-owned boundary marker.
    patchSurfaces:
      - apps/api/test/modules/stateStoreRoles.test.ts
      - apps/api/src/modules/stateStoreRoles.ts
    greenTest: pnpm --filter dvt-api test -- stateStoreRoles.test.ts
symbols:
  - name: STATE_STORE_ROLE_BINDINGS_BRAND
    path: apps/api/src/modules/stateStoreRoles.ts
    dddOwner: StateStoreRoleBindings
    cqRails:
      - ProtectedRuntimeCompositionQuery
    fowlerSignals:
      - Boundary drift
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Not applicable - internal API composition boundary only
    unitTests:
      - pnpm --filter dvt-api test -- stateStoreRoles.test.ts
  - name: bindStateStoreRoles
    path: apps/api/src/modules/stateStoreRoles.ts
    dddOwner: StateStoreRoleBindings
    cqRails:
      - ProtectedRuntimeCompositionQuery
    fowlerSignals:
      - Primitive obsession
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: Not applicable - internal API composition boundary only
    unitTests:
      - pnpm --filter dvt-api test -- stateStoreRoles.test.ts
```
