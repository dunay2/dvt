---
title: Plan integrity validator traceability baseline
status: Accepted
date: 2026-05-10
owners:
  - packages/@dvt/engine
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/ports/IPlanIntegrityValidator.ts
evidence:
  tests:
    - pnpm test:ci-tools
    - pnpm traceability:adr0
    - pnpm verify:prepush
---

## Summary

The plan integrity validator port now declares its governing ADR baseline so the
ADR-0000 traceability gate can validate the engine port surface consistently.

## Outcome

- `IPlanIntegrityValidator` remains an engine-owned port.
- The port is explicitly tied to ADR-0043, which owns plan records, plan store,
  and artifact boundaries.
- No runtime behavior changed.
