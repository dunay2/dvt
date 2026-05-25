---
title: Backlog Intake Reconciliation Review
status: Review
owner: Product / Architecture / Docs
last_reviewed: 2026-05-25
planning_type: review
---

# Backlog Intake Reconciliation Review

## Purpose

This review explains why the operational `next_task` view does not show the
real amount of unreconciled work and defines the next planning route before new
product implementation begins.

The problem is not that there are no tasks. The problem is that the repository
contains a larger intake set in mandatory proposals, active reviews, knowledge
actions, and risk entries. That intake needs explicit disposition before it can
be prioritized as product work.

## Governing Sources

- [Governance document and rule inventory](../../status/governance-document-rule-inventory.md)
- [Planning control tower](../../state/planning-control-tower.md)
- [AI work protocol](../../../guides/ai-work-protocol.md)
- [Review status board](../review-status-board.md)
- [Risk register](../../../risk-register/index.md)
- [Command and query rail governance](../../../architecture/command-query-rail-governance.md)
- [Fowler opportunity planning governance](../../../architecture/fowler-opportunity-planning-governance.md)

## Evidence Snapshot

Commands run on 2026-05-25:

- `pnpm planning:db:query next`
- `pnpm planning:db:query task-gaps --limit 500`
- `pnpm planning:db:query knowledge-actions --status proposed --limit 5000`
- risk-register scan over tracked `docs/risk-register` files
- review board inspection of
  `docs/planning/reviews/review-status-board.md`

Observed counts:

| Surface                                | Count | Meaning                                                                                                                  |
| -------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------ |
| `next` rows                            |     4 | Two claim-recovery frontend disposition tasks and two queued proposal-disposition tasks.                                 |
| `task-gaps` rows                       |     6 | Active review or mandatory proposal documents without registered task linkage.                                           |
| proposed knowledge actions             |  1320 | Action-level intake rows not yet resolved as task-linked, closed, superseded, reference-only, risk-tracked, or non-goal. |
| source documents with proposed actions |   335 | Breadth of the unreconciled document backlog.                                                                            |
| open risk-register entries             |   136 | Risks still needing mitigation, acceptance, closure, or explicit linkage.                                                |
| high-severity open risks               |     8 | Highest technical/delivery risk band found in the tracked risk register.                                                 |

## Current Operational Queue

`pnpm planning:db:query next` currently reports:

| Kind           | Lane | Task                  | Priority | State       | Disposition                                                                                            |
| -------------- | ---- | --------------------- | -------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| claim recovery | E    | `F-29`                | P0       | review      | Canvas workbench mandatory proposal actions still need classification.                                 |
| claim recovery | E    | `F-30`                | P1       | in_progress | Code, Artifacts, Monaco, templates, and execution-template proposal actions still need classification. |
| next           | D    | `GOV-PROP-DISP-1`     | P1       | queued      | Governance-and-docs mandatory proposal actions need disposition.                                       |
| next           | A    | `RUNTIME-PROP-DISP-1` | P1       | queued      | Runtime-and-contracts mandatory proposal actions need disposition.                                     |

This is the executable queue, not the full backlog. It is correct but
insufficient for prioritization because it only shows work already normalized
into Planning DB rows.

## Explicit Task Gaps

`pnpm planning:db:query task-gaps --limit 500` reports these P1 gaps:

| Document                                                                                                  | Gap                                   | Recommended disposition                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/planning/reviews/architecture-and-governance/20260402-deep-architectural-review.md`                 | Active review without task link.      | Reconcile through a review/risk intake task; do not turn every paragraph into implementation work until the linked AR task family and evidence are checked.               |
| `docs/planning/reviews/sprints/index.md`                                                                  | Active review without task link.      | Treat as sprint-intake navigation, not product implementation. Link to the review/risk intake task or mark reference-only if no executable work exists.                   |
| `docs/planning/proposals/mandatory/frontend-and-ux/dvt-workbench-ux-specification-v0-4-20260505-draft.md` | Mandatory proposal without task link. | Link into `F-29`/`F-30` where it covers Canvas, Code, Artifacts, and workbench promise. Create a focused successor only for remaining product gaps after evidence review. |
| `docs/planning/proposals/mandatory/governance-and-docs/autogenerated-pages-extraction-plan-20260403.md`   | Mandatory proposal without task link. | Route under `GOV-PROP-DISP-1`; classify as task-linked, closed-by-evidence, superseded, reference-only, risk-tracked, or non-goal.                                        |
| `docs/planning/proposals/mandatory/governance-and-docs/documentation-usability-change-plan-20260308.md`   | Mandatory proposal without task link. | Route under `GOV-PROP-DISP-1`; separate user-facing docs usability work from governance generator work.                                                                   |
| `docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-router-plan-20260402.md`   | Mandatory proposal without task link. | Compare against `governance-startup-card-canon-plan-20260524.md`; likely superseded or partially linked to the startup-card canon task.                                   |

## Proposed Knowledge Action Distribution

The proposed knowledge-action inventory is too large to prioritize one row at a
time. It should be reconciled by document family and product intent.

| Domain                                            | Proposed action rows |
| ------------------------------------------------- | -------------------: |
| governance/docs                                   |                  342 |
| reviews                                           |                  281 |
| frontend/product                                  |                  262 |
| runtime/contracts                                 |                  151 |
| risk register                                     |                   12 |
| other intake, including `buzon` and evidence docs |                  272 |

Largest unreconciled sources:

| Rows | Source                                                                  | Likely owner                                                      |
| ---: | ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
|   52 | `planning-state-query-store-plan-20260506.md`                           | `GOV-PROP-DISP-1`                                                 |
|   35 | `ci-scope-optimization-plan-20260508.md`                                | `GOV-PROP-DISP-1`                                                 |
|   31 | `component-engineering-composite-hierarchy-plan-20260513.md`            | `GOV-PROP-DISP-1`                                                 |
|   30 | `planning-knowledge-rail-db-first-plan-20260513.md`                     | `GOV-PROP-DISP-1`                                                 |
|   28 | `20260422-dvt-plus-principal-architect-action-plan.md`                  | review/risk intake                                                |
|   28 | `20260501-tf-e2-m-c-fowler-hard-qa-review.md`                           | `F-29`                                                            |
|   27 | `f04-frontend-data-boundary-hexagonal-convergence-plan-20260403.md`     | frontend disposition, mostly historical unless still user-visible |
|   26 | `run-events-hash-partitioning-plan-20260513.md`                         | `RUNTIME-PROP-DISP-1` or Lane D scale follow-up                   |
|   24 | `web-auth-project-onboarding-and-actionable-gaps-20260501.md`           | frontend/API boundary disposition                                 |
|   24 | `repository-command-catalog-normalization-plan-20260508.md`             | `GOV-PROP-DISP-1`                                                 |
|   20 | `create-governance-component-command-rail-design-20260514.md`           | `GOV-PROP-DISP-1`                                                 |
|   18 | `db-first-architecture-authority-plan-20260515.md`                      | `GOV-PROP-DISP-1`                                                 |
|   17 | `doc-driven-framework-and-tooling-plan-20260404.md`                     | `GOV-PROP-DISP-1`                                                 |
|   16 | `tf-e2-m-b-canvas-draft-denial-posture-implementation-plan-20260501.md` | `F-29`                                                            |

## Risk Register Findings

The tracked risk register has 136 open entries. The open risk distribution is:

| Severity / probability    | Count |
| ------------------------- | ----: |
| High / Medium             |     8 |
| Medium / Medium           |    47 |
| Medium / Low              |    34 |
| Low / Medium              |    13 |
| Low / Low                 |    32 |
| Low / High                |     1 |
| Unspecified / Unspecified |     1 |

High-severity open risks are concentrated in golden-path coverage, G5
correctness and operability, AR-C2 operability evidence, policy precedence,
plan-store shape drift, Temporal PlanRef contract drift, and production tenant
isolation baseline. These should not automatically become the next product
tasks; they need acceptance, closure evidence, or explicit mitigation tasks.

## Reconciliation Route

The next route should be:

1. Close the six `task-gaps` first because they are already flagged by the
   planning DB as documents with missing governed linkage.
2. Continue `F-29` and `F-30` as the frontend/product reconciliation path,
   using browser/user proof for the product promise before creating new UI work.
3. Start `GOV-PROP-DISP-1` to classify the governance/docs proposal backlog by
   document family instead of creating hundreds of one-off tasks.
4. Start `RUNTIME-PROP-DISP-1` only after the governance/docs and frontend
   product promise route is stable enough to avoid mixing runtime hardening
   with product-readiness triage.
5. Create or claim one explicit review/risk intake task for active reviews and
   open risks that are not covered by existing proposal-disposition tasks.

## Product Implication

For getting closer to product, the highest-signal work is still not another
feature slice. It is making the current promise auditable:

- Canvas should show a coherent workflow.
- Code and Artifacts should expose project files and workflow-generated
  artifacts without fabricated rows.
- read-only or capability-limited contexts should explain what is unavailable
  without adding duplicate bars, duplicate controls, or hidden mutation paths.
- every remaining action should be either linked to a Planning DB task or
  explicitly dispositioned as closed, superseded, reference-only, risk-tracked,
  or non-goal.

## Recommendation

The next task should be a reconciliation task, not a product feature task:

`GOV-REVIEW-RISK-INTAKE-1`: classify active reviews, sprint-board intake, and
open risk-register entries into task-linked, closed-by-evidence, superseded,
reference-only, accepted-risk, mitigation-task, or non-goal dispositions.

That task should run alongside the existing `F-29`, `F-30`,
`GOV-PROP-DISP-1`, and `RUNTIME-PROP-DISP-1` queues instead of replacing them.
