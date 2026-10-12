---
title: Docs Disposition Canon User Stories
status: Active
owner: Architecture / Docs / Planning
last_reviewed: 2026-05-24
component_type: governance
---

# Docs Disposition Canon User Stories

## Documentation Maintainer

As a Documentation maintainer, I need Draft and Superseded findings to route
through Planning DB disposition state so that I do not move ADRs, closeouts, or
evidence documents based only on frontmatter labels.

Acceptance:

- Draft closeouts show linked disposition unless owner/evidence review reopens
  the action.
- Obsolete proposals are retired only by focused follow-up with owner and
  backlink evidence. Their history remains in Git.
- The Planning DB query reports the closure posture, not a dated inventory.

## Planning Steward

As a Planning steward, I need docs disposition actions to be open, linked,
ignored, or follow-up-owned in one query rail so that status prose cannot become
a second workboard.

Acceptance:

- `planning:db:query docs-disposition --resolution open` is the open-work
  source.
- `GD-DOC-DISPOSITION-CANON` records semantic closure instead of creating
  duplicate child tasks.
- New findings are reopened through Planning DB.

## Architecture Reviewer

As an Architecture reviewer, I need task-like identifiers to be classified by
semantic family so that rails, user stories, invariants, ADRs, and risk IDs are
not mistaken for missing planning tasks.

Acceptance:

- Unknown task-like IDs can be linked to non-task governance families.
- Real active review findings can still become Planning DB tasks.
- The component guide documents the classification invariant.

## Governance Operator

As a Governance operator, I need an executable semantic test for disposition
closure so that future docs refreshes do not reintroduce hidden backlog drift.

Acceptance:

- The semantic test validates plan, guide, stories, and domain page together.
- Retired inventories cannot return as files or canonical catalog sources; the
  existing DB resolution owner remains required.
- The test names `ResolveDocsDispositionQueue` and
  `ClassifyDocsDispositionClosure`.
- `pnpm verify:prepush` includes the changed docs and guard.
