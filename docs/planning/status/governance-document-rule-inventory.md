---
title: Governance Document And Rule Inventory
status: Active
owner: Architecture / Docs
last_reviewed: 2026-09-09
planning_type: status
---

# Governance Document And Rule Inventory

This document is the startup router for repository governance. It identifies the
active authorities to consult before work starts and distinguishes them from
status, evidence, and historical material.

It is an inventory, not a second policy engine. When a rule conflicts with an
accepted ADR, contract, executable policy, or `AGENTS.md`, the more specific
canonical authority wins and the drift must be corrected here.

## Quick Start / Startup Card

| Task type | Open next | Additional authority when needed | Minimum closeout baseline |
| --- | --- | --- | --- |
| `code` | `docs/guides/ai-work-protocol.md` | relevant ADR/contract + Planning DB for architecture/design | touched-package validation + `pnpm verify:prepush` |
| `docs` | `docs/index.md` + `docs/guides/ai-work-protocol.md` | governing ADR/contract when documentation is normative | `pnpm docs:sync` when structure changes + `pnpm verify:prepush` |
| `planning` | governing GitHub Issue | roadmap/status docs only when their durable content changes | issue/PR evidence + `pnpm verify:prepush` when repo files change |
| `contracts` | `docs/contracts/index.md` | relevant ADRs + contract/versioning policy | contract/package validation + `pnpm verify:prepush` |
| `ci` | `package.json` + affected workflows/guides | executable policy/configuration | relevant CI/tool validation + `pnpm verify:prepush` |
| `cross-cutting` | combine the routes above | all affected canonical authorities | per-slice validation + `pnpm verify:prepush` |

For architecture or design consultation, follow `AGENTS.md`: query the existing
Planning DB authority and use the returned identities/evidence paths. Do not
import or rebuild Planning DB as a routine consultation step.

## Authority Model

[ADR-0061](../../adr/ADR-0061-github-mvp-task-authority-and-planning-db-architecture-boundary.md)
defines the active planning boundary:

| Concern | Canonical authority |
| --- | --- |
| task identity, priority, assignment, status, blockers, acceptance, closure | GitHub Issues |
| implementation review, checks, merge | GitHub pull requests |
| components, capabilities, relations, ownership | Planning DB |
| commands, queries, ports, adapters, feature mechanization, architecture evidence | Planning DB |
| executable product truth | code, contracts, tests, and CI on `main` |
| durable architecture decisions | accepted ADRs and governed contracts |

There is no intermediate planning authority. Local lane files, workboards,
open-task routes, task rows in Planning DB, and DB-to-GitHub task projections
are retired and MUST NOT be recreated.

## Governance Layers

| Layer | Purpose | Primary sources |
| --- | --- | --- |
| `normative` | accepted decisions, invariants, contracts | `docs/adr/**`, `docs/contracts/**`, normative component contracts |
| `architectural` | system boundaries, ownership, behavior structure | Planning DB + architecture docs + command/query governance |
| `operational` | how contributors and agents work | `AGENTS.md`, `docs/guides/ai-work-protocol.md`, CI/preflight guides |
| `enforcement` | machine-enforced rules | `.arc-policy.yaml`, package scripts, hooks, workflows, CODEOWNERS |
| `status` | what is true now | code/test/CI state, system delivery status, canonical doc-code matrix |
| `risk/evidence` | residual risk and proof | `docs/risk-register/**`, `docs/evidence/**`, runbooks |
| `historical` | prior decisions/workflows | archives, historical reviews, closeouts, superseded proposals |

Historical material may accurately mention retired workflows. It is not an active
startup or work-routing source unless a current authority explicitly promotes a
specific historical fact.

## Canonical Entry Points

- [AGENTS.md](../../../AGENTS.md) — mandatory repository startup and working
  rules for agents.
- [AI Work Protocol](../../guides/ai-work-protocol.md) — procedural flow after
  startup.
- [Documentation Home](../../index.md) — documentation navigation by intent.
- [Architecture Index](../../architecture/index.md) — architecture navigation;
  Planning DB remains the authority for architecture/design consultation.
- [GitHub MVP Issue Workflow](../state/github-mvp-issue-workflow.md) — delivery
  lifecycle procedure for the MVP.
- [Roadmap Of Record](../roadmap/index.md) — durable product sequencing and
  roadmap classification, not task status.
- [System Delivery Status](../../architecture/system-delivery-status.md) —
  current implementation status, not a behavioral specification.
- [Command And Query Rail Governance](../../architecture/command-query-rail-governance.md)
  — externally observable behavior ownership.
- [Fowler Opportunity Planning Governance](../../architecture/fowler-opportunity-planning-governance.md)
  — non-trivial design analysis and allowed implementation surfaces.

## Executable Policy Wins Over Duplicated Prose

When an executable policy already owns a rule, documentation should explain how
to use it rather than duplicate its complete decision table.

Examples:

- ARC classification and requirements: `.arc-policy.yaml` and
  `tools/ci/arc-check.mjs`.
- commit format: repository commit helper and hooks.
- docs/governance generation: package scripts and their implementation.
- CI routing: `.github/workflows/**` and invoked scripts.

A prose rule that disagrees with the executable owner is drift and must not be
used to bypass the executable result.

## Planning And Architecture Rules

1. A task starts and evolves in one governing GitHub issue.
2. A PR owns review/integration of a concrete implementation branch.
3. Planning DB changes only when architecture or mechanization changes.
4. Task lifecycle is never inferred from Planning DB.
5. Repository planning documents are updated only when their durable product,
   architecture, roadmap, or governance content changes.
6. No task-specific closeout file is required merely to report progress already
   recorded in the issue. Evidence/ADR/mechanization artifacts remain mandatory
   when their owning policy requires them.

## Governance Refresh

`pnpm governance:refresh` refreshes governed repository-derived surfaces from the
current Git inventory. It is not a routine Planning DB import/rebuild and it does
not own task lifecycle.

Run it before final docs/prepush validation when changed inputs affect governance
indexes, generated governance surfaces, or the tooling that produces them.

## Historical Material Rule

Do not rewrite archived evidence or historical closeouts merely because their
workflow is obsolete. Preserve factual history. Active guides, entrypoints,
status routers, and current roadmaps must not direct new work through retired
mechanisms.

## Maintenance Rule

Update this inventory when any of these change:

- task/architecture authority boundaries;
- canonical startup entrypoints;
- executable governance owners;
- active documentation routing;
- a previously active workflow is hard-cut or superseded.

Do not add a new planning hub, control tower, workboard, or authority index to
compensate for removing an obsolete one.
