---
title: CFG-TS-T1 BaseUrl Deprecation Migration Plan
status: Accepted
owner: Runtime / CI / Architecture
last_reviewed: 2026-05-22
planning_type: mandatory-proposal
task_id: CFG-TS-T1
---

# CFG-TS-T1 BaseUrl Deprecation Migration Plan

## Purpose

`CFG-TS-T1` defines the staged posture for TypeScript `baseUrl` retirement.
The current active tree no longer uses `compilerOptions.baseUrl` in tracked
runtime, package, app, or test `tsconfig*.json` files. Remaining module
resolution risk is not a `baseUrl` setting; it is the explicit `paths` policy
used for package-boundary declaration files and web-local aliases.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/typescript-package-classification.md`
- `docs/planning/closeouts/20260318-typescript-package-classification-closeout.md`
- `docs/planning/closeouts/20260318-ts-esm-monorepo-m02-closeout.md`

## Inventory

The 2026-05-22 inventory used:

```text
git ls-files *tsconfig*.json
```

The active configs have no `compilerOptions.baseUrl` values. A historical
proposal fixture under `docs/planning/proposals/vscode style/**` is not an
active build or editor configuration and is intentionally excluded from the
runtime migration plan.

## Workspace Impact Matrix

| Surface                              | Current posture                                                | Migration action                                                                                                                      | Validation baseline                                               |
| ------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Root `tsconfig.json`                 | Source-alias `paths` only; no `baseUrl`                        | Keep as repo type-check/source-alias surface until project-reference migration exists.                                                | `pnpm type-check`, `pnpm verify:prepush`                          |
| `tsconfig.package-bundler.base.json` | Bundler base; no `baseUrl` or shared `paths`                   | Keep as canonical package base.                                                                                                       | Package `typecheck`/`test` for touched packages                   |
| `tsconfig.node-runtime.base.json`    | NodeNext base with explicit package `paths`; no `baseUrl`      | Keep paths explicit for runtime entrypoints; remove only after Node runtime smoke proves package export-map resolution is sufficient. | Runtime app/worker `typecheck` or `build` plus smoke when touched |
| Package-local `paths` overrides      | Boundary-preserving `dist/*.d.ts` aliases in selected packages | Treat as separate package-boundary/project-reference migration, not `baseUrl` cleanup.                                                | Owning package build/test/typecheck                               |
| `apps/web/tsconfig.json`             | Web-local `@/*` path alias; no `baseUrl`                       | Keep alias until Vite/editor/import rewrite plan exists.                                                                              | `pnpm --filter @dvt/web typecheck`, web tests when touched        |
| Test tsconfigs                       | Extend owning package/app configs; no `baseUrl`                | No action required.                                                                                                                   | Owning test command                                               |

## Staged Plan

### Stage 0 - Guard Current State

- Keep `baseUrl` absent from active `tsconfig*.json`.
- Treat any reintroduction as configuration drift requiring a proposal update.
- Suggested guard:
  `node -e "scan tracked tsconfig*.json and fail if compilerOptions.baseUrl exists outside archived/reference docs"`.

### Stage 1 - Separate Paths From BaseUrl

- Do not remove `paths` mechanically.
- Classify each path map as one of:
  - package-boundary declaration alias;
  - Node runtime package alias;
  - web-local source alias;
  - root type-check source alias.
- Keep package-boundary aliases until project references or export-map-only
  resolution is proven with package validation.

### Stage 2 - Package Boundary Migration

- For each package with local package-boundary `paths`, remove aliases in a
  package-specific slice only after the package can resolve dependencies
  through built declarations or project references.
- Required validation per package:
  - package `typecheck`;
  - package tests;
  - reverse-dependent package build/typecheck when the package is consumed by
    runtime-sensitive adapters.

### Stage 3 - Runtime Entrypoint Migration

- Remove runtime-entrypoint `paths` only after NodeNext resolution and local
  startup/smoke validation pass for the entrypoint.
- Required validation:
  - app/worker `typecheck` or `build`;
  - startup smoke or operational readiness check when available;
  - `pnpm verify:prepush`.

### Stage 4 - Web Alias Migration

- Treat `@/*` in `apps/web` as a frontend import ergonomics decision, not a
  TypeScript `baseUrl` migration blocker.
- Remove only through a dedicated frontend import rewrite if there is product or
  tooling value.

## Rollback Points

- If package typecheck starts resolving sibling package source instead of
  declarations, restore the package-local `paths` and reopen a
  project-reference migration task.
- If a Node runtime entrypoint fails startup after alias removal, restore the
  runtime `paths` and record the failing import specifier in the owning
  closeout.
- If editor-only warnings recur, capture the exact `tsserver` diagnostic and
  map it to the owning config instead of editing shared bases.

## Acceptance Criteria

- Active tracked `tsconfig*.json` files have no `compilerOptions.baseUrl`.
- The TypeScript package classification document remains the canonical lane
  model.
- `paths` cleanup is explicitly routed as package-boundary/runtime/web work,
  not mislabeled as `baseUrl` cleanup.
- `CFG-TS-T1` lane state points at this plan and records the 2026-05-22
  inventory evidence.
