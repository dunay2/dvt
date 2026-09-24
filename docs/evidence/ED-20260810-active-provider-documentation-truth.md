---
title: Active provider documentation truth
status: Accepted
date: 2026-08-10
owners:
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/test/provider-vocabulary.architecture.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test -- provider-vocabulary.architecture.test.ts
    - pnpm docs:gov:links
    - pnpm docs:build
    - pnpm planning:db:current-schema:check
    - pnpm planning:db:export:check
    - pnpm docs:feature-mechanization:implementation --feature DOC1-7-RUNTIME-PROVIDER-TRUTH
    - pnpm verify:prepush
---

## Summary

Repository entry points, execution-model decisions, and active operator manuals
now distinguish provider-neutral domain semantics from implemented runtime
support. Temporal is the sole implemented workflow provider. Any future
provider remains conditional on an ADR, a real adapter package, capability
conformance, production composition, and documentation evidence.

The architecture guard proves that README links resolve, retired engine paths
and versions are absent, active contracts expose no mock or Conductor provider,
fake provider stubs stay absent, and the governed ADR/manual applicability
language remains explicit.

Feature authority and its three reused query rails are stored in the Planning
DB under `DOC1-7-RUNTIME-PROVIDER-TRUTH`; this evidence file only satisfies the
ARC review boundary and does not duplicate planning authority.
