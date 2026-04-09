---
title: Repository Governance Proposal Set 2026-03-17
status: Proposed
owner: Core Architecture
last_reviewed: 2026-03-17
planning_type: proposal
---

# Repository Governance Proposal Set 2026-03-17

This proposal aligns the active repository-governance proposals into one
explicit set so they can be read as complementary planning material instead of
as overlapping or competing documents.

## Purpose

- define the relationship between the main governance-oriented proposals
- classify each proposal by role
- reduce planning ambiguity
- give future slices one clear entry point into the proposal set

## Problem Statement

The repository currently has several active proposals that all affect the
operating model of the monorepo:

- package/module/build policy
- CI and enforcement deduplication
- documentation governance and usability
- architectural execution roadmap

Each proposal is useful on its own, but the set lacks an explicit statement of
how those documents relate to each other. That makes it harder to know which
proposal defines target state, which one defines enforcement, and which one is
an execution roadmap.

## Proposal Set Model

The active set should be read using this hierarchy:

1. diagnostic and context
2. policy
3. enforcement
4. execution roadmap

This is not a replacement for the individual proposals. It is a navigation and
alignment layer above them.

## Proposal Roles

| Proposal                                                                                                      | Role in set                        | Primary question it answers                                                                    |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| [Documentation Restructuring Diagnostic And Roadmap](./documentation-restructuring-diagnostic-and-roadmap.md) | Diagnostic precursor               | What structural documentation disorder exists and how was it classified?                       |
| [Documentation Usability Change Plan](../../proposals/documentation-usability-change-plan-20260308.md)        | Documentation governance plan      | How should the documentation system become usable and governable?                              |
| [Package Module Build Policy v2](./package-module-build-policy-v2-20260317.md)                                | Repository technical policy        | What is the target model for packages, modules, build metadata, and tsconfig families?         |
| [CI Improvement Plan](../../proposals/ci-improvement-plan-20260327.md)                                        | Enforcement and orchestration plan | How should CI and repository automation enforce and reuse repository rules?                    |
| [Phase 2 Architectural Debt Roadmap](./phase2-arch-debt-roadmap-20260315.md)                                  | Execution roadmap                  | In what order should post-Phase-1 technical slices execute against the target operating model? |

## Reading Order

Recommended reading order:

1. [Documentation Restructuring Diagnostic And Roadmap](./documentation-restructuring-diagnostic-and-roadmap.md)
2. [Documentation Usability Change Plan](../../proposals/documentation-usability-change-plan-20260308.md)
3. [Package Module Build Policy v2](./package-module-build-policy-v2-20260317.md)
4. [CI Improvement Plan](../../proposals/ci-improvement-plan-20260327.md)
5. [Phase 2 Architectural Debt Roadmap](./phase2-arch-debt-roadmap-20260315.md)

## Set Rules

- The proposals in this set are complementary, not mutually exclusive.
- The package/module/build policy proposal defines repository target state for
  technical package convergence.
- The CI workflow proposal defines enforcement and orchestration strategy for
  repository automation.
- The documentation proposals define governance and usability of the canonical
  documentation system.
- The Phase 2 roadmap defines execution ordering for architectural debt and
  follow-up slices; it does not replace policy or enforcement proposals.

## Expected Maintenance Pattern

When a new governance-oriented proposal is added, it should declare one of
these roles:

- diagnostic
- policy
- enforcement
- execution roadmap
- exception record

If it belongs to this set, it should link back here and say how it fits.

## Non-Goals

- This proposal does not merge the existing proposals into one document.
- This proposal does not supersede any current proposal.
- This proposal does not accept or reject the underlying technical policy by
  itself.

## Result

After this alignment:

- the proposal set has a readable hierarchy
- related documents can cross-reference each other consistently
- future migration slices can cite the correct proposal by role
