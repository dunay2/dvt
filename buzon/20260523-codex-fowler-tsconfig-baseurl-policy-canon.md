---
title: Fowler analysis for tsconfig baseUrl policy canon
status: Draft
date: 2026-05-23
owners:
  - ci-governance
  - typescript-config
---

# Fowler Analysis: Tsconfig BaseUrl Policy Canon

## Scope

This review covers `C-MAND-CFG-TS-BASEURL-CANON` and the accepted
`CFG-TS-T1` baseUrl deprecation migration plan. The active repository posture is
that tracked runtime, package, app, and test `tsconfig*.json` files no longer
define `compilerOptions.baseUrl`.

## Mature-System Comparison

Mature monorepos separate retired compiler options from still-owned alias
policy. They fail closed on deprecated compiler settings while keeping package,
runtime, and frontend alias decisions under their owning bounded context.

## Improved Patterns

- `baseUrl` retirement becomes executable through a CI policy test.
- `paths` aliases are classified as package-boundary, Node runtime, web-local,
  or root type-check concerns.
- The TypeScript package classification doc remains the canonical lane model.

## Anti-Patterns Detected

- The accepted plan documented the correct posture, but the absence of
  `compilerOptions.baseUrl` was not guarded as a semantic invariant.
- Global alias removal would be an inappropriate mechanical cleanup because
  several `paths` entries still protect package-boundary declaration or runtime
  resolution behavior.

## Repetitions Fixed

- The same distinction between `baseUrl` and `paths` no longer needs to be
  rediscovered from the mandatory plan, closeout, and package classification doc.
- A single component guide now names public API, invariants, transitions, and
  consumers.

## Drift Fixed

- The accepted CFG-TS-T1 plan is now represented in CI policy docs and an
  executable architecture guard.
- Planning can close the baseUrl migration without creating fake tasks for
  already-retired `baseUrl`.

## Opportunities Left

- Create separate package-boundary, runtime-entrypoint, or web-alias migration
  tasks only when the owner has validation proof for alias removal.
- If TypeScript project references become the repo default, update the
  TypeScript package classification doc first and then migrate aliases by owner.

## ADR Assessment

No new ADR is needed. This is a governance hardening slice for an accepted
configuration posture, not a new architecture decision.
