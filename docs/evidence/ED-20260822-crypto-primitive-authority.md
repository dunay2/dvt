---
title: Single repository crypto primitive authority
status: Accepted
date: 2026-08-22
owners:
  - packages/@dvt/crypto
  - packages/@dvt/engine
  - packages/@dvt/state-store
  - packages/@dvt/contracts
  - packages/@dvt/planner
  - packages/@dvt/plan-verifier
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/crypto/src/index.ts
  - packages/@dvt/crypto/src/sha256.ts
  - packages/@dvt/crypto/src/encoding.ts
  - packages/@dvt/crypto/src/jcs.ts
  - packages/@dvt/engine/src/security/planIntegrity.ts
  - packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts
  - packages/@dvt/contracts/src/schema-packs/plan-records.ts
  - packages/@dvt/planner/src/domain/hashing.ts
  - packages/@dvt/plan-verifier/src/verify.ts
  - packages/@dvt/cli/run-golden-paths.cjs
  - scripts/planning-db-operate.cjs
  - scripts/documentation-publication.cjs
  - tools/ci/architecture-dependency-guard.test.mjs
evidence:
  tests:
    - pnpm --filter @dvt/crypto test
    - pnpm exec vitest run packages/@dvt/engine/test/idempotency.vectors.test.ts packages/@dvt/engine/test/contracts/engine.test.ts packages/@dvt/engine/test/contracts/executionPlan.contract.test.ts packages/@dvt/engine/test/core/WorkflowEngine.test.ts packages/@dvt/state-store/test/archiveArtifacts.test.ts packages/@dvt/state-store/test/ObjectStorageRunArchiveExporter.test.ts
    - pnpm type-check
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/planner test
    - pnpm --filter @dvt/plan-verifier test
    - pnpm --filter @dvt/adapter-postgres test
    - pnpm --filter dvt-api test:unit
    - pnpm --filter @dvt/web test:ci
    - pnpm --filter @dvt/engine test
    - node --test tools/ci/architecture-dependency-guard.test.mjs
    - pnpm arch:deps
    - pnpm verify:prepush
    - pnpm golden:validate
    - node scripts/compare-hashes.cjs
    - node --test scripts/planning-db-operate.test.cjs
    - node --test scripts/documentation-publication.test.cjs scripts/governance-refresh.test.cjs scripts/verify-prepush.test.cjs
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

## Cut 1 Consumer Retirement

Contracts, Planner, Plan Verifier, and Engine now import portable primitives
directly from `@dvt/crypto`. Their domain preimages, versions, validation
rules, public asynchronous boundaries, and error vocabulary remain owned by
the original packages.

The implementation branch deleted the obsolete Contracts SHA/JCS
implementations, Planner primitive mechanics, Plan Verifier WebCrypto helper,
Engine facades, and duplicate primitive-only Contracts test before repairing
consumers. A repository AST guard then exposed 22 additional API, Web, and
Postgres adapter imports through Contracts; all now import the existing Crypto
authority directly. Cross-realm byte vectors prove browser compatibility, and
Plan Verifier retains its public missing-TextEncoder error. No compatibility
alias, forwarding module, fallback, store, planner, or second serialization
format was added.

## Cut 4 Tooling Retirement

Repository tooling, Planning DB command rails, documentation assembly,
validation fingerprints, HET fixture checks, and golden-path validation now
call `@dvt/crypto` directly. The unreferenced root golden-path runner was
deleted; the CLI runner remains the sole implementation.

Golden hashes, operation payloads, NUL delimiters, truncation lengths, binary
content hashing, and caller-supplied operation IDs remain unchanged. A tracked
architecture guard rejects restored Node SHA/UUID mechanics throughout active
scripts, tools, the CLI, and the Engine golden-hash contract test.
