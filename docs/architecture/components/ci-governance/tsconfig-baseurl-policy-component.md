---
title: Tsconfig baseUrl policy component
status: Active
owner: Engineering / CI Governance
last_reviewed: 2026-05-23
---

# Tsconfig BaseUrl Policy Component

## Owned Concern

This component owns the repository guard that keeps TypeScript
`compilerOptions.baseUrl` retired from active tracked `tsconfig*.json` files.
It also keeps remaining `paths` aliases classified by their real owner instead
of treating every alias as baseUrl cleanup.

## Public API

- `git ls-files *tsconfig*.json`: canonical tracked inventory for active
  TypeScript configuration files.
- `tools/ci/tsconfig-baseurl-policy.test.mjs`: executable semantic guard for
  the baseUrl retirement posture and local documentation contract.
- `docs/architecture/typescript-package-classification.md`: canonical lane
  model for Bundler, NodeNext, runtime-sensitive package, and web aliases.
- [Historical cfg-ts-t1-baseurl-deprecation-migration-plan-20260522.md](https://github.com/dunay2/dvt/blob/f921266eaa528f9533cb5545f7678a408920935e/docs/planning/proposals/mandatory/runtime-and-contracts/cfg-ts-t1-baseurl-deprecation-migration-plan-20260522.md):
  accepted staged plan for CFG-TS-T1.
- `pnpm test:ci-tools`: local test surface that runs the CI policy guard.

## Invariants

- Active tracked `tsconfig*.json` files must not define
  `compilerOptions.baseUrl`.
- `paths` is not synonymous with retired baseUrl behavior.
- Root `tsconfig.json` may own source-alias `paths` for repo type-checking, but
  it is not an architectural package base.
- `tsconfig.node-runtime.base.json` may own explicit runtime package aliases
  until NodeNext startup/smoke validation proves export-map-only resolution.
- Package-local `paths` aliases remain package-boundary migration work, not
  global baseUrl cleanup.
- `apps/web/tsconfig.json` may own the web-local `@/*` alias until a dedicated
  frontend import rewrite creates value.
- Any future reintroduction of `compilerOptions.baseUrl` is configuration drift
  and must fail before merge.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> Inventory
  Inventory --> NoBaseUrl: every tracked tsconfig lacks compilerOptions.baseUrl
  Inventory --> Drift: any active tsconfig defines compilerOptions.baseUrl
  NoBaseUrl --> ClassifyPaths: explicit paths remain
  ClassifyPaths --> PackageBoundary: package-local declaration alias
  ClassifyPaths --> RuntimeEntryPoint: Node runtime alias
  ClassifyPaths --> WebAlias: web-local @/* alias
  Drift --> FailingGuard
  PackageBoundary --> DedicatedMigration
  RuntimeEntryPoint --> DedicatedMigration
  WebAlias --> DedicatedMigration
  DedicatedMigration --> Validation
  Validation --> [*]
  FailingGuard --> [*]
```

## Consumers

- CI maintainers use the guard when TypeScript config files change.
- Package maintainers use the classification when removing package-local
  aliases.
- Runtime maintainers use the classification before removing NodeNext runtime
  aliases.
- Frontend maintainers use the classification before rewriting web-local
  imports.
- Agents use this component to close CFG-TS-T1 without creating fake follow-up
  work for already-retired `baseUrl`.

## Flow

```mermaid
flowchart LR
  Worktree[Tracked tsconfig inventory]
  Guard[tsconfig-baseurl-policy test]
  BaseUrl[compilerOptions.baseUrl]
  Paths[explicit paths]
  Owners[owning migration lanes]
  Prepush[verify:prepush]

  Worktree --> Guard
  Guard --> BaseUrl
  Guard --> Paths
  BaseUrl -->|present| Prepush
  BaseUrl -->|absent| Paths
  Paths --> Owners
  Owners --> Prepush
```

## Validation

- `node --test tools/ci/tsconfig-baseurl-policy.test.mjs`
- `pnpm test:ci-tools`
- `pnpm verify:prepush`

<a id="section-tsconfig-baseurl-policy-user-stories"></a>

## Tsconfig BaseUrl Policy User Stories

### User Stories

#### US-CFG-TS-001: Reject Active BaseUrl Drift

As a CI maintainer, I want tracked active `tsconfig*.json` files to reject
`compilerOptions.baseUrl` so deprecated module-resolution behavior cannot
return silently.

Acceptance:

- The guard scans `git ls-files *tsconfig*.json`.
- The guard fails when any parsed config owns `compilerOptions.baseUrl`.
- The guard ignores non-tsconfig HTTP, Cypress, or database `baseUrl` strings.

#### US-CFG-TS-002: Preserve Paths Classification

As a package maintainer, I want explicit `paths` aliases classified by owner so
package-boundary migration is not mislabeled as baseUrl cleanup.

Acceptance:

- Package-local aliases remain package-boundary work.
- Runtime aliases remain runtime-entrypoint work.
- Web-local aliases remain frontend import-policy work.

#### US-CFG-TS-003: Keep The TypeScript Lane Model Canonical

As an architecture reviewer, I want the TypeScript package classification doc
to remain the canonical lane model for Bundler and NodeNext decisions.

Acceptance:

- The component references the TypeScript package classification doc.
- The component states that root `tsconfig.json` is not a package base.

#### US-CFG-TS-004: Route Future Alias Removal Through Dedicated Slices

As a runtime or frontend owner, I want future alias removal to require
owner-specific validation instead of a global mechanical rewrite.

Acceptance:

- Runtime alias removal requires runtime typecheck/build plus smoke evidence.
- Web alias removal requires web typecheck and relevant frontend tests.
- Package alias removal requires package build, tests, and reverse-dependent
  validation when runtime-sensitive.

#### US-CFG-TS-005: Close CFG-TS-T1 With Executable Evidence

As a planning owner, I want CFG-TS-T1 closed only after the accepted plan is
represented by an executable guard and local component docs.

Acceptance:

- The guard proves no active tracked `compilerOptions.baseUrl` exists.
- The component guide documents public API, invariants, transitions, and
  consumers.
- Planning DB evidence points to the guard, component guide, user stories, and
  validation commands.

> Acceptance scope status: Active. Owner: Engineering / CI Governance.
