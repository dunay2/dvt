---
title: Planning Gaps
status: Review
owner: Architecture / Delivery / Docs
last_reviewed: 2026-04-17
planning_type: reference
---

# Planning Gaps

This section is only for currently open tactical gap registers.

It is a planning reference surface, not the live execution board. Use it to
understand explicitly scoped open deltas and validated gap snapshots; use the
lane registry and active reviews for current task status and execution truth.

The legacy `G1` through `G10` execution-gap program is retired and is not part
of the active planning route. Closed legacy material should not be used as a
current authority reference.

## Active Tactical Gap Registers

- [Runtime Architecture Gap Register 2026-03-31](./runtime-architecture-gap-register-20260331.md)

## Live Planning Anchors

- [Planning Control Tower](../state/planning-control-tower.md)
- [Review Status Board](../reviews/review-status-board.md)
- [Agent Lane C YAML](../state/agent-lane-c.yaml)
- [Roadmap Of Record](../roadmap/index.md)
- [Domain Status Board](../state/domain-status-board.md)
- [System Delivery Status](../../architecture/system-delivery-status.md)

## Concept Anchors

- [Glossary](../../concepts/glossary.md) for `gap`, `status`, `roadmap`,
  `canonical spec`, and `verification tuple`
- [Domain Language](../../concepts/domain-language.md) for the naming rules
  shared across planning, architecture, and code

## Usage Rule

- Keep `docs/planning/gaps/**` limited to open tactical gap registers.
- Route current execution ownership through the lane YAML registry.
- Route current architecture rationale through active reviews, not through gap
  appendices or second documents embedded inside a register.
