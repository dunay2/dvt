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

These utilities are imported directly where deterministic canonicalization,
stable hashing, secure entropy or UUID allocation is required. Domain packages
do not re-export the primitives.

## Primary Code Anchors

- Public package entrypoint:
  [packages/@dvt/crypto/src/index.ts](../../../packages/@dvt/crypto/src/index.ts)
- JCS canonicalization:
  [packages/@dvt/crypto/src/jcs.ts](../../../packages/@dvt/crypto/src/jcs.ts)
- SHA-256 helper:
  [packages/@dvt/crypto/src/sha256.ts](../../../packages/@dvt/crypto/src/sha256.ts)
- Direct Cut 1 consumers:
  [packages/@dvt/contracts/src/schema-packs/plan-records.ts](../../../packages/@dvt/contracts/src/schema-packs/plan-records.ts),
  [packages/@dvt/planner/src/domain/hashing.ts](../../../packages/@dvt/planner/src/domain/hashing.ts),
  [packages/@dvt/plan-verifier/src/verify.ts](../../../packages/@dvt/plan-verifier/src/verify.ts),
  and
  [packages/@dvt/engine/src/security/planIntegrity.ts](../../../packages/@dvt/engine/src/security/planIntegrity.ts)
- Package tests:
  [packages/@dvt/crypto/test/primitives.test.ts](../../../packages/@dvt/crypto/test/primitives.test.ts)

## Verification

- `pnpm --filter @dvt/crypto test`

## Boundary Rule

Domain packages own their preimages, validation rules and identity prefixes.
Contracts may depend on this runtime-neutral primitive package but not on
runtime or adapter packages. This package is not a generic identity service or
a second domain authority.

## Related Docs

- [ADR-0012](../../adr/ADR-0012-plan-integrity-ownership.md)
- [Canonical Doc Code Matrix](../../planning/status/canonical-doc-code-matrix.md)
- [Repository Map](../../concepts/repository-map.md)
