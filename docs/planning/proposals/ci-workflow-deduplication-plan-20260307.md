---
title: CI Workflow Deduplication Plan
status: Proposed
owner: engineering
last_reviewed: 2026-03-07
planning_type: proposal
---

# CI Workflow Deduplication Plan

## Proposal Set Context

This document is part of the repository governance proposal set.

- Set entry point: [Repository Governance Proposal Set 2026-03-17](repository-governance-proposal-set-20260317.md)
- Role in set: enforcement and orchestration plan
- Complementary proposals:
  - [Package Module Build Policy v2](package-module-build-policy-v2-20260317.md) defines the target technical package model
  - [Documentation Usability Change Plan](documentation-usability-change-plan-20260308.md) defines documentation governance expectations that CI should help enforce
  - [Phase 2 Architectural Debt Roadmap](phase2-arch-debt-roadmap-20260315.md) defines execution slices that may later consume the CI improvements

## Goal

Reduce duplicated logic across GitHub workflows and root scripts without weakening existing quality
gates.

## Problem Statement

The current repository has several forms of operational duplication:

- change-scope detection is implemented independently in multiple workflows
- package/workspace routing is hardcoded in more than one place
- workflow-specific policy logic is embedded inline in YAML instead of living in testable scripts
- documentation quality gates are split into many workflow steps even though the commands already
  exist at the root

This makes CI harder to evolve safely. A new package, a new path rule, or a new quality gate can
require edits in multiple files, with drift risk between local commands and merge-gate behavior.

## Non-Goals

- Replace the current `pnpm` monorepo orchestration with TurboRepo in this iteration.
- Redesign the repository CI policy from scratch.
- Remove existing quality gates.
- Change the merge policy or PR process.

## Design Principles

1. One source of truth for change-scope definitions.
2. Workflow YAML should orchestrate; repository scripts should implement logic.
3. Local commands and CI gates should remain aligned.
4. Existing required checks must remain semantically equivalent.
5. Changes must be incremental and reviewable in small thematic PRs.

## Target End State

The desired structure is:

- shared CI scope definitions live in `tools/ci`
- workflows call small repository scripts instead of embedding long shell or JavaScript blocks
- documentation quality gates have one aggregate root command for CI parity
- package/workspace routing is defined once and reused

## Implementation Phases

### Phase 1: Centralize Scope Definitions

Create a canonical scope module in `tools/ci` that defines:

- affected workspace mapping
- test package scope mapping
- contracts and determinism scope mapping
- Temporal integration scope mapping

Deliverables:

- `tools/ci/scope-config.mjs`
- `tools/ci/emit-workspace-matrix.mjs`
- `tools/ci/emit-scope.mjs`

Acceptance criteria:

- no workflow contains its own independent path-pattern inventory for these domains
- a package/path change only requires scope edits in one place

### Phase 2: Replace Inline Scope Logic in Workflows

Refactor workflows to call the shared scripts instead of duplicating:

- `dorny/paths-filter` filter blocks for the same domains
- inline matrix assembly logic
- inline Temporal-scope detection logic

Target workflows:

- `.github/workflows/ci.yml`
- `.github/workflows/test.yml`
- `.github/workflows/contracts.yml`
- `.github/workflows/pr-quality-gate.yml`

Acceptance criteria:

- scope outputs remain equivalent to current behavior
- workflows become shorter and easier to audit
- all required checks still report correctly in PRs

### Phase 3: Aggregate Root Quality Commands

Add aggregate root scripts where they improve local/CI parity.

Initial target:

- `docs:ci`

Possible follow-up aggregates:

- `contracts:ci`
- `quality:ci`

Acceptance criteria:

- workflows call fewer individual commands for the same logical gate
- developers can reproduce CI behavior locally with one command per gate family

### Phase 4: Move Long Inline Policy Checks to Scripts

Extract complex workflow logic into scripts under `tools/ci` or `scripts/`.

Priority candidates:

- schema validation shell blocks
- determinism scan shell blocks
- hash-scope detection logic
- PR metadata checks that are repo-specific and testable outside workflow YAML

Acceptance criteria:

- large inline shell or GitHub Script blocks are replaced by named scripts
- the extracted logic is easier to test and review

### Phase 5: Validation and Hardening

Validate the refactor with:

- local dry runs of the shared CI scripts
- workflow syntax review
- PR check verification on a branch that changes representative files
- regression review against current required checks

Acceptance criteria:

- no required check is lost
- no false-negative scope regression is introduced
- local commands remain documented and reproducible

## Proposed PR Breakdown

1. Shared CI scope module and script entrypoints.
2. Workflow rewiring to consume the shared scope scripts.
3. Aggregate docs CI command and PR quality cleanup.
4. Extraction of remaining inline policy logic into repository scripts.

## Risks

### Scope Regression

If a path rule is omitted during centralization, CI may skip a required check.

Mitigation:

- preserve current path inventories verbatim in the first centralization pass
- validate with representative file-change scenarios

### Hidden Coupling

Some workflow jobs may depend on implicit behavior not obvious from the YAML.

Mitigation:

- refactor one workflow family at a time
- keep PRs small and verify actual check execution in GitHub

### Command Drift

Aggregate scripts may stop matching workflow behavior if updated casually.

Mitigation:

- document ownership of aggregate commands
- keep workflow steps mapped to root commands explicitly

## Decision Log for This Plan

- Keep `pnpm` as the orchestration baseline in this iteration.
- Optimize duplication before considering a TurboRepo migration.
- Prefer repository scripts over large workflow-embedded logic blocks.

## Related Files

- [`package.json`](../../../package.json)
- [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml)
- [`.github/workflows/test.yml`](../../../.github/workflows/test.yml)
- [`.github/workflows/contracts.yml`](../../../.github/workflows/contracts.yml)
- [`.github/workflows/pr-quality-gate.yml`](../../../.github/workflows/pr-quality-gate.yml)
- [`tools/ci`](../../../tools/ci)
