---
title: Single repository crypto primitive authority
status: Accepted
date: 2026-08-22
owners:
  - packages/@dvt/crypto
  - packages/@dvt/engine
  - packages/@dvt/state-store
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/crypto/src/index.ts
  - packages/@dvt/crypto/src/sha256.ts
  - packages/@dvt/crypto/src/jcs.ts
  - packages/@dvt/engine/src/security/planIntegrity.ts
  - packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts
evidence:
  tests:
    - pnpm --filter @dvt/crypto test
    - pnpm exec vitest run packages/@dvt/engine/test/idempotency.vectors.test.ts packages/@dvt/engine/test/contracts/engine.test.ts packages/@dvt/engine/test/contracts/executionPlan.contract.test.ts packages/@dvt/engine/test/core/WorkflowEngine.test.ts packages/@dvt/state-store/test/archiveArtifacts.test.ts packages/@dvt/state-store/test/ObjectStorageRunArchiveExporter.test.ts
    - pnpm type-check
    - pnpm verify:prepush
---

## Decision

`@dvt/crypto` is the single package authority for repository-wide encoding,
SHA-256, compatibility-only MD5, JCS canonicalization, secure random bytes, and
UUID generation. Its physical workspace path now matches its package name.

The public API distinguishes byte hashing from UTF-8 text hashing. Existing
Engine and State Store preimages retain their prior domain semantics while
selecting the explicit primitive. The obsolete `packages/@dvt/canonical` path
is removed; no alias package, compatibility overload, state store, service, or
parallel serializer is introduced.

## Evidence

Primitive vectors cover empty, ASCII, Unicode, binary, streaming, invalid JCS,
randomness failure, and deterministic UUID cases. Runtime parity proves that
Node 22 import and synchronous require resolve the same ESM artifact. Existing
Engine integrity/idempotency and State Store archive vectors prove that the
package move does not alter persisted hashes.
