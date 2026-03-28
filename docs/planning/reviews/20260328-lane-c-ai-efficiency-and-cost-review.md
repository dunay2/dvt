---
title: 20260328 Lane C AI Efficiency And Cost Review
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-28
planning_type: review
---

# 20260328 Lane C AI Efficiency And Cost Review

## Scope

This review evaluates the execution efficiency of recent Lane C work
(runtime safety, admission control, RBAC), with focus on:

- avoidable AI rounds
- avoidable validation retries
- branch/PR hygiene overhead
- procedure effectiveness and improvements

## Executive Summary

Current governance is strong on correctness (`AGENTS.md`, `verify:prepush`,
docs generation rules), but weak on preflight predictability. Most extra cost
came from repeated loops that were mechanically preventable:

1. push blocked by formatting/import-order issues discovered late
2. manual superseded-branch analysis done ad hoc
3. large conflict resolution requiring repetitive inspection
4. repeated PR-check polling and delayed root-cause extraction

Estimated optimization potential for similar Lane C slices:

- **35% to 55% fewer interactive rounds**
- **25% to 45% fewer tool calls**
- **20% to 40% lower wall-clock to green**

## Observed Procedure Effectiveness

### What worked well

1. `verify:prepush` caught real issues before merge.
2. strict commit helper policy prevented commit-format drift.
3. docs generation rules (`docs:sync`, `docs:workboard:generate`) prevented stale indexes.
4. explicit startup governance reduced uncontrolled scope changes.

### What produced avoidable cost

1. formatting/lint issues discovered at push time, not preflight time
2. repeated branch-diff diagnosis done manually per branch
3. conflict-heavy merges without an opinionated triage flow
4. PR failure triage delayed until after watch loops instead of direct failed-job log extraction

## Cost Model And Savings Estimate

## Model

Use relative cost units (RCU):

`Total Cost = (R * 1.0) + (T * 0.25) + (V * 0.75)`

Where:

- `R`: interactive rounds (assistant-user/action cycles)
- `T`: tool command executions
- `V`: validation reruns caused by avoidable misses (format/lint/order/hook mismatches)

## Baseline scenario (recent Lane C pattern)

- `R = 22`
- `T = 58`
- `V = 7`

`Cost_baseline = 22 + 14.5 + 5.25 = 41.75 RCU`

## Improved scenario (with proposed workflow)

- `R = 12`
- `T = 36`
- `V = 2`

`Cost_improved = 12 + 9 + 1.5 = 22.5 RCU`

## Estimated savings

`Savings = (41.75 - 22.5) / 41.75 = 46.1%`

Sensitivity band:

- conservative: ~30%
- expected: ~46%
- aggressive: ~55%

## Improvement Plan (Prioritized)

## P0: Deterministic preflight before push

Problem:
Push-time failures caused rework rounds.

Action:
Run a single preflight chain before any push:

1. target slice tests
2. `pnpm verify:prepush`
3. only then `git push`

Expected impact:
20% to 30% round reduction.

## P0: Standard branch hygiene automation

Problem:
superseded-branch diagnosis was manual and repetitive.

Action:
Use `scripts/hygiene.ps1` as default diagnostic and optional cleanup path.

Expected impact:
10% to 20% tool-call reduction in branch triage tasks.

## P1: Conflict triage protocol

Problem:
merge conflict loops were expensive.

Action:
Use fixed order:

1. classify files by ownership (`ours/theirs/manual`)
2. apply bulk `--ours/--theirs` where safe
3. run marker scan
4. run targeted slice tests

Expected impact:
15% to 25% faster conflict closeout.

## P1: PR failure triage protocol

Problem:
watch loops consumed time before root cause was explicit.

Action:
On first red check:

1. fetch failed-job logs directly
2. patch cause
3. rerun failed job only

Expected impact:
5% to 15% reduction in CI-related rounds.

## Strategy To Ensure AI Actually Uses This File

## Level 1 (documentation, immediate)

Declare this file as the Lane C efficiency playbook:

- `docs/planning/reviews/20260328-lane-c-ai-efficiency-and-cost-review.md`

## Level 2 (planning workflow, immediate)

Add a persistent lane task to enforce adoption in Lane C execution:

- checklist includes preflight and hygiene script usage

## Level 3 (operational enforcement, next iteration)

Add a lightweight preflight script and reference it in `AGENTS.md` startup
for Lane C tasks. The script should print:

- branch superseded summary
- required validation commands
- last failed CI checks for the active PR (if any)

## Level 4 (CI guardrail, optional)

Add a non-blocking CI reminder job for PRs touching `apps/api/src/entrypoints/http/**`
that warns when preflight evidence is missing in PR body/comments.

## Operating Procedure (Lane C)

For every Lane C implementation or PR-green task:

1. run `scripts/hygiene.ps1 -BaseBranch main`
2. run target slice tests
3. run `pnpm verify:prepush`
4. push only after preflight green
5. on CI red, inspect failed job log first, then rerun failed jobs

## Risks And Mitigations

1. Risk: script adoption degrades over time.
   Mitigation: keep lane task open until adoption is habitual and measured.
2. Risk: over-automation hides edge-case judgment.
   Mitigation: keep destructive actions opt-in with explicit confirmation.
3. Risk: added process overhead for tiny changes.
   Mitigation: allow slim mode for docs-only edits.

## Acceptance Criteria For Improvement Initiative

1. Lane C tasks use preflight chain by default.
2. At least 3 consecutive Lane C PRs reach green without push-time format/lint surprises.
3. Superseded-branch cleanup uses `hygiene.ps1` instead of ad hoc commands.
4. CI-failure triage starts with failed-job log extraction in first remediation round.
