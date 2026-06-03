---
title: Tsconfig baseUrl policy user stories
status: Active
owner: Engineering / CI Governance
last_reviewed: 2026-05-23
---

# Tsconfig BaseUrl Policy User Stories

## User Stories

### US-CFG-TS-001: Reject Active BaseUrl Drift

As a CI maintainer, I want tracked active `tsconfig*.json` files to reject
`compilerOptions.baseUrl` so deprecated module-resolution behavior cannot
return silently.

Acceptance:

- The guard scans `git ls-files *tsconfig*.json`.
- The guard fails when any parsed config owns `compilerOptions.baseUrl`.
- The guard ignores non-tsconfig HTTP, Cypress, or database `baseUrl` strings.

### US-CFG-TS-002: Preserve Paths Classification

As a package maintainer, I want explicit `paths` aliases classified by owner so
package-boundary migration is not mislabeled as baseUrl cleanup.

Acceptance:

- Package-local aliases remain package-boundary work.
- Runtime aliases remain runtime-entrypoint work.
- Web-local aliases remain frontend import-policy work.

### US-CFG-TS-003: Keep The TypeScript Lane Model Canonical

As an architecture reviewer, I want the TypeScript package classification doc
to remain the canonical lane model for Bundler and NodeNext decisions.

Acceptance:

- The component references the TypeScript package classification doc.
- The component states that root `tsconfig.json` is not a package base.

### US-CFG-TS-004: Route Future Alias Removal Through Dedicated Slices

As a runtime or frontend owner, I want future alias removal to require
owner-specific validation instead of a global mechanical rewrite.

Acceptance:

- Runtime alias removal requires runtime typecheck/build plus smoke evidence.
- Web alias removal requires web typecheck and relevant frontend tests.
- Package alias removal requires package build, tests, and reverse-dependent
  validation when runtime-sensitive.

### US-CFG-TS-005: Close CFG-TS-T1 With Executable Evidence

As a planning owner, I want CFG-TS-T1 closed only after the accepted plan is
represented by an executable guard and local component docs.

Acceptance:

- The guard proves no active tracked `compilerOptions.baseUrl` exists.
- The component guide documents public API, invariants, transitions, and
  consumers.
- Planning DB evidence points to the guard, component guide, user stories, and
  validation commands.
