---
title: How to Add Tasks to an Agent Lane
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-31
planning_type: guide
---

# How to Add Tasks to an Agent Lane

New task definitions live in the `agent-lane-*.yaml` files. Existing task
claims, releases, status changes, progress updates, evidence refs, and status
reasons are local DB-first operations through `pnpm planning:db:operate`. The
lane Markdown views, workboard, open-task-route, and planning landing indexes
are generated local/CI artifacts and must never be edited directly or
committed.

The lane YAML remains the bootstrap and PR-review compatibility registry until
create/delete task commands move to the DB. Effective task state for existing
work items is the Postgres overlay plus the imported lane row. Task closure is
evidence-based:

- `done` means the task has accepted evidence or equivalent verifiable closure.
- `review` means implementation or documentation exists, but final closure still
  depends on unresolved validation, acceptance, or dependency lock.
- `progress_pct` tracks quantity of work completed, even when status is not
  `done`.

## Step 1 - Pick the right lane

| Lane | File                | Scope                                                 |
| ---- | ------------------- | ----------------------------------------------------- |
| A    | `agent-lane-a.yaml` | Contracts, state-store boundaries, DDD modularization |
| B    | `agent-lane-b.yaml` | Event contracts, traceability, lineage                |
| C    | `agent-lane-c.yaml` | Runtime safety, admission control, RBAC               |
| D    | `agent-lane-d.yaml` | Scale, retention, GTM                                 |
| E    | `agent-lane-e.yaml` | Frontend and UI - shell, API integration, core flow   |

## Step 2 - Add the task entry

For new tasks, open the lane file and append to the `tasks` list:

```yaml
- task_id: S21
  priority: P1
  status: in_progress
  objective: implement the governed slice
  dependency: S18
  target: concrete deliverable or acceptance criterion
  complexity: M
  effort_points: 5
  progress_pct: 40
  evidence_refs:
    - docs/evidence/critical/ED-20260331-s21-example.md
    - docs/planning/closeouts/20260331-s21-closeout.md
  status_reason: implementation started; evidence and final validation still open
  last_verified: 2026-03-31
```

If the task is a large slice, split it into flat subtasks and link them to the
parent:

```yaml
- task_id: S21-A
  parent_task: S21
  priority: P1
  status: queued
  objective: split the first executable sub-slice
  dependency: S18
  target: bounded outcome for the first sub-slice
  complexity: S
  effort_points: 2
  progress_pct: 0
  evidence_refs: []
  status_reason: planned slice; execution not started
  last_verified: 2026-03-31
```

For existing tasks, do not edit the lane YAML just to claim work or change
status/progress/evidence. Use the DB command rail:

```bash
pnpm planning:db:operate task claim --lane A --task S21 --actor codex
pnpm planning:db:operate task update --lane A --task S21 --actor codex --status review --progress 80 --reason "Implementation ready for review" --evidence docs/planning/closeouts/20260508-s21-closeout.md
pnpm planning:db:query open --lane A
pnpm planning:db:query tasks --lane A --status review
pnpm planning:db:query next --lane A
```

`planning:db:query open` reads `planning_open_tasks`, the DB view that hides
`done` and `blocked` rows for daily work inspection while preserving the full
effective read model in `planning_effective_tasks`.

`planning:db:query next --lane <id>` reads `planning_next_tasks`, the DB view
that resolves dependencies against the full effective task view before the CLI
filters candidates to the requested lane. This keeps cross-lane prerequisites
visible while still returning a lane-scoped next work list.

Before publishing a branch that depends on local DB overlays, run:

```bash
pnpm planning:db:export:check
pnpm planning:db:check
```

## Step 3 - Maintain the lane verification summary

Each lane carries a `verification_summary` block that captures the current
evidence-backed state of the lane:

```yaml
verification_summary:
  status_model: evidence-backed lane registry
  done_rule: done only with accepted evidence or equivalent verifiable closure
  verified_on: 2026-03-31
  total_tasks: 12
  total_effort_points: 55
  completed_weighted_points: 31.4
  lane_progress_pct: 57
  notes: Weighted progress uses effort_points
```

Use this formula:

```text
lane_progress_pct = round(sum(effort_points * progress_pct/100) / sum(effort_points) * 100)
```

`completed_weighted_points` should reflect weighted progress, not just the count
of tasks with status `done`.

## Step 4 - Regenerate the views

For new task definitions or structural lane changes, import the lane YAML into
the DB before regenerating or checking derived views:

```bash
pnpm planning:db:import
```

```bash
pnpm docs:planning:lanes:generate
pnpm docs:workboard:generate
```

`docs:workboard:generate` defaults to `--source auto`: it reads the imported
`planning_effective_tasks` DB view when the shared planning DB is reachable and
fresh, and falls back to lane YAML only when the DB is unavailable. Use
`node scripts/generate-workboard.cjs --source yaml` only for an explicit
deterministic fallback preview. If the DB is reachable but stale, refresh with
`pnpm planning:db:import` instead of accepting YAML-derived output.

If you added, removed, or renamed documentation files under `docs/`, also run:

```bash
pnpm docs:sync
```

Do not stage the generated planning-derived files after regeneration:

- `docs/planning/index.md`
- `docs/planning/proposals/index.md`
- `docs/planning/reviews/index.md`
- `docs/planning/status/index.md`
- `docs/planning/state/agent-lane-*.md`
- `docs/planning/state/execution-workboard.md`
- `docs/planning/state/open-task-route.md`

For isolated local previews that avoid touching tracked docs surfaces:

```bash
pnpm docs:planning:preview:isolated
```

This renders lane and workboard outputs under `.generated-docs/docs/planning/state/`.

## Field reference

| Field           | Required | Values / Rule                                              |
| --------------- | -------- | ---------------------------------------------------------- |
| `task_id`       | yes      | Short unique ID (`S21`, `RC-F3`, `G5-PR3`)                 |
| `parent_task`   | no       | Parent task ID for flat subtasks                           |
| `priority`      | yes      | `P0` `P1` `P2` `P3`                                        |
| `status`        | yes      | `queued` `in_progress` `review` `done` `blocked`           |
| `objective`     | yes      | One sentence, what to do                                   |
| `dependency`    | yes      | Task ID, comma-separated IDs, or `none`                    |
| `target`        | yes      | Concrete deliverable / acceptance criterion                |
| `complexity`    | yes      | `S` `M` `L`                                                |
| `effort_points` | yes      | Fibonacci points: `1` `2` `3` `5` `8` `13`                 |
| `progress_pct`  | yes      | Integer `0..100`                                           |
| `evidence_refs` | yes      | List of repo paths, PRs, commits, or other verifiable refs |
| `status_reason` | yes      | Short explanation for the current effective status         |
| `last_verified` | yes      | `YYYY-MM-DD` of the last effective review                  |

## Status lifecycle

```text
queued -> in_progress -> review -> done
                       \-> blocked
```

Use status based on effective state, not on intent:

- `queued`: not started yet.
- `in_progress`: active execution with partial evidence.
- `review`: work is largely present, but closure still depends on acceptance,
  final validation, or dependency resolution.
- `done`: accepted evidence or equivalent verifiable closure is present.
- `blocked`: cannot proceed because an external dependency is unresolved.

## Verification rule

Before changing a task to `done`, confirm at least one of these is true:

- an accepted evidence document exists under `docs/evidence/`
- a closeout or review document explicitly records the task as closed
- a merged PR or commit provides equivalent verifiable closure and the repo
  state still matches that claim

If that standard is not met, keep the task in `review` or `in_progress` and
record the gap in `status_reason`.
