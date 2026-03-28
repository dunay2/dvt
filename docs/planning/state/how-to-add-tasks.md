---
title: How to Add Tasks to an Agent Lane
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-27
planning_type: guide
---

# How to Add Tasks to an Agent Lane

Tasks live in the `agent-lane-*.yaml` files. The workboard and open-task-route are
generated views — never edit them directly.

## Step 1 — Pick the right lane

| Lane | File                | Scope                                                 |
| ---- | ------------------- | ----------------------------------------------------- |
| A    | `agent-lane-a.yaml` | Contracts, state-store boundaries, DDD modularization |
| B    | `agent-lane-b.yaml` | Event contracts, traceability, lineage                |
| C    | `agent-lane-c.yaml` | Runtime safety, admission control, RBAC               |
| D    | `agent-lane-d.yaml` | Scale, retention, GTM                                 |
| E    | `agent-lane-e.yaml` | Frontend and UI — shell, API integration, core flow   |

## Step 2 — Add the task entry

Open the lane file and append to the `tasks` list:

```yaml
- task_id: S21 # unique ID, follow existing convention
  priority: P1 # P0 critical · P1 high · P2 normal · P3 low
  status: queued # queued | in_progress | review | done | blocked
  objective: one sentence describing what must be done
  dependency: S18 # task_id it depends on, or "none"
  target: concrete deliverable or outcome
```

## Step 3 — Regenerate the views

```bash
pnpm docs:workboard:generate
```

Or just do a `git pull` — the `post-merge` hook runs it automatically when
any `agent-lane-*.yaml` changed.

## Field reference

| Field        | Required | Values                                           |
| ------------ | -------- | ------------------------------------------------ |
| `task_id`    | yes      | Short unique ID (`S21`, `RC-F3`, `G5-PR3`)       |
| `priority`   | yes      | `P0` `P1` `P2` `P3`                              |
| `status`     | yes      | `queued` `in_progress` `review` `done` `blocked` |
| `objective`  | yes      | One sentence, what to do                         |
| `dependency` | yes      | Task ID, comma-separated IDs, or `none`          |
| `target`     | yes      | Concrete deliverable / acceptance criterion      |

## Status lifecycle

```
queued → in_progress → review → done
                              ↘ blocked (waiting on external dependency)
```

Update `status` in the YAML as the task progresses. The workboard view reflects
it automatically on the next generation.
