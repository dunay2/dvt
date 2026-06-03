---
title: Fowler analysis for governance startup card canon
status: Active
owner: Docs / Architecture / Delivery
last_reviewed: 2026-05-24
---

# Fowler Analysis For Governance Startup Card Canon

## Fowler Analysis

The startup card is an intent router. Its value is not that it shortens a page;
its value is that it applies information hiding to governance startup: callers
choose a route by task intent and receive only the governing surfaces required
for that risk level.

The design aligns with Fowler's preference for explicit boundaries and with DDD
ownership language. Documentation governance owns classification, Planning DB
owns task lifecycle writes, and CI owns validation evidence.

Rails: `ClassifyGovernanceStartupRoute`, `QueryGovernanceStartupRoute`,
`ValidateGovernanceStartupBaseline`.

## Mature-System Comparison

Mature systems use operational handbooks with a quick triage card and a deeper
reference catalog. The DVT startup card now matches that pattern: the inventory
remains authoritative, but the first action is route selection, not full-catalog
parsing.

## Patterns Improved

- The mandatory startup rule is preserved while reducing cognitive load.
- The router separates route selection from deep reference reading.
- The feature now has component docs, user stories, rails, and semantic tests.

## Antipatterns

- Treating a governance table as UI copy instead of policy.
- Adding parallel startup notes outside the inventory/protocol.
- Validating markdown shape while allowing route semantics to drift.

## Component Grouping

- Inventory: live startup card and route matrix.
- AI work protocol: procedural use of the card.
- Component guide: public API, invariants, transitions, consumers, diagrams.
- User stories: success/degraded/negative scenarios.
- CI test: semantic architecture guard.

## Teachings For Future Work

- Quick-start material still needs an owned component when it drives behavior.
- A closed historical task can need a later canonization task when governance
  standards become more semantic.
- Every route table should declare its query rail and its validation baseline.

## Repetitions

The same router intent appears in the original plan, evidence, inventory,
protocol, and planning views. The canonization keeps the useful repetition but
assigns each surface a different job: rationale, implementation, procedure,
status, and validation.

## Opportunities

- Reuse this pattern for future governance quick-start cards.
- Extend semantic CI checks if new route types appear.
- Keep planning task evidence linked to component docs, not just closeout text.

## Drift

The main drift was semantic: the route existed, but the component contract was
implicit. This slice fixes that by publishing explicit rails and a CI guard.

## Applied Pattern

Applied **Intent Router**:

- `ClassifyGovernanceStartupRoute`
- `QueryGovernanceStartupRoute`
- `ValidateGovernanceStartupBaseline`
