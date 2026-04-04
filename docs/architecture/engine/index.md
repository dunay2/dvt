---
title: Engine Architecture Index
status: Active
owner: Architecture / Engine
last_reviewed: 2026-04-03
---

# Engine Architecture Index

## Canonical reading order

1. [WorkflowEngine subsystem context](workflow-engine-subsystem-context.md)
2. [WorkflowEngine target architecture v1](workflow-engine-target-architecture.v1.md)
3. [Engine contracts index](../../contracts/engine/index.md)
4. [Engine C4 architecture](c4-engine.md)
5. [Scheduler release and claim semantics](contracts/engine/SchedulerReleaseAndClaimSemantics.v1.md)
6. [Engine class review and gaps](engine-class-review-and-gaps-2026-03-31.md)

## What is canonical vs reference

Canonical for subsystem architecture decisions:

- `workflow-engine-subsystem-context.md`
- `workflow-engine-target-architecture.v1.md`

Reference and historical support:

- `c4-engine.md` (structural view)
- `engine-class-review-and-gaps-2026-03-31.md` (analysis baseline)
- contract and adapter-specific specifications under `contracts/`, `adapters/`,
  `ops/`, and `security/`

## Replacement note

This index intentionally replaces the previous broad engine navigation style to
avoid parallel architecture narratives. If another engine document conflicts
with the two canonical WorkflowEngine docs above, treat that document as
reference-only until reconciled or archived.
