---
title: Governance Startup Card Canon User Stories
status: Active
owner: Docs / Architecture / Delivery
last_reviewed: 2026-05-24
component_type: governance
---

# Governance Startup Card Canon User Stories

> Owned concern: scenario coverage for governance startup routing, including
> success, degraded, and negative paths.

## Bounded-task contributor

As a bounded-task contributor, I want
`ClassifyGovernanceStartupRoute` to map a small docs or code slice to the right
route so that I can open the inventory startup card, the route-specific
documents, and the AI work protocol without reading unrelated deep catalog
sections.

Acceptance:

- `docs` routes name `docs/index.md` or the relevant docs entry point.
- `code` routes name the relevant ADR, contract, or current status when needed.
- `ValidateGovernanceStartupBaseline` requires `pnpm verify:prepush`.

## Cross-cutting implementer

As a cross-cutting implementer, I want `QueryGovernanceStartupRoute` to require
deep inventory reading when my work touches public boundaries, contracts,
multiple packages, CI, or planning posture so that startup speed does not weaken
governance for risky changes.

Acceptance:

- `cross-cutting`, `contracts`, and `ci` routes always escalate to deep reading.
- The card does not create a second governance inventory.
- The closeout evidence names the governing sources actually used.

## Planning operator

As a planning operator, I want planning work to route through Planning DB and
generated workboard checks so that task lifecycle changes do not drift into
generated markdown edits or PR-only notes.

Acceptance:

- Planning route points to the Planning Control Tower and AI work protocol.
- Task claim/status/evidence changes happen through `pnpm planning:db:operate`.
- Generated planning views are refreshed through generators, not hand edits.

## PR reviewer

As a PR reviewer, I want `ValidateGovernanceStartupBaseline` to fail when a
startup-card change removes a route, omits a baseline, or leaves the component
guide/user stories out of sync so that semantic startup routing is reviewed as a
contract, not formatting.

Acceptance:

- The architecture test checks all six route names.
- The canon plan, component guide, user stories, mailbox, domain doc, and
  original router plan name the same rails.
- No stub, placeholder, or parallel startup-note surface is added.

## Negative Scenarios

- If a route exists in the inventory but lacks a minimum validation baseline,
  the change is not acceptable.
- If a future doc describes a separate startup process for the same intent, it
  must be folded into this component or archived as historical context.
- If a slice changes startup governance but skips `pnpm verify:prepush`, the
  slice is not ready.
