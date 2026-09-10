---
title: AI Work Protocol
status: Active
owner: docs
last_reviewed: 2026-09-09
---

# AI Work Protocol

This document defines the repository procedure for AI-assisted work. `AGENTS.md`
contains the general behavioral mandate. This guide routes work through the
current authorities without creating a second task, architecture, or validation
system.

## Canonical Authorities

- [AGENTS.md](../../AGENTS.md): mandatory agent behavior and repository-wide
  working rules.
- [Governance Document And Rule Inventory](../planning/status/governance-document-rule-inventory.md):
  startup router and classification of active governance surfaces.
- [ADR-0061](../adr/ADR-0061-github-mvp-task-authority-and-planning-db-architecture-boundary.md):
  authority boundary between GitHub Issues and Planning DB.
- [Command And Query Rail Governance](../architecture/command-query-rail-governance.md):
  externally observable behavior and command/query ownership.
- [Fowler Opportunity Planning Governance](../architecture/fowler-opportunity-planning-governance.md):
  design analysis for non-trivial behavioral or architectural changes.
- [Testing And CI Capabilities](./testing-and-ci-capabilities.md) and
  [PR Preflight And CI Triage](./pr-preflight-and-ci-triage.md): validation and
  delivery procedures.

No planning dashboard, local workboard, lane file, closeout file, or generated
planning view is a task authority.

## Authority Boundary

| Concern                                                                            | Canonical authority                      |
| ---------------------------------------------------------------------------------- | ---------------------------------------- |
| task identity, priority, assignment, status, blockers, acceptance, closure         | GitHub Issues                            |
| implementation review, discussion, checks, merge                                   | GitHub pull requests                     |
| components, capabilities, relations, ownership                                     | Planning DB                              |
| command/query rails, ports, adapters, feature mechanization, architecture evidence | Planning DB                              |
| executable product truth                                                           | code, contracts, tests, and CI on `main` |
| durable architectural decisions                                                    | accepted ADRs and governed contracts     |

Planning DB MUST NOT be used as a task tracker. GitHub issue state MUST NOT be
projected from Planning DB.

## Startup

1. Read `docs/planning/status/governance-document-rule-inventory.md`.
2. Confirm the governing GitHub issue is open and matches the requested intent.
3. Check for overlapping active work or PRs on the same slice.
4. For architecture or design work, query the existing Planning DB authority as
   required by `AGENTS.md`; do not import or rebuild it as a consultation side
   effect.
5. Open only the ADRs, contracts, guides, and status surfaces required by the
   routed task.

If a required authority is unavailable or contradictory, stop the affected
slice and report the missing evidence instead of inventing a fallback authority.

## Work Admission And Journal

Implementation, refactor, fix, governance change, or product-documentation work
requires one open governing GitHub issue.

Before editing:

- confirm the issue scope and acceptance criteria;
- record the active branch/slice in the issue when repository permissions allow;
- do not take over work owned by another active implementation without
  reconciling the overlap.

The issue is the human-facing chronological journal. Record meaningful changes,
new blockers, changed acceptance criteria, and validation evidence there. Do not
create a parallel task journal in repository files.

## Planning And Architecture Updates

For task lifecycle changes, update GitHub only.

For architecture or mechanization changes, update Planning DB through the
existing command/query rails before implementation when the governing rule
requires it. This includes changes to components, capabilities, relations,
ownership, commands, queries, ports, adapters, feature mechanization, or governed
architecture evidence.

Update repository documentation only when the shipped behavior, architecture,
contract, runbook, roadmap, or durable decision itself changed. A task-status
change alone is not a reason to create or update a planning document.

## Think First

Before a non-trivial behavioral or architectural change:

1. identify the root cause and governing invariant;
2. inspect existing implementations, rails, contracts, and accepted decisions;
3. identify duplication, boundary drift, ownership ambiguity, or other relevant
   Fowler/DDD opportunities;
4. compare viable options and choose the smallest solution that preserves the
   authority model;
5. define allowed implementation surfaces, negative paths, and validation before
   coding.

The governing GitHub issue is the default location for task-specific analysis and
acceptance evolution. Create a durable proposal, ADR, evidence document, or
mechanization artifact only when an existing repository rule requires that
artifact for the type of change.

## Command And Query Preflight

Before creating externally observable behavior, identify the existing command or
query rail in the owning bounded context. Reuse an existing rail when the intent
already exists. If a new rail is genuinely required, register it through the
Planning DB authority before implementation according to the command/query
governance rule.

Do not create local synonyms, duplicate services, route-specific semantics, or
parallel documentation names for the same product intent.

## Feature Mechanization

When the repository's mechanization gate applies, declare and validate the
feature through the existing mechanization workflow before production code
changes. Do not use a late manifest as retroactive proof that the required order
was followed.

Mechanization evidence belongs to the existing governed surfaces and Planning DB;
it is not a substitute for GitHub issue lifecycle.

## Validation And Delivery

Validate the smallest affected scope first, then the repository gates required by
the changed surfaces.

Minimum closeout expectations for an implementation slice:

- affected tests, lint, typecheck, and build checks are green as applicable;
- negative paths are covered when behavior changed;
- generated/governance surfaces are refreshed only when their owning inputs
  changed;
- links and references resolve;
- `pnpm verify:prepush` is green before the slice is presented as ready unless
  the user explicitly limits validation and that limitation is reported;
- the governing issue records the actual validation evidence and remaining
  limitations.

Use [PR Preflight And CI Triage](./pr-preflight-and-ci-triage.md) for PR creation
and red-CI recovery.

## Governance Refresh

Run `pnpm governance:refresh` before final docs/prepush validation when the slice
changes governance sources, governance tooling, generated governance inputs,
relevant package scripts, or tracked inventory that feeds `system-governance-*`
surfaces.

`governance:refresh` derives governed repository views from Git state. It MUST NOT
be treated as a routine Planning DB import/rebuild or task-status projection.

## Historical Material

Archived proposals, reviews, closeouts, and historical evidence may describe
retired workflows. Preserve them when they truthfully record their baseline, but
do not route active work through them and do not treat their obsolete links or
terminology as current governance.
