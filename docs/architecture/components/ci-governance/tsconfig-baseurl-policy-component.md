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
- `docs/planning/proposals/mandatory/runtime-and-contracts/cfg-ts-t1-baseurl-deprecation-migration-plan-20260522.md`:
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
