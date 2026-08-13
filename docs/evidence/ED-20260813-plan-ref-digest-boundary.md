---
title: PlanRef digest boundary hardening
status: Accepted
date: 2026-08-13
owners:
  - packages/@dvt/contracts
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/schema-packs/common.ts
  - packages/@dvt/contracts/src/types/contracts.ts
  - packages/@dvt/contracts/test/validation/signal-and-error.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter dvt-api test:unit
    - pnpm verify:prepush
---

## Summary

`PlanRef.sha256` is normatively a lowercase, 64-character SHA-256 digest. The
public schema and TypeScript contract now use the repository's existing shared
`Sha256HexString` boundary instead of accepting arbitrary non-blank text.

The change tightens malformed input rejection without changing the digest
preimage, persisted representation, plan identity, URI scheme or hashing
implementation. Existing valid stored references retain the same value.
