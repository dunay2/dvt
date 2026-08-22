---
title: TypeScript Package Classification
status: Active
owner: Core Architecture
last_reviewed: 2026-03-18
---

# TypeScript Package Classification

This document defines the active TypeScript lane model for the repository.

It is the canonical package-classification artifact for module strategy.
It replaces filename-based reasoning such as "this package extends `tsconfig.base.json`,
therefore it is legacy" with package-contract classification.

## Rule Summary

The repository uses a two-lane ESM model.

### Lane A: Internal libraries

Use:

```json
{
  "compilerOptions": {
    "module": "ES2022",
    "moduleResolution": "Bundler"
  }
}
```

This lane is the default for internal packages that are imported by other
workspace packages and are not the final process entrypoint.

Canonical base: `tsconfig.package-bundler.base.json`

### Lane B: Node runtime entrypoints

Use:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

This lane is reserved for deployable apps, workers, CLIs, and other entrypoints
whose runtime contract is "run me directly in Node.js".

Canonical base: `tsconfig.node-runtime.base.json`

## Classification Rules

Classify each workspace by effective contract, not by directory name and not by
the filename of the `tsconfig` it happened to extend during migration.

1. If the workspace is primarily imported by other repo packages, classify it as
   a library package and use the Bundler lane.
2. If the workspace is started directly by Node.js as a process entrypoint,
   classify it as a Node runtime entrypoint and use the NodeNext lane.
3. If a library package is runtime-sensitive, keep it in the Bundler lane first
   and require explicit runtime validation.
4. Promote a library package to NodeNext only when runtime validation proves the
   library contract is not sufficient.

## Base Config Policy

- `tsconfig.package-bundler.base.json` is the canonical shared base for internal
  library packages.
- `tsconfig.node-runtime.base.json` is the canonical shared base for Node
  runtime entrypoints.
- Root `tsconfig.json` is the repo type-check and source-alias config. It is not
  an architectural package base.
- `tsconfig.base.json` is retired and MUST NOT be used by packages or apps.

## Import Policy

- Bundler-lane libraries should still prefer explicit `.js` extensions in
  relative imports when they emit runnable ESM.
- NodeNext-lane entrypoints MUST use Node-compatible import specifiers,
  including explicit `.js` on relative imports.

## Validation Policy

### Bundler-lane libraries

Required:

- package build
- package tests
- package export and type resolution validation

### NodeNext-lane entrypoints

Required:

- package build or typecheck
- startup or runtime smoke validation
- Node runtime resolution validation

### Runtime-sensitive libraries

Required:

- library validation from the Bundler lane
- targeted runtime smoke or integration validation

## Workspace Matrix

| Workspace                   | Role                       | Contract                     | Current lane | Target lane | Required validation                                  | Notes                                                                              |
| --------------------------- | -------------------------- | ---------------------------- | ------------ | ----------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `@dvt/contracts`            | contracts                  | internal library             | Bundler      | Bundler     | `build`, `test`, schema verification                 | Shared-kernel package; never classified by old base name alone.                    |
| `@dvt/planner`              | domain/core                | internal library             | Bundler      | Bundler     | `build`, `test`                                      | Canonical internal library package.                                                |
| `@dvt/engine`               | domain/core                | internal library             | Bundler      | Bundler     | `build`, `test`                                      | Depends on built package boundaries, not cross-package source imports.             |
| `@dvt/run-domain`           | domain/core                | internal library             | Bundler      | Bundler     | `build`, `test`                                      | Pure library lane package.                                                         |
| `@dvt/delivery`             | delivery/runtime support   | internal library             | Bundler      | Bundler     | `build`, `test`                                      | Delivery logic package, not a deployable app.                                      |
| `@dvt/state-store`          | shared-infra               | internal library             | Bundler      | Bundler     | `build`, `test`                                      | Library package despite runtime-facing name.                                       |
| `@dvt/plan-interpreter`     | domain/core                | internal library             | Bundler      | Bundler     | `build`, `test`                                      | Pure interpretation library.                                                       |
| `@dvt/plan-verifier`        | tooling/library            | internal library             | Bundler      | Bundler     | `build`, `test`                                      | Validation utility consumed as a package.                                          |
| `@dvt/dsl`                  | shared-infra               | internal library             | Bundler      | Bundler     | `build`, `test`                                      | Library-only contract.                                                             |
| `@dvt/crypto`               | shared-infra               | internal library             | Bundler      | Bundler     | `build`, `test`                                      | ESM-only library package.                                                          |
| `@dvt/observability`        | shared-infra               | internal library             | Bundler      | Bundler     | `build`, `test`                                      | Emits runnable ESM; relative imports must stay extension-safe.                     |
| `@dvt/observability-otel`   | adapter                    | internal library             | Bundler      | Bundler     | `build`, `test`                                      | Adapter library, not a process entrypoint.                                         |
| `@dvt/adapter-postgres`     | adapter                    | internal library             | Bundler      | Bundler     | `build`, `test`                                      | Runtime-sensitive adapter; keep Bundler lane with explicit package-boundary paths. |
| `@dvt/adapter-temporal`     | adapter                    | internal library             | Bundler      | Bundler     | `build`, `test`, integration validation when touched | Runtime-sensitive adapter; special Temporal validation remains mandatory.          |
| `@dvt/traceability-service` | shared-infra + CLI surface | internal library with binary | Bundler      | Bundler     | `build`, `test`, Node smoke when touched             | Remains library-first; binary surface requires runtime smoke evidence.             |
| `@dvt/cli`                  | tooling/library            | internal library             | Bundler      | Bundler     | `build`, `test`                                      | Library/tooling package, not the repo's primary process entrypoint lane.           |
| `@dvt/web`                  | app                        | browser entrypoint           | Bundler      | Bundler     | `typecheck`, `build`                                 | Browser/Vite app; Bundler lane with web-specific `lib` and `jsx` overrides.        |
| `dvt-api`                   | app                        | Node entrypoint              | NodeNext     | NodeNext    | `build`/`typecheck`, runtime smoke                   | Deployable Node process.                                                           |
| `dvt-lineage-worker`        | app                        | Node entrypoint              | NodeNext     | NodeNext    | `build`/`typecheck`, runtime smoke                   | Worker process started by Node.                                                    |
| `dvt-outbox-worker`         | app                        | Node entrypoint              | NodeNext     | NodeNext    | `build`/`typecheck`, runtime smoke                   | Worker process started by Node.                                                    |
| `dvt-projector-worker`      | app                        | Node entrypoint              | NodeNext     | NodeNext    | `build`/`typecheck`, runtime smoke                   | Worker process started by Node.                                                    |

## Decision Notes

- Adapters are not automatically NodeNext.
- Bundler is not limited to UI or frontend tooling.
- NodeNext is not the default for all runtime-adjacent packages.
- `traceability-service` remains a Bundler-lane package with explicit runtime
  smoke validation because its primary contract is still package consumption,
  even though it exposes a binary.

## Maintenance Rule

When a new package is added, this matrix MUST be updated in the same change that
introduces the package or changes its lane.
