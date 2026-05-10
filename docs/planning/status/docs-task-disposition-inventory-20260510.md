---
title: Docs Task Disposition Inventory 2026-05-10
status: Review
owner: Architecture / Docs
last_reviewed: 2026-05-10
planning_type: status
---

# Docs Task Disposition Inventory 2026-05-10

This is a non-normative status snapshot. It records a first-pass inventory of
active documentation, planning task state, and task-like references after the
planning database became the canonical local operational source.

It does not replace canonical governance documents, ADRs, lane YAML, the
planning database, generated planning views, or CI rules. It must not become a
parallel workboard.

## Governing Sources

- [Governance Document And Rule Inventory](./governance-document-rule-inventory.md)
- [DVT Docs Structure](../../DOCS_README.md)
- [AI Work Protocol](../../guides/ai-work-protocol.md)
- [Planning Control Tower](../state/planning-control-tower.md)
- [Docs Staleness Audit 2026-05-05](./docs-staleness-audit-20260505.md)
- [ADR-0055 - Planning DB canonical operational source](../../adr/adr-0055-planning-db-canonical-operational-source.md)

## Inventory Scope

The inventory used tracked repository files and the planning DB query surface.
It intentionally ignored untracked local artifacts and local database data.

The scan focused on:

- tracked Markdown files under `docs/`;
- active documents outside archive folders;
- lane YAML task definitions;
- planning DB effective task state;
- generated governance coverage and remediation summaries;
- task-like identifiers in active planning, review, status, gap, and
  architecture documents.

## Canonical Planning State

The planning task registry is internally coherent. The first remediation pass
should therefore avoid editing lanes unless a specific stale document is proven
to describe real work that is missing from the registry.

| Source                         | Observation                                         |
| ------------------------------ | --------------------------------------------------- |
| Planning source authority      | `database`                                          |
| Lanes                          | 5                                                   |
| Tasks                          | 336                                                 |
| Task dependencies              | 329                                                 |
| Task evidence references       | 1754                                                |
| Task status events             | 338                                                 |
| Local task overlays            | 3                                                   |
| Lane YAML vs planning DB drift | 0 missing tasks, 0 extra tasks, 0 status mismatches |

Task status distribution at scan time:

| Status        | Count |
| ------------- | ----- |
| `done`        | 250   |
| `in_progress` | 34    |
| `queued`      | 33    |
| `review`      | 10    |
| `blocked`     | 9     |

## Documentation Corpus

| Bucket                                          | Count |
| ----------------------------------------------- | ----- |
| Tracked docs Markdown                           | 1525  |
| Active docs Markdown                            | 1269  |
| Archived docs Markdown                          | 256   |
| Active docs missing explicit frontmatter status | 277   |
| Active docs marked `Draft`                      | 92    |
| Active docs marked `Superseded`                 | 8     |
| Active docs with pending-style markers          | 729   |
| Pending-style marker occurrences                | 3236  |

The pending-style marker scan counted terms such as `pending`, `remaining`,
`debt`, `gap`, `follow-up`, `followup`, `not implemented`, `todo`,
`next step`, `tbd`, and `open question`. These are triage signals only; they
are not proof that a task is still open.

## Generated Governance State

The generated governance model is coherent at the file coverage level.

| Area                             | Observation |
| -------------------------------- | ----------- |
| Governed files                   | 4304        |
| Drift files                      | 0           |
| Legacy files                     | 0           |
| Components                       | 32          |
| Components requiring subdivision | 19          |
| Governance remediation tasks     | 40          |
| P0 remediation tasks             | 0           |

The remediation queue already contains real governance work. The current docs
cleanup should not create duplicate tasks for those items. It should instead
use the queue as the source for component subdivision, command/query rail
alignment, and generated-doc alignment follow-up.

## High-Confidence Cleanup Candidates

These candidates are structural and can be remediated in focused docs PRs after
backlink checks and docs validation.

### Legacy Review Namespace

Five active files still live under `docs/reviews/` instead of the current
planning review or archive surfaces:

- `docs/reviews/DVT+_Architectural_Review_20260319.md`
- `docs/reviews/architectural-review-dvtplus-2026-03-24.md`
- `docs/reviews/dvt-top3-gaps-roadmap-20260319.md`
- `docs/reviews/dvt_planner_technical_vision.md`
- `docs/reviews/prioritized-gaps-20260319.md`

Disposition rule: move to the current planning review namespace only if the
file is still an active review; otherwise move to archive and preserve or update
inbound links.

### Superseded Documents Outside Superseded Or Archive Areas

The following active files are marked `Superseded` outside a clearly historical
location:

- `docs/adr/ADR-0016-logicalAttemptId-adapter-ownership.md`
- `docs/planning/closeouts/20260331-zensical-primary-docs-runtime-closeout.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/ar-c6-cancel-lifecycle-ownership-truth-sync-plan-20260410.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/planner-generic-ingress-compatibility-slice-20260410.md`

Disposition rule: do not mechanically archive ADRs or closeouts. For mandatory
proposals, prefer the existing `docs/planning/proposals/superseded/` structure
after link checks. For ADRs, follow ADR index and supersession rules.

### Draft Closeouts

Five closeout files are active and marked `Draft`:

- `docs/planning/closeouts/20260404-f04-w4-decomposition-manifest.md`
- `docs/planning/closeouts/20260404-plan-qa-tareas-mvp.md`
- `docs/planning/closeouts/20260429-we-hx-1-boundary-ownership-closeout.md`
- `docs/planning/closeouts/20260430-ar-d-continuation-safety-closeout.md`
- `docs/planning/closeouts/20260430-we-hx-2-facade-use-cases-closeout.md`

Disposition rule: compare each file against planning DB task status and
evidence references. Promote to final status only when the referenced task is
closed and the closeout has validation evidence; otherwise keep it as an active
review item rather than silently marking it done.

### Generated Index Review Dates

Several generated index files still carry old `last_reviewed` dates. These
must be refreshed through canonical generators, not hand-edited.

Disposition rule: run the canonical docs sync or governance refresh command
for the affected generator surface and commit the generated result with the
source change that made the refresh necessary.

## Task-Like Identifier Reconciliation

The active documentation contains many identifiers that look like task IDs.
This is expected because the repository also uses identifiers for command/query
rails, user stories, security invariants, risk IDs, evidence IDs, ADRs, and
historical gap programs.

First-pass classifier result:

| Category                                                                                             | Count |
| ---------------------------------------------------------------------------------------------------- | ----- |
| Registered planning task IDs referenced by active docs                                               | 277   |
| Task-like IDs in active docs that are not planning task IDs                                          | 1050  |
| Task-like IDs in focused planning/review/status/gap/architecture docs that are not planning task IDs | 840   |

High-frequency non-registered prefixes include `US`, `INV`, `S08`, `AR`,
`TF`, `CDG`, `ISOL`, `QA`, `MW`, `MVP`, `REF`, `F03`, `F04`, `PS`, `SPR`,
and `WEB`.

These should be reconciled by class, not bulk-converted to tasks:

| Class                  | Disposition                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Command/query rail IDs | Keep in rail catalogs and architecture docs; do not duplicate as planning tasks.                                                          |
| User story IDs         | Keep with the owning component or product spec; link to a planning task only when they represent active delivery work.                    |
| Historical gap IDs     | Keep only where the active document explicitly points to historical closure evidence; otherwise archive or rewrite as historical context. |
| Security invariant IDs | Keep with security policy and threat model surfaces.                                                                                      |
| Review finding IDs     | Convert to planning DB tasks only when they are still active and owner-approved.                                                          |

## Recommended Remediation Sequence

1. Create a focused docs-structure cleanup PR for the legacy review namespace,
   superseded mandatory proposals, and draft closeout classification. This PR
   should run backlink checks, `pnpm docs:sync`, and `pnpm verify:prepush`.
2. Create a task-reference reconciliation PR that classifies non-registered
   task-like IDs by class and records an explicit allowlist or generated report.
   This PR should avoid adding lane tasks until a stale reference is proven to
   represent active work.
3. Add or extend a governance check that warns when active docs introduce
   task-like IDs that are neither planning task IDs nor approved non-task
   identifier classes.
4. Tackle generated governance remediation tasks from the planning DB queue in
   priority order instead of copying them into this status document.

## Non-Goals

- Do not edit `execution-workboard.md` or `open-task-route.md` directly.
- Do not use this inventory as a replacement for planning DB queries.
- Do not batch-promote `Draft` documents without owner and evidence checks.
- Do not archive ADRs, closeouts, or evidence files without updating their
  canonical indexes and inbound links.
- Do not create duplicate tasks for existing generated governance remediation
  queue items.

## Commands Used

- `pnpm planning:db:query summary`
- `pnpm planning:db:query next`
- `pnpm planning:db:query remediation --limit 50`
- `pnpm planning:db:query coverage --kind total --limit 50`
- `pnpm planning:db:query tasks --limit 500`
- `git ls-files -- docs/*.md docs/**/*.md`
- `git ls-files -- docs/reviews/*.md docs/reviews/**/*.md`
- `rg` scans for active `Draft`, `Superseded`, historical gap, and
  pending-style markers
- Node-based comparison of lane YAML task IDs against task-like identifiers in
  active documentation
