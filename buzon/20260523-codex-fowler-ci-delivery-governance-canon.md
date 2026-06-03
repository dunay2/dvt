---
title: Fowler Analysis - CI Delivery Governance Canon
status: Accepted
date: 2026-05-23
owner: codex
---

# Fowler Analysis - CI Delivery Governance Canon

Owned concern: architecture review of the CI delivery governance canon after
the branch work that already absorbed several action-plan waves.

## Mature-system comparison

Mature repositories do not let CI policy live as scattered workflow prose. They
keep one command contract, one required workflow consumer, local reproduction
commands, and semantic tests that fail when the command contract drifts.

DVT is now close to that posture for CI helper governance:

- `pnpm test:ci-tools` is the local command contract.
- `.github/workflows/ci.yml` consumes the same command in the `CI tool
contracts` lane.
- `workflow-pattern-parity.test.mjs` proves the lane and shared scope emitters
  remain wired.
- `generated-docs-single-writer-policy.test.mjs` and related docs-policy checks
  keep generated governance ownership out of ad hoc plan text.

## Improved patterns

- **Service Layer**: the CI-tool contract command is the service boundary for
  CI helper validation.
- **Policy object**: shared scope and generated-doc policy files own decisions
  that were previously spread across workflows or prose.
- **Semantic architecture guard**: the canon test validates structure and
  current-state assertions, not only file presence.
- **Single source of truth**: the mandatory proposal now delegates current
  component semantics to the component doc.

## Anti-patterns

- **Documentation drift**: the proposal still said `CDG-W4-1` was pending even
  though the workflow already runs `pnpm test:ci-tools`.
- **Duplicate semantics**: the old action-plan framing could lead agents to
  create a second CI-tool workflow lane for the same gate.
- **Responsibility overload**: one proposal mixed history, current model, open
  gaps, executed gates, and residual opportunities.

## Grouping opportunities

The following concerns should stay grouped under `ci-governance`:

- workflow parity and scope emission tests;
- generated-doc single-writer policy;
- pre-push and changed-file routing;
- CI delivery component guides and user stories.

The following should remain separate:

- package runtime contracts;
- application API or web behavior;
- engine and adapter ARC evidence.

## Repetitions fixed

This slice removes repeated current-state language by naming one component doc
as the canonical description of the CI delivery gate contract.

## Drift fixed

The mandatory proposal now distinguishes absorbed gates from residual work, so
`CDG-W4-1` cannot be mistaken for an open implementation item.

## Lessons for future work

- Before creating a next task from an old mandatory plan, compare each wave
  against the real code and workflow state.
- Canonical component docs should carry public API, invariants, transitions,
  and consumers; proposals should carry residual opportunity, not duplicate
  implementation truth.
- Architecture tests should check semantic posture and plan state when the risk
  is documentation drift.
