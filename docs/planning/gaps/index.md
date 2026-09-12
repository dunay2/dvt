---
title: Planning Gaps
status: Review
owner: Architecture / Delivery / Docs
last_reviewed: 2026-09-11
planning_type: reference
---

# Planning Gaps

This section is only for currently open tactical gap registers.

It is a planning reference surface, not a task board. Use GitHub Issues for
current task identity, ownership, blockers, acceptance, and closure. Historical
gap snapshots belong under `docs/planning/archive/gaps/` and are not active work
queues.

The legacy `G1` through `G10` execution-gap program is retired and is not part
of the active planning route. Closed legacy material should not be used as a
current authority reference.

## Active Tactical Gap Registers

There are currently no canonical tactical gap registers in this directory.
Create or update the governing GitHub Issue for executable work; only add a new
gap register when it represents a distinct, source-verified delta that is not
already owned by the issue lifecycle.

## Live Planning Anchors

- [Glossary](../../concepts/glossary.md)
- [Domain Language](../../concepts/domain-language.md)
- [GitHub Issues](https://github.com/dunay2/dvt/issues)
- [GitHub MVP Issue Workflow](../state/github-mvp-issue-workflow.md)
- [Roadmap Of Record](../roadmap/index.md)
- [System Delivery Status](../../architecture/system-delivery-status.md)
- [Governance Document And Rule Inventory](../status/governance-document-rule-inventory.md)

## Usage Rule

- Keep `docs/planning/gaps/**` limited to open tactical gap registers.
- Route current task lifecycle through GitHub Issues.
- Route architecture/components/rails through Planning DB and its canonical
  evidence paths.
- Route current implementation truth through code, contracts, tests, CI, and
  System Delivery Status.
- Treat archived gap documents as historical evidence, not backlog.
- Do not create a parallel planning hub from gap documents.
