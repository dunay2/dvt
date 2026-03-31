---
title: Package Module Build Policy v2
status: Proposed
owner: Core Architecture
last_reviewed: 2026-03-17
planning_type: proposal
---

# Package Module Build Policy v2

This proposal defines the canonical operational policy for package layout,
module format, build behavior, dependency boundaries, and validation rules in
this repository.

It is an implementation policy. It is not a conceptual architecture note.

## Proposal Set Context

This document is part of the repository governance proposal set.

- Set entry point: [Repository Governance Proposal Set 2026-03-17](repository-governance-proposal-set-20260317.md)
- Role in set: repository technical policy
- Complementary proposals:
  - [CI Improvement Plan](../../proposals/ci-improvement-plan-20260327.md) defines enforcement and orchestration strategy
  - [Documentation Usability Change Plan](../../proposals/documentation-usability-change-plan-20260308.md) defines documentation governance and discoverability
  - [Phase 2 Architectural Debt Roadmap](phase2-arch-debt-roadmap-20260315.md) defines execution order for follow-up technical slices

## Purpose

- define one target package/module model for the monorepo
- separate target state from current exceptions
- reduce accidental drift in `package.json`, `tsconfig.json`, and workspace
  build behavior
- create a migration policy for converging existing packages without hiding
  semantic runtime changes inside "cleanup" slices

## Scope

This policy governs:

- workspace structure
- package classification
- module format
- TypeScript build baselines
- package metadata such as `exports`, `types`, and `main`
- dependency direction
- CI enforcement expectations
- allowed exceptions

This proposal does not itself introduce new contracts or runtime behavior.

## Repository Model

### Workspace model

- repository type: monorepo
- package manager: `pnpm` workspace mode
- canonical workspace roots:
  - `apps/*`
  - `packages/*`

### Canonical structure

```text
/apps
  /api
  /outbox-worker
  /lineage-worker
  /projector-worker
  /web

/packages
  /@dvt/contracts
  /@dvt/planner
  /@dvt/run-domain
  /@dvt/engine
  /@dvt/delivery
  /@dvt/adapter-*
  /@dvt/observability*
  /@dvt/*
```

### Workspace config

`pnpm-workspace.yaml` remains the authoritative workspace inventory.

## Baseline Toolchain

The canonical toolchain must match the repository baseline actually enforced in
CI and lockfile.

### Runtime

- Node: `20.x`
- pnpm: `10.x`

### Language and test stack

- TypeScript: repository-pinned version from root `package.json`
- ESLint: `9.x`
- Prettier: `3.x`
- Vitest: repository-pinned version from root `package.json`

### Rule

Tool versions belong to the repository baseline, not to per-package
preference.

Packages must not silently drift from the root toolchain unless an ADR or
explicit exception policy allows it.

## Package Classification

| Class              | Role                                                          |
| ------------------ | ------------------------------------------------------------- |
| `contracts`        | shared DTOs, schemas, ports, versioned contract surfaces      |
| `domain/core`      | domain and application logic without infrastructure ownership |
| `adapter`          | provider or infrastructure integration behind ports           |
| `delivery/runtime` | worker/runtime delivery orchestration                         |
| `shared-infra`     | reusable technical capabilities without domain authority      |
| `app`              | composition root or deployable boundary                       |
| `tooling`          | repo tooling, CI, codegen, and validation utilities           |

## Canonical Module Policy

### Target model

The default package model is:

- `type: "module"`
- `module: "ES2022"`
- `moduleResolution: "Bundler"`
- explicit `exports`
- explicit `types`
- build output in `dist/`

### Rule

New library packages must follow the target model unless an exception is
recorded.

Existing packages that do not follow the target model are migration
candidates, not permanent precedent.

### Exceptions

A package may diverge from the target model only if:

- runtime requirements make it necessary, and
- the exception is documented in a proposal, ADR, or explicit closeout

Undeclared exceptions are not allowed.

## TypeScript Config Policy

### Shared bases

The repository should converge on a small number of shared tsconfig bases:

- app NodeNext base
- package Bundler base
- optional test or eslint-specific bases where required

### Rule

Repeated compiler policy must live in shared base configs.

Per-package `tsconfig.json` files should keep only:

- `outDir`
- `rootDir`
- package-specific `paths`
- package-specific `include` and `exclude`
- package-specific compiler exceptions that are explicitly justified

### Alias policy

`tsconfig.base.json` remains the repo-level source alias map for development.

Package-local aliases to built `dist/*.d.ts` may exist when needed to preserve
package-boundary consumption semantics, but they should be minimized and
centralized through shared bases where families are homogeneous.

## Package Metadata Policy

Library packages must declare:

- `type`
- `main` when needed
- `types`
- `exports`
- `files` when publishing build output boundaries

Deployable apps should declare only what their runtime boundary needs.

A package must not rely on implicit Node resolution behavior if equivalent
explicit metadata is feasible.

## Dependency Boundary Rules

Allowed direction:

```text
contracts -> none
domain/core -> contracts
adapter -> contracts + core/domain ports
delivery/runtime -> contracts + core/domain + adapter-facing ports
shared-infra -> contracts
app -> all composition-safe layers
tooling -> repository-wide, but never as runtime authority
```

Forbidden by default:

- `contracts -> anything`
- `core/domain -> adapter`
- `adapter -> adapter`
- `ui/app -> internal package src imports across boundaries`
- cross-package imports from `src/**` unless explicitly allowed by policy

## Build Policy

### Determinism

Builds must be:

- lockfile-based
- reproducible in CI
- free of implicit generated artifacts
- free of untracked required outputs

### Canonical commands

Build and test behavior must remain runnable through repository and package
commands already documented in the testing guide.

### Package build rule

Packages consume package boundaries, not ad hoc local filesystem shortcuts.

The repository should converge toward:

- explicit package metadata
- explicit build outputs
- explicit inter-package contracts

## CI Enforcement Policy

Mandatory CI enforcement should check:

- install reproducibility
- type-check
- package build
- affected tests
- changed-file formatting and linting
- docs sync and docs quality
- canonical doc checks

Additional enforcement such as API surface diff or dependency graph gating is
desirable, but not mandatory until implemented and stabilized.

## Migration Policy

This policy is adopted in slices.

### Order

1. define canonical model
2. classify current packages
3. migrate homogeneous families
4. migrate exceptional packages
5. enforce convergence in CI

### Rule

Mechanical deduplication must not hide semantic changes such as:

- CommonJS to ESM migration
- export map changes
- runtime loader changes

Those require explicit migration slices.

## Evidence And Closeout

Every migration slice under this policy must include:

- affected packages
- exact files changed
- exact validation commands run
- whether any package remained outside the canonical model
- whether any exception remains open

## Initial Migration Classes

The current repo state suggests three practical migration groups:

1. homogeneous ESM/Bundler library packages
2. special-case library packages with runtime or metadata asymmetry
3. apps and workers using NodeNext runtime settings

The policy should be applied in that order, not package-by-package without a
stated target model.

## Summary

This proposal establishes:

- one canonical package/module target model
- limited and explicit tsconfig families
- explicit package metadata
- controlled dependency direction
- migration by homogeneous slices, not ad hoc drift

Without explicit enforcement, divergence returns.
Without explicit policy, refactors become guesswork.
