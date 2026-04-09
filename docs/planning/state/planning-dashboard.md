---
title: Planning Dashboard
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-04-08
planning_type: operational
---

# Planning Dashboard

This is the human entry point for planning.

Use this page when the question is simple:

- what is active now;
- what is blocked now;
- which lane owns a task;
- where is the board;
- what document should I open next.

If the question is "how do I update planning correctly?", go to
[Planning Control Tower](./planning-control-tower.md). The control tower governs
updates. This dashboard explains the current board.

## Where The Board Is

- Portfolio board:
  [Execution Workboard](./execution-workboard.md)
- Strictly unblocked work:
  [Open Task Route](./open-task-route.md)
- Task registry and ownership:
  [Agent Lane A](./agent-lane-a.yaml), [Agent Lane B](./agent-lane-b.yaml),
  [Agent Lane C](./agent-lane-c.yaml), [Agent Lane D](./agent-lane-d.yaml),
  [Agent Lane E](./agent-lane-e.yaml)
- Cross-domain sequence:
  [Roadmap By Domain](../roadmap/roadmap-by-domain.md)
- Current implementation truth:
  [System Delivery Status](../../architecture/system-delivery-status.md)

## Read This In 30 Seconds

```mermaid
flowchart TD
    Start[Need to know what is going on] --> Dash[Planning Dashboard]
    Dash --> Board[Execution Workboard<br/>overall progress]
    Dash --> Route[Open Task Route<br/>what is unblocked now]
    Dash --> Lanes[Lane YAML registry<br/>task owner, blockers, next action]
    Dash --> Roadmap[Roadmap By Domain<br/>cross-domain ordering]
    Dash --> Status[System Delivery Status<br/>what is already true in code]
```

## Lane Roles

| Lane | Title                              | Owns                                                                   | Commonly unblocks                   | Canonical file                      |
| ---- | ---------------------------------- | ---------------------------------------------------------------------- | ----------------------------------- | ----------------------------------- |
| `A`  | Contracts and state-store boundary | contracts, ownership boundaries, plan/state-store seams                | `C`, `E`                            | [Agent Lane A](./agent-lane-a.yaml) |
| `B`  | Event contract and traceability    | event schemas, lineage, provenance, evidence mapping                   | `C`, `E`                            | [Agent Lane B](./agent-lane-b.yaml) |
| `C`  | Runtime safety and admission       | caller-visible runtime behavior, auth, freshness, admin/runtime routes | `E`                                 | [Agent Lane C](./agent-lane-c.yaml) |
| `D`  | Scale and go-to-market             | retention, scale, deferred operational risks, GTM isolation            | `C`, `E`                            | [Agent Lane D](./agent-lane-d.yaml) |
| `E`  | Frontend and UI                    | operator UX, frontend contracts, shell/canvas/run views                | consumes `A`, `B`, `C`, `D` outputs | [Agent Lane E](./agent-lane-e.yaml) |

Task-level dependencies still live in the lane YAML entries. This table is the
high-level rule of thumb for the active repo shape.

## Current Lane Dependency Shape

```mermaid
flowchart LR
    A[Lane A<br/>Contracts and state-store boundary]
    B[Lane B<br/>Event contract and traceability]
    C[Lane C<br/>Runtime safety and admission]
    D[Lane D<br/>Scale and go-to-market]
    E[Lane E<br/>Frontend and UI]

    A --> C
    A --> E
    B --> C
    B --> E
    C --> E
    D --> C
    D --> E
```

## What To Open Next

| If you need...                                                  | Open this                                                              |
| --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| overall progress and active items                               | [Execution Workboard](./execution-workboard.md)                        |
| the next strictly unblocked slice                               | [Open Task Route](./open-task-route.md)                                |
| the real owner, blocker, target, and evidence refs for one task | the relevant `agent-lane-*.yaml` file                                  |
| cross-domain sequence and why a lane is blocked                 | [Roadmap By Domain](../roadmap/roadmap-by-domain.md)                   |
| current implementation truth instead of planning intent         | [System Delivery Status](../../architecture/system-delivery-status.md) |
| how to update planning surfaces without drift                   | [Planning Control Tower](./planning-control-tower.md)                  |

## Interpretation Rule

- `System Delivery Status` = what is already true in code
- `Execution Workboard` = current portfolio board
- `Open Task Route` = current unblocked queue
- `lane yaml` = source of truth for task state, blockers, target, and evidence
- `Roadmap By Domain` = why one lane blocks or sequences another
- `Planning Control Tower` = update protocol, not the easiest reading surface
