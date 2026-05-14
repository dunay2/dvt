---
title: WE-HX-0 hardcut canonical WorkflowEngine map
status: Accepted
date: 2026-05-14
owners:
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/test/architecture/workflowEngineCanonicalMapHardcut.architecture.test.ts
  - packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts
evidence:
  tests:
    - pnpm docs:feature-mechanization --feature WE-HX-0-HARDCUT-CANONICAL-MAP
    - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineCanonicalMapHardcut.architecture.test.ts test/architecture/workflowEngineSemanticClosure.architecture.test.ts test/architecture/workflowEngineRuntimePathDecomposition.architecture.test.ts
---

# WE-HX-0 Hardcut Canonical WorkflowEngine Map

This evidence records the hardcut closeout for the canonical WorkflowEngine
architecture map. The slice adds a semantic architecture guard that rejects
retrocompatibility posture in active WorkflowEngine canonical docs and updates
run-control owned-concern wording to current command/query delegation truth.

The slice intentionally does not change plugin compatibility fingerprint
semantics, provider runtime behavior, or public serialized contracts.
