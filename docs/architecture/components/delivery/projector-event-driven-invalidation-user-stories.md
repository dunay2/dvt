---
title: Projector Event-Driven Invalidation User Stories
status: Active
owner: Architecture / Delivery
last_reviewed: 2026-05-24
---

# Projector Event-Driven Invalidation User Stories

| ID           | Story                                                                   | Acceptance                                                                 |
| ------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `US-PEI-001` | As an operator, I need projector discovery to consume queued work.      | Queue-capable runtime calls `claimSnapshotWork(batchSize)` every tick.     |
| `US-PEI-002` | As an operator, I need polling not to return as the default bottleneck. | Queue-capable runtime does not call `listStaleSnapshotRuns()` by default.  |
| `US-PEI-003` | As a maintainer, I need recovery polling to remain deliberate.          | Fallback polling runs only when `enableFallbackPolling` is explicitly set. |
| `US-PEI-004` | As a reviewer, I need stale queue rows handled safely.                  | Non-stale queued work is completed without rebuilding the snapshot.        |
| `US-PEI-005` | As a runtime owner, I need claim races to stay non-fatal.               | Lost complete/fail ownership logs a warning and does not crash the tick.   |
