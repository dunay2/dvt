---
title: Architecture Governance Review Canon User Stories
status: Active
owner: Architecture / Docs / Planning
last_reviewed: 2026-05-24
component_type: governance
---

# Architecture Governance Review Canon User Stories

## Story 1 - Architecture steward maps a blocker to an existing task

As an architecture steward, I want every blocker from an active architecture
review mapped to an existing Planning DB task, ADR, evidence record, or risk
entry so that I do not create a duplicate backlog from review prose.

Acceptance:

- Given a review finding is already closed by task evidence, the disposition row
  names `Closed` and links the owner.
- Given a review finding still has product value, the disposition row names the
  queued Planning DB task.
- Given a finding has only residual uncertainty, the disposition row names the
  risk entry instead of opening an implementation task.

## Story 2 - Product planner distinguishes product value from platform hygiene

As a product planner, I want architecture review work separated into
product-facing value and platform hygiene so that I can choose cost attribution,
projection invalidation, or pilot work ahead of low-product-value security
settings.

Acceptance:

- Cost attribution remains a queued product task because it enables billing and
  finance visibility.
- Projector event-driven invalidation remains queued because it enables scale
  and backpressure closure.
- Already closed runtime hardening rows do not appear as new product tasks.

## Story 3 - Reviewer verifies drift is intentional

As a reviewer, I want drift between the 2026-04-02 review and current task state
called out explicitly so that stale review recommendations are not treated as
fresh blockers.

Acceptance:

- Closed rows name closure tasks or evidence.
- Follow-up rows name why closure is incomplete.
- Risk-accepted rows name the residual risk and reactivation condition.

## Story 4 - Agent continues from the planning DB

As an agent, I want the review canon, component guide, and semantic guard to
point me back to Planning DB state so that context compaction does not make me
restart review triage from scratch.

Acceptance:

- The plan names `GD-REV-ARCH-GOV-CANON`.
- The guide names the three command/query rails.
- The semantic test fails when high-value findings lose disposition coverage.
