---
title: On-demand status provider guard ownership
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
    - pnpm --filter @dvt/contracts run build
    - pnpm --filter @dvt/contracts run typecheck
    - pnpm verify:prepush
---

## Summary

The active-provider vocabulary architecture test no longer reads the retired
tracked System Delivery Status snapshot. That status page is generated only on
demand and is owned by the documentation projection policy, so a clean package
test checkout intentionally has no `docs/architecture/system-delivery-status.md`
source file.

The contract guard continues to scan the implemented provider vocabulary,
runtime composition, active engine architecture and runbook sources. Generated
System Delivery Status ownership remains covered by its generator and
publication tests.

No production contract, runtime behavior, provider vocabulary, compatibility
path or implicit documentation generation changed.
