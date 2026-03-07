---
id: R-20260307-ARTIFACT-STORE-01
title: Contract compatibility drift during artifact-store migration
status: Mitigating
date: 2026-03-07
owners:
  - contracts
  - planner
severity: Medium
probability: Medium
---

# R-20260307-ARTIFACT-STORE-01 - Contract compatibility drift during artifact-store migration

## Context

The branch introduces the artifact-store port and typed compiled-code references
across `@dvt/contracts`, planner storage adapters, and traceability resolver flow.

## Risk

If public validation exports drift from current CLI and golden-contract checks,
CI contract validation can fail even when planner/runtime behavior is correct.

## Mitigation

- Restored backward-compatible `parseCanonicalEngineEvent` validation API in
  `@dvt/contracts` while keeping `parseRunEventWrite` as the forward contract.
- Kept adapter-facing artifacts typed through the new `artifact-store` port.
- Preserved deterministic contract validation gates in CI.

## Evidence

- `packages/@dvt/contracts/src/validation.ts`
- `packages/@dvt/contracts/src/ports/artifact-store.ts`
- `packages/@dvt/planner/src/ports/ICompiledCodeStorage.ts`
- GitHub Actions run for PR #384 (`PR Quality Checks`, `Validate Golden JSON Fixtures`)
