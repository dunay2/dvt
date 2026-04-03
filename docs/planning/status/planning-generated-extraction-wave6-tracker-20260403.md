---
title: Planning Generated Extraction Wave 6 Tracker
status: Active
owner: Docs / Delivery / Architecture
last_reviewed: 2026-04-03
planning_type: status
---

# Planning Generated Extraction Wave 6 Tracker

## Objective

Close the planning-generated extraction program with measurable acceptance
evidence instead of implementation-only completion.

## Scope

- observation period after Wave 5 adoption
- CI and merge-friction health for extracted planning artifacts
- acceptance decision and closeout handoff

## Observation Window

- start date: 2026-04-03
- target window: 2 sprint cycles
- review cadence: weekly

## Acceptance Signals

1. No recurring merge conflicts on extracted planning-generated pages.
2. `PR Quality Gate` remains stable with `docs:workboard:check` in docs PRs.
3. Contributors continue using YAML sources and isolated preview flow.
4. No rollback to re-tracked planning-generated pages is required.

## Metrics To Capture

| Metric                                        | Source                                          | Target trend |
| --------------------------------------------- | ----------------------------------------------- | ------------ |
| PR conflicts on extracted planning pages      | GitHub PR conflict history / rebase notes       | down         |
| Docs CI failures in planning-generated checks | `PR Quality Gate` run history                   | flat-to-down |
| Docs-only PR lead time                        | PR open-to-merge cycle time                     | down         |
| Manual rollback incidents                     | runbook incident notes                          | zero         |
| Out-of-policy commits of extracted pages      | `docs:planning:generated:check` failure history | zero         |

## Current Snapshot (2026-04-03)

- Waves 1-4 are implemented.
- Wave 5 hardening runbook exists.
- Wave 6 started to collect acceptance evidence before final closeout.

## Exit Criteria

- complete two sprint-cycle metric capture
- publish closeout documenting results and final decision:
  `Accepted` continuation or follow-up corrective wave
