---
title: Review And Proposal Disposition Index 2026-05-10
status: Review
owner: Product / Architecture / Docs
last_reviewed: 2026-05-10
planning_type: status
---

# Review And Proposal Disposition Index 2026-05-10

This is a query-oriented status index for answering whether reviews and
proposals are being taken into account, what they have closed, and what remains
open. It does not replace the planning database, lane YAML, review status
board, proposal portfolio map, ADRs, evidence docs, or risk register.

Use this document as a disposition layer:

- reviews and proposals explain why work exists;
- planning DB tasks define what work is active, blocked, queued, in review, or
  closed;
- evidence and closeouts prove what was actually completed;
- this index records how to connect those surfaces without creating a second
  backlog.

## Governing Sources

- [Governance Document And Rule Inventory](./governance-document-rule-inventory.md)
- [Docs Task Disposition Inventory 2026-05-10](./docs-task-disposition-inventory-20260510.md)
- [Review Status Board](../reviews/review-status-board.md)
- [Proposal Portfolio Map](../proposals/portfolio-map-20260403.md)
- [Planning Control Tower](../state/planning-control-tower.md)
- [ADR-0055 - Planning DB canonical operational source](../../adr/adr-0055-planning-db-canonical-operational-source.md)

## Questions This Index Must Support

| Question                             | Primary answer source                                                                                       | Disposition rule                                                                                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Are we taking a review into account? | Review Status Board plus planning DB task linkage                                                           | A review is accounted for when it is `done`, `accepted`, `reference`, or linked to active planning work.                                       |
| Are we drifting away from a review?  | Review role, linked task IDs, current task state, and evidence references                                   | Drift exists when a review has active findings but no task, evidence, risk, or explicit reference-only disposition.                            |
| What have we solved?                 | Planning DB `done` tasks, closeouts, evidence docs, and accepted reviews                                    | A solved item needs both a closed task or accepted review and a proof surface.                                                                 |
| What remains pending?                | Planning DB `queued`, `blocked`, `in_progress`, and `review` tasks plus active review/proposal dispositions | Pending work must resolve to a task, risk, explicit future review, or deliberate non-goal.                                                     |
| Is a proposal applied?               | Proposal status plus task/evidence references                                                               | A proposal is applied only when its linked tasks are closed or the proposal is marked `Implemented`, `Accepted`, or `Completed` with evidence. |
| Is a proposal still active?          | Proposal portfolio map and proposal frontmatter                                                             | `Active`, `Review`, `Proposed`, and `Draft` proposals require triage unless they are explicitly reference-only.                                |

## Current Planning State

Planning DB is the operational source of truth for work state.

| Metric                              | Value                                              |
| ----------------------------------- | -------------------------------------------------- |
| Planning source authority           | `database`                                         |
| Lanes                               | 5                                                  |
| Tasks                               | 336                                                |
| Tasks in `review`                   | 10                                                 |
| Task dependencies                   | 329                                                |
| Task evidence references            | 1754                                               |
| Governance remediation tasks        | 40                                                 |
| P0 governance remediation tasks     | 0                                                  |
| Lane YAML vs planning DB task drift | 0 known missing, extra, or status-mismatched tasks |

The next-task queue currently starts with:

| Lane | Task         | Priority | Status | Disposition                                                  |
| ---- | ------------ | -------- | ------ | ------------------------------------------------------------ |
| E    | `F-28-C`     | P0       | queued | Next product-critical Canvas export/import proof.            |
| A    | `DHM-WS3`    | P1       | queued | Next bounded DDD modularization seam.                        |
| A    | `WE-HX-3`    | P1       | queued | Start-run application flow decomposition.                    |
| A    | `AR-A4`      | P2       | queued | Custom policy namespace registry removal or freeze decision. |
| A    | `AR-A6`      | P2       | queued | Snapshot projection concurrency contract requirement.        |
| D    | `AR-D4`      | P2       | queued | Zero-downtime schema rollback strategy.                      |
| D    | `AR-D6`      | P2       | queued | Triple-versioning governance burden reassessment.            |
| C    | `CI-AUDIT-*` | P2/P3    | queued | CI ownership, scope, coverage, and release-flow decisions.   |

## Review Disposition State

The review board contains 69 active or reference-worthy review entries.

| Review board status | Count | Meaning for planning                                                                           |
| ------------------- | ----- | ---------------------------------------------------------------------------------------------- |
| `reference`         | 32    | Accounted for as design/history input unless a linked task says otherwise.                     |
| `done`              | 24    | Accounted for as closed review work; check evidence or closeout if needed.                     |
| `review`            | 7     | Still requires review disposition or linked execution closure.                                 |
| `accepted`          | 3     | Accounted for as accepted intake; verify the linked execution path when planning related work. |
| `active`            | 2     | Current review source; must not be ignored when selecting related work.                        |
| `in_progress`       | 1     | Live review work; should feed or reconcile with active tasks.                                  |

### Reviews That Still Need Active Attention

These entries are not automatically problems. They are the review surfaces that
must be checked when choosing work so we do not drift from current review
findings.

| Review surface                                      | Status           | Linked work                                      | Current disposition                                                                            |
| --------------------------------------------------- | ---------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Lane C AI efficiency and cost review                | review, 67%      | `RC-C2`                                          | Still feeds CI and preflight efficiency work.                                                  |
| CI/prepush/PR process observations                  | review, 67%      | `RC-C2`                                          | Still feeds CI friction reduction.                                                             |
| Lane C RC-C2 efficiency institutionalization review | review, 67%      | `RC-C2`                                          | Still feeds institutionalized CI efficiency work.                                              |
| RC-C2 operational friction intake review            | review, 67%      | `RC-C2`                                          | Still feeds operational friction intake.                                                       |
| Internal alpha product route review                 | review, 15%      | `F-27`, `AR-C10`, `TF-C4`, `TF-E2-M`             | Current route-level alpha gate; do not bypass when doing alpha route work.                     |
| Internal alpha architecture view review             | review, 15%      | `F-27`, `AR-C10`, `TF-C4`, `TF-E2-M`             | Current architecture lens for alpha route work.                                                |
| API tenant review                                   | review, 90%      | none in board                                    | Needs explicit linkage or reference-only disposition before tenant/RLS cleanup.                |
| DVT+ principal architect deep review - April 2026   | active, 100%     | `AR-D2`, `AR-D-PLAN-POINTER`, risk register      | Current full-system review baseline; use as strategic architecture context.                    |
| DVT engine package audit review                     | active, 0%       | `S16`, `S09`, `AR-A8`, `AR-A12`, `AR-D6`, `EA-*` | Needs finding-to-task disposition before engine audit cleanup.                                 |
| Contract pack and read boundary reset Fowler review | in_progress, 35% | `AR-A12`, `AR-A12-A`, `AR-A12-B`, `AR-A12-C`     | Partially executed; remaining findings must reconcile with current AR-A12 task/evidence state. |

## Tasks Currently In Review

These are the planning DB items whose work is not fully closed even if linked
documents exist.

| Lane | Task                | Priority | Progress | Disposition focus                                             |
| ---- | ------------------- | -------- | -------- | ------------------------------------------------------------- |
| B    | `ADP-LINT-ORDER-01` | P2       | 80%      | Adapter-postgres lint/import-order tooling cleanup.           |
| E    | `F-03`              | P0       | 98%      | Backend health state and startup route gate closure.          |
| E    | `F-04-A`            | P0       | 90%      | Frontend data-boundary coupling inventory closure.            |
| E    | `F-04-B`            | P0       | 85%      | Frontend data-boundary architecture document closure.         |
| E    | `F-04-C`            | P0       | 80%      | Runtime-modes manual closure.                                 |
| E    | `F-04-D`            | P0       | 85%      | Frontend ports and adapter boundary closure.                  |
| E    | `F-04-E`            | P0       | 95%      | Frontend composition-root wiring closure.                     |
| E    | `F-17-A`            | P1       | 90%      | Monaco positioning alignment closure.                         |
| E    | `F-20`              | P1       | 80%      | Per-screen manuals and user stories closure.                  |
| E    | `F-26`              | P0       | 100%     | Web auth/project onboarding CQRS-DDD baseline review closure. |

## Proposal Disposition State

The proposal corpus is larger than the active work queue. Proposal status must
therefore be interpreted through linked tasks and evidence, not by folder
location alone.

| Proposal bucket                          | Count |
| ---------------------------------------- | ----- |
| Total proposal Markdown files            | 159   |
| Mandatory proposal files                 | 105   |
| Mandatory proposals marked `Active`      | 26    |
| Mandatory proposals marked `Proposed`    | 18    |
| Mandatory proposals marked `Review`      | 12    |
| Mandatory proposals marked `Draft`       | 21    |
| Mandatory proposals marked `Accepted`    | 19    |
| Mandatory proposals marked `Implemented` | 4     |
| Mandatory proposals marked `Completed`   | 1     |
| Mandatory proposals marked `Superseded`  | 2     |
| Mandatory proposals missing status       | 2     |

### Mandatory Proposals Needing Triage

These proposal groups are not necessarily stale. They are the highest-risk
places for hidden work because they live under `mandatory/` but are not clearly
closed.

| Disposition class                 | Count | Rule                                                                                                                |
| --------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------- |
| `Draft` under `mandatory/`        | 21    | Confirm whether each is active design work, superseded context, or applied work that needs status/evidence closure. |
| `Proposed` under `mandatory/`     | 18    | Confirm whether proposal intent is already represented by planning DB tasks.                                        |
| `Review` under `mandatory/`       | 12    | Link to review-board status and decide whether findings remain open.                                                |
| Missing status under `mandatory/` | 2     | Add explicit status before using as planning input.                                                                 |
| `Superseded` under `mandatory/`   | 2     | Move or classify via the superseded proposal surface after link checks.                                             |

Known mandatory superseded files:

- `docs/planning/proposals/mandatory/runtime-and-contracts/ar-c6-cancel-lifecycle-ownership-truth-sync-plan-20260410.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/planner-generic-ingress-compatibility-slice-20260410.md`

## What Has Been Solved

The repository has already solved several governance problems that previously
made these questions hard to answer:

- local planning database data is ignored by repository `.gitignore`;
- planning DB is the canonical operational source for task state;
- lane YAML and planning DB are aligned for task IDs and status;
- the review board explicitly distinguishes `reference`, `done`, `accepted`,
  `review`, `active`, and `in_progress` review roles;
- the docs task disposition inventory identifies stale, draft, superseded, and
  task-like-ID risk categories;
- generated governance coverage reports 0 drift and 0 legacy files.

These fixes do not mean all review/proposal work is closed. They mean the
repository now has enough structure to ask precise disposition questions.

## What Remains Pending

The unresolved work is the disposition gap between narrative documents and the
planning DB:

1. Review findings are not yet uniformly decomposed into task, evidence, risk,
   non-goal, or reference-only rows.
2. Mandatory proposals are not yet uniformly classified as active, applied,
   superseded, or reference-only.
3. `Draft` proposals and closeouts may contain already-applied work, real open
   work, or historical text; they must not be batch-promoted.
4. Some active reviews have no explicit task linkage in the review board.
5. Some linked tasks are closed, but their originating review/proposal still
   needs a clear disposition statement.

## Operating Rule For The Next Cleanup PRs

Do not move, archive, or status-promote a review/proposal document until it has
one of these dispositions:

| Disposition          | Meaning                                          | Required proof                                                |
| -------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| `task-linked`        | Still feeds real work.                           | Planning DB task ID and current status.                       |
| `closed-by-evidence` | Work is completed.                               | Evidence doc, closeout, or accepted review plus closed task.  |
| `reference-only`     | Kept as context, not backlog.                    | Review board or proposal note saying it is reference context. |
| `superseded`         | Replaced by a newer plan/review.                 | Link to the replacing document or task.                       |
| `risk-tracked`       | Not planned as immediate work, but risk remains. | Risk register entry.                                          |
| `non-goal`           | Deliberately not planned.                        | Explicit rationale and owner.                                 |

## Recommended Next Slice

The next implementation slice should be a focused disposition pass, not a broad
archive sweep:

1. Start with active review entries in `review`, `active`, and `in_progress`.
2. For each linked task ID, query planning DB state and evidence references.
3. For each unlinked review, either add a task linkage, risk linkage, or
   reference-only disposition.
4. Then process mandatory proposals marked `Draft`, `Review`, `Proposed`,
   missing status, or `Superseded`.
5. Only after disposition rows exist, move or archive documents and run docs
   sync.

## Commands Used

- `pnpm planning:db:query summary`
- `pnpm planning:db:query next`
- `pnpm planning:db:query tasks --limit 30`
- Node-based scans of review-board status, lane task status, and proposal
  frontmatter
