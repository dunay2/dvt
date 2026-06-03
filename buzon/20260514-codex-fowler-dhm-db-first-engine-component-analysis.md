---
title: DHM DB-first engine component Fowler analysis
status: Draft
date: 2026-05-14
owner: codex
planning_type: analysis
---

# DHM DB-first engine component Fowler analysis

## Governing sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md`
- `docs/planning/proposals/mandatory/governance-and-docs/create-governance-component-command-rail-design-20260514.md`

## Fowler analysis

The useful slice is not another Markdown-only component guide. The mature
architecture move is to make component semantics inspectable from the planning
database, then let rules and drift queries expose whether the code still matches
the declared model.

The current engine component model already has a parent component:
`SYS-RUNTIME-ENGINE-START-RUN`. It owns the whole
`packages/@dvt/engine/src/services/startRun/**` surface. Fowler-wise this is a
coarse component that still carries responsibility overload and data-clump
signals. The code has already been split into semantic services, but the
component model had not caught up as DB-authored child components.

## Components created through the DB command rail

The following components were created with `CreateGovernanceComponent` instead
of editing the YAML manifest directly:

- `SYS-RUNTIME-ENGINE-START-RUN-ADMISSION`
- `SYS-RUNTIME-ENGINE-START-RUN-INTENT`
- `SYS-RUNTIME-ENGINE-START-RUN-EXECUTION`
- `SYS-RUNTIME-ENGINE-START-RUN-FAILURE-POLICY`

Each component declares:

- owned concern
- responsibilities and non-goals
- reasons to change
- public API
- invariants
- transitions
- consumers
- Fowler signals
- governing proposal reference

## Mature-system comparison

Mature systems separate authored intent from generated projections:

- The command rail owns admission, validation, idempotency, and audit.
- The DB stores authored component semantics.
- Query projections expose component tree, metadata, rules, quality, and drift.
- Drift is not hidden in docs; it is visible as queryable data.

This slice follows that pattern. The child components now exist in the DB, and
the remaining gap is visible: the parent still owns files that should eventually
move to leaf ownership.

## Proved queries

Children under start-run:

```bash
pnpm planning:db:query component-tree --children-of SYS-RUNTIME-ENGINE-START-RUN --no-refresh --limit 20
```

Metadata declaration for admission:

```bash
pnpm planning:db:query component-metadata --component SYS-RUNTIME-ENGINE-START-RUN-ADMISSION --no-refresh --limit 5
```

Semantic rules:

```bash
pnpm planning:db:query component-rule-evaluations --component SYS-RUNTIME-ENGINE-START-RUN-ADMISSION --no-refresh --limit 20
```

Remaining ownership drift:

```bash
pnpm planning:db:query component-drift --component SYS-RUNTIME-ENGINE-START-RUN --no-refresh --limit 5
```

## Result

The DB now represents the start-run component split as data. The rules pass for
the authored child component metadata, while the parent drift query correctly
shows `file_without_leaf_component` rows with concrete file paths. That is the
next real engineering opportunity: reconcile file ownership so generated
ownership and DB-authored semantic components converge.

## Next opportunity

Add an ownership reconciliation command or generator integration so
DB-authored child components can claim file ownership without hand-editing the
bootstrap YAML. Until that exists, DB-created children model the semantic target,
and the parent drift query is the guardrail showing what still needs
mechanization.
