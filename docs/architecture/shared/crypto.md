---
title: Crypto Package
status: Active
owner: Architecture / Platform
last_reviewed: 2026-08-22
---

# Crypto Package

This page is the canonical package reference for `@dvt/crypto`.

## Current Reality

The package name and workspace path now agree: `@dvt/crypto` lives in
`packages/@dvt/crypto`.

The package owns these repository-wide primitives:

- `utf8Bytes()`
- `jcsCanonicalize()`
- `sha256Hex()` and `sha256HexUtf8()`
- `createSha256Hasher()`
- compatibility-only `md5Hex()` and `md5HexUtf8()`
- `secureRandomBytes()`
- `randomUuidV4()` and `randomUuidV7()`

These utilities are used where deterministic canonicalization or stable hashing
matters across engine and adapter boundaries.

## Primary Code Anchors

- Public package entrypoint:
  [packages/@dvt/crypto/src/index.ts](../../../packages/@dvt/crypto/src/index.ts)
- JCS canonicalization:
  [packages/@dvt/crypto/src/jcs.ts](../../../packages/@dvt/crypto/src/jcs.ts)
- SHA-256 helper:
  [packages/@dvt/crypto/src/sha256.ts](../../../packages/@dvt/crypto/src/sha256.ts)
- Engine re-exports:
  [packages/@dvt/engine/src/utils/jcs.ts](../../../packages/@dvt/engine/src/utils/jcs.ts)
  and
  [packages/@dvt/engine/src/utils/sha256.ts](../../../packages/@dvt/engine/src/utils/sha256.ts)
- Engine consumers:
  [packages/@dvt/engine/src/core/SnapshotProjector.ts](../../../packages/@dvt/engine/src/core/SnapshotProjector.ts)
- Package tests:
  [packages/@dvt/crypto/test/primitives.test.ts](../../../packages/@dvt/crypto/test/primitives.test.ts)

## Verification

- `pnpm --filter @dvt/crypto test`

## Boundary Rule

Domain packages own their preimages and identity prefixes. This package owns
only the portable primitives; it is not a generic identity service or a second
domain authority.

## Related Docs

- [ADR-0012](../../adr/ADR-0012-plan-integrity-ownership.md)
- [Canonical Doc Code Matrix](../../planning/status/canonical-doc-code-matrix.md)
- [Repository Map](../../concepts/repository-map.md)
