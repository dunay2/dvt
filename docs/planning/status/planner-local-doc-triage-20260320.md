---
title: Planner Local Doc Triage
status: Active
owner: Architecture / Planner / Docs
last_reviewed: 2026-03-20
planning_type: status
---

# Planner Local Doc Triage

This document is the `R1` triage inventory for `packages/@dvt/planner/docs/**`.
Its purpose is to stop package-local planner docs from competing with the
canonical repo docs surface.

Use this page with:

- [Planner Current State Assessment](./planner-current-state-assessment.md)
- [Planner Target State And Hardening Roadmap](../archive/proposals/planner-target-state-roadmap-20260320.md)
- [Current Status](../../architecture/system-delivery-status.md)
- [Planner Contracts](../../contracts/planner/index.md)
- [Roadmap Of Record](../roadmap/index.md)

## Governing Sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/CONTRIBUTING.md`
- `docs/DOCS_README.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/roadmap/index.md`
- `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`
- `docs/architecture/system-delivery-status.md`

## Classification Rule

- `promote`: the artifact still carries active subsystem value and should move
  into the canonical repo docs tree
- `retain-local`: the artifact is useful as a package-maintainer note, but it
  is explicitly non-canonical
- `archive`: the artifact is historical, duplicated, stale, or superseded and
  should not remain on the primary planner reader path

## Summary

- Files reviewed: `20`
- `promote`: `1`
- `retain-local`: `3`
- `archive`: `16`

The main conclusion is simple:

- keep only a very small package-local maintainer surface;
- promote the one still-active planner governance proposal;
- archive the old local ADR, contract, schema, and branch-specific proposal
  material so it stops competing with the repo-level planner docs.

## Inventory

| Artifact                                                                                           | Current role                       | Classification | Target home                                | Reason                                                                                     |
| -------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `packages/@dvt/planner/docs/README.md`                                                             | package maintainer entrypoint      | `retain-local` | keep local with canonical-reading note     | useful package-local orientation; not a status or roadmap surface                          |
| `packages/@dvt/planner/docs/grimorio.md`                                                           | local source-tree orientation note | `retain-local` | keep local as non-canonical maintainer aid | implementation note only; no governance role                                               |
| `packages/@dvt/planner/docs/PLANNER_IMPLEMENTATION_REVIEW_v2_3_2.md`                               | versioned implementation review    | `archive`      | `docs/archive/planner/`                    | stale branch/version review superseded by the current planner assessment                   |
| `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`                        | active planner governance proposal | `promote`      | `docs/planning/proposals/`                 | still used as a live governance source and should not remain package-local                 |
| `packages/@dvt/planner/docs/audit/planner_v2_3_2_audit.commented.ts`                               | implementation audit artifact      | `retain-local` | keep local under package docs              | maintainer-focused audit file, not canonical repo documentation                            |
| `packages/@dvt/planner/docs/adr/ADR-0000-scope-and-compat.md`                                      | local ADR snapshot                 | `archive`      | `docs/archive/planner/`                    | semantic content now belongs to repo ADRs and planner contracts                            |
| `packages/@dvt/planner/docs/adr/ADR-0001-rfc8785-jcs.md`                                           | local ADR snapshot                 | `archive`      | `docs/archive/planner/`                    | determinism rationale is already governed elsewhere in repo docs                           |
| `packages/@dvt/planner/docs/adr/ADR-0002-plan-core-hash.md`                                        | local ADR snapshot                 | `archive`      | `docs/archive/planner/`                    | plan-core hashing rationale is already reflected in canonical planner surfaces             |
| `packages/@dvt/planner/docs/adr/ADR-0003-typed-errors.md`                                          | local ADR snapshot                 | `archive`      | `docs/archive/planner/`                    | local ADR numbering competes with repo ADR governance                                      |
| `packages/@dvt/planner/docs/adr/ADR-0004-security-limits.md`                                       | local ADR snapshot                 | `archive`      | `docs/archive/planner/`                    | planner limits belong in repo-level architecture and package code, not local ADR authority |
| `packages/@dvt/planner/docs/adr/ADR-0005-metrics.md`                                               | local ADR snapshot                 | `archive`      | `docs/archive/planner/`                    | observability guidance should not live as planner-local ADR authority                      |
| `packages/@dvt/planner/docs/adr/ADR-0006-extensibility.md`                                         | local ADR snapshot                 | `archive`      | `docs/archive/planner/`                    | extensibility posture is now governed through contracts and repo ADRs                      |
| `packages/@dvt/planner/docs/planning/proposal/planner-corrected-baseline-facade-branch.md`         | branch-specific draft baseline     | `archive`      | `docs/archive/planner/`                    | branch-corrected exploratory draft superseded by the current repo-level assessment         |
| `packages/@dvt/planner/docs/planning/proposal/planner-slice3-physical-reorganization-plan.md`      | local reorganization proposal      | `archive`      | `docs/archive/planner/`                    | historical package-local proposal; artifact extraction state has already moved on          |
| `packages/@dvt/planner/docs/planning/proposal/planner-slice4-artifact-boundary-extraction-plan.md` | local artifact proposal            | `archive`      | `docs/archive/planner/`                    | post-extraction stabilization is now a repo-level concern, not a package-local roadmap     |
| `packages/@dvt/planner/docs/contracts/PlannerContracts.v2.3.1.md`                                  | local planner contract note        | `archive`      | `docs/archive/planner/`                    | public planner contract authority now lives in `@dvt/contracts`                            |
| `packages/@dvt/planner/docs/contracts/ExecutionPlanV2.schema.json`                                 | local schema snapshot              | `archive`      | `docs/archive/planner/contracts/`          | local schema copy competes with canonical contract ownership                               |
| `packages/@dvt/planner/docs/contracts/PlanCore.schema.json`                                        | local schema snapshot              | `archive`      | `docs/archive/planner/contracts/`          | local schema copy competes with canonical contract ownership                               |
| `packages/@dvt/planner/docs/contracts/PlannerInputEnvelopeV2.schema.json`                          | local schema snapshot              | `archive`      | `docs/archive/planner/contracts/`          | public input-envelope authority is no longer planner-local                                 |
| `packages/@dvt/planner/docs/contracts/PlannerPolicyClassSet.schema.json`                           | local schema snapshot              | `archive`      | `docs/archive/planner/contracts/`          | planner policy vocabulary is now a shared contract concern                                 |

## Action Owners

| Action                                                                           | Owner                         | Target date  | Notes                                                                            |
| -------------------------------------------------------------------------------- | ----------------------------- | ------------ | -------------------------------------------------------------------------------- |
| Promote `Stage-1.1-Planner-Canonicalization.md` into repo docs                   | Architecture / Docs           | `2026-03-27` | package-local copy should become a pointer or archived duplicate after promotion |
| Keep the retained local maintainer notes explicitly non-canonical                | Planner Maintainers           | `2026-03-20` | satisfied in this slice by the updated package `README.md`                       |
| Archive the historical local ADR, contract, schema, and branch-proposal material | Architecture / Planner / Docs | `2026-04-03` | archive only after canonical cross-links are in place                            |

## Target State

After `R1`, the planner reader path should be:

1. `docs/architecture/system-delivery-status.md`
2. `docs/planning/status/planner-current-state-assessment.md`
3. `docs/planning/status/planner-local-doc-triage-20260320.md`
4. `docs/planning/archive/proposals/planner-target-state-roadmap-20260320.md`
5. `docs/contracts/planner/index.md`

Package-local docs remain allowed only as implementation notes and historical
artifacts, not as the canonical planner status or roadmap surface.
