---
title: Planning authority retirement in the engine architecture guard
status: Accepted
date: 2026-07-31
owners:
  - '@dvt/engine'
  - ci-governance
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/test/architecture/workflowEngineCanonicalMapHardcut.architecture.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine test
    - pnpm verify:prepush
---

# Planning Authority Retirement In The Engine Architecture Guard

The engine architecture guard previously read `agent-lane-a.yaml` to validate
planning prose in addition to validating the engine's canonical architecture
documents and implementation sources.

ADR-0061 makes GitHub Issues the sole MVP task authority and removes local lane
files. The guard now retains only assertions owned by the engine architecture:

- canonical engine documents do not reintroduce compatibility posture;
- run-control source ownership stays semantic;
- user guidance points at the current component path;
- the active engine roadmap stays aligned with the hard-cut posture.

No engine runtime, contract, adapter, or execution behavior changes in this
slice.
