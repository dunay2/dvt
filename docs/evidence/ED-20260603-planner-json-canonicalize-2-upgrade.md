---
title: Planner json-canonicalize 2.0.0 upgrade
status: Accepted
date: 2026-06-03
owners:
  - packages/@dvt/planner
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/planner/package.json
  - pnpm-lock.yaml
evidence:
  tests:
    - pnpm --filter @dvt/planner typecheck
    - pnpm --filter @dvt/planner test
    - pnpm verify:prepush
---

# Planner json-canonicalize 2.0.0 Upgrade

## Summary

PR #991 upgrades the canonical JSON dependency used by `@dvt/planner` from
`json-canonicalize@1.2.0` to `json-canonicalize@2.0.0`.

The repository change is limited to dependency metadata and the lockfile. It
does not change planner source code, exported planner contracts, adapter
surfaces, or database schemas.

## ARC-2 Rationale

The change touches `packages/@dvt/planner/package.json`, so the ARC policy
classifies the PR as ARC-2 and requires evidence plus a risk-register update.
The validation scope is package-local because the dependency is consumed by the
planner package and no runtime integration surface changes in this PR.

## Compatibility Notes

- No public DVT contract changed.
- No planner API changed.
- No migration is required.
- Planner type-check and unit tests remain the compatibility signal for this
  dependency-only update.
