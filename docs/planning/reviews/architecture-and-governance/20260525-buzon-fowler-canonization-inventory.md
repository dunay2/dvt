---
title: Buzon Fowler Canonization Inventory
status: Review
owner: Product / Architecture / Docs
last_reviewed: 2026-05-25
planning_type: review
---

# Buzon Fowler Canonization Inventory

## Purpose

This review formalizes the `buzon/` Fowler-analysis backlog as governed
planning intake. `buzon/` is not an execution queue. Each analysis must be
canonized into formal documentation, linked to an existing Planning DB task,
converted into a new task for remaining debt, or explicitly dispositioned as
closed, superseded, reference-only, risk-tracked, accepted-risk, or non-goal.

## Governing Sources

- [Governance document and rule inventory](../../status/governance-document-rule-inventory.md)
- [Planning control tower](../../state/planning-control-tower.md)
- [Review status board](../review-status-board.md)
- [Backlog intake reconciliation review](./20260525-backlog-intake-reconciliation-review.md)
- [Command and query rail governance](../../../architecture/command-query-rail-governance.md)
- [Fowler opportunity planning governance](../../../architecture/fowler-opportunity-planning-governance.md)

## Inventory Snapshot

Command run on 2026-05-25:

- `git ls-files buzon/*.md`

The tracked `buzon/` set contains 133 Markdown analyses.

| Bucket                                                 | Count | Owning task                                               |
| ------------------------------------------------------ | ----: | --------------------------------------------------------- |
| Frontend and product workbench                         |    50 | `E-BUZON-FOWLER-CANON-1`                                  |
| Runtime, API, Temporal, admission, and operability     |    46 | `C-BUZON-FOWLER-CANON-1`                                  |
| Architecture, contracts, planner, DDD, and state-store |    10 | `A-BUZON-FOWLER-CANON-1`                                  |
| Governance, docs, CI, planning, and DB-first workflows |    10 | `D-BUZON-GOV-CANON-1`                                     |
| Mixed or cross-domain                                  |    17 | `GOV-REVIEW-RISK-INTAKE-1` first, then owning-domain task |

## Created Planning Tasks

| Task                           | Lane | Purpose                                                                                                                         |
| ------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------- |
| `GOV-REVIEW-RISK-INTAKE-1`     | D    | Classify active reviews, sprint-board intake, open risks, and mailbox analyses into explicit dispositions.                      |
| `E-BUZON-FOWLER-CANON-1`       | E    | Canonize frontend and workbench Fowler analyses from `buzon/`.                                                                  |
| `C-BUZON-FOWLER-CANON-1`       | C    | Canonize runtime, API, Temporal, admission, and operability analyses from `buzon/`.                                             |
| `A-BUZON-FOWLER-CANON-1`       | A    | Canonize architecture, contracts, planner, DDD, and state-store analyses from `buzon/`.                                         |
| `D-BUZON-GOV-CANON-1`          | D    | Canonize governance, docs, CI, planning, and DB-first analyses from `buzon/`.                                                   |
| `D-RISK-DEBT-CANON-1`          | D    | Reconcile open risk-register debt and proposed risk actions into explicit dispositions.                                         |
| `D-MAND-PROP-GAP-INTAKE-1`     | D    | Reconcile `mandatory-proposal-gaps` rows into domain-owned tasks or explicit non-task dispositions.                             |
| `E-PROP-DISP-1`                | E    | Classify remaining frontend mandatory proposal action gaps outside the current `F-29`/`F-30` scope.                             |
| `D-DOCS-DISPOSITION-QUEUE-1`   | D    | Resolve the open `docs-disposition` queue for unknown IDs, Draft active docs, missing frontmatter, and pending-marker hotspots. |
| `D-KNOWLEDGE-ACTION-LINKAGE-1` | D    | Reduce unlinked proposed knowledge-action rows across active docs, reviews, `buzon/`, and risk entries.                         |

## Execution Updates

- 2026-05-25, `E-BUZON-FOWLER-CANON-1`:
  [Frontend Buzon Fowler Canonization Review](./20260525-frontend-buzon-fowler-canonization-review.md)
  records formal Lane E mailbox dispositions. Remaining executable product debt
  stays in existing tasks `F-08`, `F-11`, and `E-PROP-DISP-1`; no duplicate
  frontend task was created.
- 2026-05-25, `A-BUZON-FOWLER-CANON-1`:
  [Architecture Buzon Fowler Canonization Review](./20260525-architecture-buzon-fowler-canonization-review.md)
  records formal Lane A architecture, contracts, planner, state-store, DDD, and
  hexagonal mailbox dispositions. Remaining provider-registry debt is restored
  as blocked task `EA-20260429-04`.

## Zero-Reference Priority Set

The following tracked analyses had zero direct `docs/**` references at the time
of this review. They are not automatically unowned; they are the first files to
inspect when executing the canonization tasks.

| Bucket       | Source                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------- |
| Frontend     | `buzon/20260429-codex-fowler-temporal-step-plugin-architecture-analysis-and-remediation.md`  |
| Frontend     | `buzon/20260430-codex-fowler-canvas-ready-node-authoring-analysis.md`                        |
| Frontend     | `buzon/20260430-codex-frontend-operability-fowler-review.md`                                 |
| Frontend     | `buzon/20260510-codex-fowler-web-api-mock-hardcut-semantic-encapsulation-analysis.md`        |
| Frontend     | `buzon/20260516-codex-fowler-canvas-screen-problems-architecture-analysis.md`                |
| Frontend     | `buzon/20260516-codex-fowler-element-canvas-empty-state-placement.md`                        |
| Frontend     | `buzon/20260516-codex-fowler-element-canvas-route-shell-posture.md`                          |
| Frontend     | `buzon/20260516-codex-fowler-element-canvas-topbar-command-priority.md`                      |
| Frontend     | `buzon/20260516-codex-fowler-element-readonly-first-canvas-policy.md`                        |
| Frontend     | `buzon/20260518-codex-fowler-f27-alpha-route-gate-branch-analysis.md`                        |
| Frontend     | `buzon/20260518-f10-fowler-run-event-convergence-analysis.md`                                |
| Runtime      | `buzon/20260422-codex-fowler-apps-api-runtime-composition-analysis-and-remediation.md`       |
| Runtime      | `buzon/20260422-codex-fowler-start-run-application-component-analysis-and-remediation.md`    |
| Runtime      | `buzon/20260422-codex-fowler-start-run-boundary-and-admission-analysis.md`                   |
| Runtime      | `buzon/20260513-codex-fowler-runtime-root-subdivision-analysis-and-remediation.md`           |
| Runtime      | `buzon/20260514-codex-fowler-ar-c2-t2-dashboard-evidence-analysis.md`                        |
| Runtime      | `buzon/20260514-codex-fowler-ar-c2-t3-alert-evidence-analysis.md`                            |
| Runtime      | `buzon/20260514-codex-fowler-dhm-db-first-engine-component-analysis.md`                      |
| Runtime      | `buzon/20260514-codex-fowler-dhm-effective-component-ownership-analysis.md`                  |
| Runtime      | `buzon/20260518-dhm-ws4-fowler-runtime-path-boundary-hardening-analysis.md`                  |
| Runtime      | `buzon/20260523-codex-fowler-postgres-tenant-isolation-canon.md`                             |
| Architecture | `buzon/20260429-codex-fowler-branch-architecture-post-codescene-analysis-and-remediation.md` |
| Architecture | `buzon/20260515-codex-fowler-ar-d-plan-pointer-architecture-authority-analysis.md`           |
| Architecture | `buzon/20260523-codex-fowler-planner-ingress-hard-cut-canon.md`                              |
| Mixed        | `buzon/20260514-codex-fowler-ea-20260429-06-semantic-fitness-analysis.md`                    |

## Disposition Rules

Use this decision order for every `buzon/` analysis:

1. If a formal proposal, component guide, user story, closeout, risk entry, or
   accepted review already owns the finding, link the analysis to that surface
   and mark the mailbox item reference-only or closed-by-evidence.
2. If the analysis describes current product or architecture debt with no
   owner, create or update a Planning DB task in the owning lane.
3. If the analysis is obsolete, record the superseding surface and classify it
   as superseded.
4. If the analysis names risk without executable mitigation, link it to
   `D-RISK-DEBT-CANON-1` for accepted-risk or mitigation-task disposition.
5. If the analysis is useful rationale but not executable work, classify it as
   reference-only.

## Next Iteration

The next unattended sweep should use the DB-first retirement query before
reading raw files:

```bash
pnpm planning:db:query knowledge-intake --state unclassified --limit 30
pnpm planning:db:query knowledge-intake --state open-actions --limit 30
pnpm planning:db:query knowledge-intake --state referenced --limit 30
```

Process the unclassified set first, then intake with proposed knowledge actions.
Each sweep should reduce one of these counts:

- zero-reference `buzon/` analyses;
- proposed knowledge-action rows with no target link;
- open task gaps;
- open risk entries with actionable mitigation prose but no task linkage.
