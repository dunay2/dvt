---
title: F-14-A Fowler Web Vitest Changed Suite Routing Analysis
status: Accepted
date: 2026-05-18
owners:
  - apps/web
planning_type: analysis
---

# F-14-A Fowler Analysis

## Scope

F-14-A continues F-14 by adding a governed local routing boundary for changed
`@dvt/web` files. The slice does not change product behavior. It turns the
existing suite catalog into an executable query that selects the smallest safe
Vitest command for a local change set.

## Mature-System Comparison

Mature frontend systems keep three separate test concerns visible:

- suite ownership: every test file has one semantic owner;
- CI assurance: merge gates still run broad, named lanes;
- local feedback: changed files route to focused commands before developers
  need the full package suite.

The current system improved suite ownership and CI assurance in F-14. The
remaining gap is local feedback. Without a changed-file router, developers still
choose between a full `@dvt/web` run and manually guessing which command is
safe.

## Improved Patterns

<!-- markdownlint-disable MD060 -->

| Area          | Pattern applied                 | Improvement                                                            |
| ------------- | ------------------------------- | ---------------------------------------------------------------------- |
| Local testing | Change-set query                | File paths map to a bounded suite command instead of a full test loop. |
| Suite routing | Catalog-owned command routing   | Command selection is derived from `WebVitestSuiteCatalog` semantics.   |
| Canvas focus  | Focus lane as local accelerator | Canvas changes can run the Canvas lane without becoming suite owner.   |
| Governance    | Semantic architecture guard     | Tests validate command routing semantics, not only config thinness.    |

<!-- markdownlint-enable MD060 -->

## Antipatterns Detected

- Manual test-command selection for local frontend changes.
- Primitive path checks spread across docs, package scripts, and developer
  memory.
- Canvas focus coverage exists but is not exposed as the local default for
  Canvas-scoped changes.
- Documentation describes split commands, but not the transition from changed
  files to a safe local command.

## Components To Group

The owned component is `Web Vitest Changed Suite Router`.

- `apps/web/vitest.suites.ts`: suite catalog, classifier, and changed-file
  routing query.
- `apps/web/scripts/run-vitest-changed-suites.ts`: command adapter that obtains
  changed files and runs routed suite commands.
- `apps/web/package.json`: public `test:changed` command.
- `package.json`: public root `test:web:changed` command.
- `apps/web/src/testing/vitestSuites.architecture.test.ts`: semantic guard.

## Repetitions To Fix

- Stop each developer from re-encoding "which suite should I run?" in local
  notes or chat.
- Keep package scripts from duplicating the suite-command list.
- Keep focus-lane selection in one catalog instead of route-local commands.

## Drift To Fix

- `testing-and-ci-capabilities.md` must include the changed-file web command.
- `test-architecture.md` must define how changed web files select primary and
  focus lanes.
- The web component index must link the changed-suite router component guide.

## Opportunities

- Use the same router later from a changed-file preflight without changing CI
  merge gates.
- Extend focus lanes only after the suite catalog gains the lane and an
  architecture guard.
- Use route-specific focus lanes for local feedback while keeping primary
  suites as the CI ownership model.

## Future Teaching

When a suite becomes too large, do not start by deleting coverage. First create
or refine the semantic owner, add a changed-file query, and prove that query
with an architecture test. Mature systems reduce feedback-loop size without
weakening merge confidence.
