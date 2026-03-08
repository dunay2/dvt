---
title: Crypto Package
status: Active
owner: Architecture / Platform
last_reviewed: 2026-03-08
---

# Crypto Package

This page is the canonical package reference for `@dvt/crypto`.

## Current Reality

The package name is `@dvt/crypto`, but the workspace path is
`packages/@dvt/canonical`.

That mismatch is easy to miss, so it has to be documented explicitly.

Today the package exposes two repository-wide helpers:

- `jcsCanonicalize()`
- `sha256Hex()`

These utilities are used where deterministic canonicalization or stable hashing
matters across engine and adapter boundaries.

## Primary Code Anchors

- Public package entrypoint:
  [packages/@dvt/canonical/src/index.ts](../../../packages/@dvt/canonical/src/index.ts)
- JCS canonicalization:
  [packages/@dvt/canonical/src/jcs.ts](../../../packages/@dvt/canonical/src/jcs.ts)
- SHA-256 helper:
  [packages/@dvt/canonical/src/sha256.ts](../../../packages/@dvt/canonical/src/sha256.ts)
- Engine re-exports:
  [packages/@dvt/engine/src/utils/jcs.ts](../../../packages/@dvt/engine/src/utils/jcs.ts)
  and
  [packages/@dvt/engine/src/utils/sha256.ts](../../../packages/@dvt/engine/src/utils/sha256.ts)
- Engine consumers:
  [packages/@dvt/engine/src/core/SnapshotProjector.ts](../../../packages/@dvt/engine/src/core/SnapshotProjector.ts)
- Package tests:
  [packages/@dvt/canonical/test/canonical.test.ts](../../../packages/@dvt/canonical/test/canonical.test.ts)

## Verification

- `pnpm --filter @dvt/crypto test`

## Open Gaps

- The path/package-name mismatch still hurts discoverability unless linked from
  central docs.
- This package is foundational enough that it should never be left undocumented
  again.

## Related Docs

- [ADR-0012](../../adr/ADR-0012-plan-integrity-ownership.md)
- [Canonical Doc Code Matrix](../../planning/status/canonical-doc-code-matrix.md)
- [Repository Map](../../concepts/repository-map.md)
