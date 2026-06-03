---
title: Architecture Documentation Reconciliation Canon User Stories
status: Active
owner: Architecture / Docs / Delivery
last_reviewed: 2026-05-23
component_type: user-stories
---

# Architecture Documentation Reconciliation Canon User Stories

> Owned concern: these stories define how readers, maintainers, planners, and
> reviewers consume architecture documentation reconciliation without creating
> parallel queues or parallel truth sources.

## Stories

### Architecture reader

As an Architecture reader, I want the repository to state which architecture
surface is canonical, status, supporting, or historical so that I do not treat a
snapshot or draft as current implementation truth.

Acceptance:

- The documentation-governance domain links the canon plan.
- The canon component names the truth-order invariant.
- Historical or child-task-owned surfaces are not presented as equal peers to
  canonical architecture.

### Documentation maintainer

As a Documentation maintainer, I want a classification rail before moving or
rewriting architecture docs so that link fixes, archive moves, and index updates
stay aligned with governance.

Acceptance:

- `ClassifyArchitectureDocumentationDisposition` is the query rail for truth
  classification.
- Structural changes still require `pnpm docs:sync`.
- Generated status remains checked before closeout.

### Planning steward

As a Planning steward, I want the parent reconciliation proposal to point at
child tasks so that work is planned in Planning DB rather than inferred from
proposal prose.

Acceptance:

- `GD-MAND-ARCH-DOC-RECON` owns the canonization.
- `GD-DOC-DISPOSITION-CANON`, `GD-MAND-AUTOGEN-PAGES`,
  `GD-MAND-DOC-USABILITY`, `GD-MAND-STARTUP-CARD`,
  `GD-REV-ARCH-GOV-CANON`, and `GD-REV-PLANNING-CANON` remain child work.
- The parent plan does not claim child work is already completed.

### Architecture reviewer

As an Architecture reviewer, I want review findings to become explicit
dispositions so that an active review cannot act as a hidden backlog.

Acceptance:

- Review findings are recorded through
  `RecordArchitectureDocumentationReconciliationCanon`.
- Findings without a concrete owner become Planning DB tasks.
- Findings already absorbed by docs are reference evidence, not duplicate work.
