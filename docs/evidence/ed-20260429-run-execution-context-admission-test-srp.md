---
title: Run execution context admission test SRP hardening
status: Accepted
date: 2026-04-29
owners:
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/test/services/RunExecutionContextAdmissionPolicy.acceptance.test.ts
  - packages/@dvt/engine/test/services/RunExecutionContextAdmissionPolicy.plugin-requirements.test.ts
  - packages/@dvt/engine/test/services/RunExecutionContextAdmissionPolicy.provenance.test.ts
  - packages/@dvt/engine/test/services/RunExecutionContextAdmissionPolicy.compatibility.test.ts
  - packages/@dvt/engine/test/services/RunExecutionContextAdmissionPolicy.srp.architecture.test.ts
  - packages/@dvt/engine/test/services/runExecutionContextAdmissionPolicy.fixtures.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine exec vitest run test/services/RunExecutionContextAdmissionPolicy.srp.architecture.test.ts
    - pnpm --filter @dvt/engine exec vitest run test/services/RunExecutionContextAdmissionPolicy.srp.architecture.test.ts test/services/RunExecutionContextAdmissionPolicy.acceptance.test.ts test/services/RunExecutionContextAdmissionPolicy.plugin-requirements.test.ts test/services/RunExecutionContextAdmissionPolicy.provenance.test.ts test/services/RunExecutionContextAdmissionPolicy.compatibility.test.ts
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/engine typecheck
    - pnpm docs:status:generate
    - pnpm docs:sync
    - pnpm verify:prepush
---

# Run Execution Context Admission Test SRP Hardening

## Summary

The previous `RunExecutionContextAdmissionPolicy.test.ts` file mixed acceptance,
plugin requirement, provenance alignment, compatibility fingerprint, and fixture
builder concerns in one large test module. The production policy did not require
behavior changes, but the test surface had become harder to scan and easier to
duplicate.

## What Changed

- Split the monolithic admission-policy test into behavior-specific suites:
  acceptance, plugin requirements, provenance alignment, and compatibility
  fingerprint.
- Moved shared builders and binding-policy fixtures into
  `runExecutionContextAdmissionPolicy.fixtures.ts`.
- Added an architecture test that fails if the monolithic test returns, if
  behavior suites redeclare fixture builders, or if a behavior suite grows past
  the agreed narrowness threshold.
- Removed the duplicated explicit missing-ref case because the parameterized
  plugin step-kind coverage already proves that behavior for every example
  plugin step kind.

## Boundary Statement

No production runtime behavior changed. This slice hardens test architecture so
future run-execution-context admission work stays grouped by owned concern and
keeps negative-path coverage visible.
