---
id: R-20261127-TYPESCRIPT-IMPORT-PHASE
title: An import phase could be misclassified by architecture checks
status: Mitigating
date: 2026-11-27
owners:
  - Architecture
severity: Medium
probability: Low
---

# An import phase could be misclassified by architecture checks

A truthiness check on the TypeScript import phase would group deferred
runtime imports with type-only imports. This could hide dependencies from
the architecture checks or omit a browser proof consumer.

The checks compare the phase explicitly with `TypeKeyword`. The browser
routing test covers deferred and side-effect dependencies alongside the
existing value and type-only import classifications.

[Migration evidence](../evidence/ED-20261127-typescript-import-phase.md).
