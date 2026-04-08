---
title: Documentation Usability Change Plan
status: Active
owner: Docs / Architecture / Platform
last_reviewed: 2026-03-08
planning_type: proposal
---

# Documentation Usability Change Plan

## Proposal Set Context

This document is part of the repository governance proposal set.

- Set entry point: [Repository Governance Proposal Set 2026-03-17](../../../archive/proposals/repository-governance-proposal-set-20260317.md)
- Role in set: documentation governance and usability plan
- Complementary proposals:
  - [Documentation Restructuring Diagnostic And Roadmap](../../../archive/proposals/documentation-restructuring-diagnostic-and-roadmap.md) is the diagnostic precursor
  - [Package Module Build Policy v2](../../../archive/proposals/package-module-build-policy-v2-20260317.md) defines the technical target model for packages and builds
  - [CI Delivery Governance Consolidated Action Plan](ci-delivery-governance-consolidated-action-plan-20260331.md) defines enforcement strategy for reusable CI checks

## Execution Status

Execution status on 2026-03-08:

- Phase 1 completed: navigation, home, concepts, and non-empty operational
  entry points were published.
- Phase 2 completed: the roadmap of record was consolidated and duplicate
  roadmap entry points were downgraded.
- Phase 3 is in progress: workspace coverage, repository mapping, frontend
  landing, shared-package surfacing, and explicit package-status
  classification are being executed.
- Phase 4 is in progress: compatibility aliases and duplicate legacy entry
  points are being deleted from the active tree.

## Goal

Turn the current documentation set into a usable consultation and tracking
system instead of a collection of disconnected artifacts.

The change is successful when a reader can find, in one navigation system:

- the canonical definition of a concept;
- the current implementation or delivery status;
- the governing decision or contract;
- the related code and verification command.

## Problem Statement

The repository currently has a documentation volume problem and an
information-architecture problem at the same time.

Observed issues:

- navigation does not expose the full active documentation surface;
- roadmap information is split across multiple entry points;
- the glossary exists as an engine contract but not as a repository-wide domain
  language system;
- package and app docs are partially outside the published documentation surface;
- duplicate or compatibility entry points keep historical confusion alive;
- current CI checks validate hygiene but do not validate discoverability,
  canonical ownership, or consultation usefulness.

## Baseline

Current repo baseline on 2026-03-08:

- `docs/` contains 11 top-level sections and 267 markdown documents including
  root-level docs;
- `packages/` and `apps/` contain 37 additional markdown documents outside the
  main published docs tree;
- the active navigation still omits or hides relevant areas such as repository
  knowledge and legacy decision entry points;
- `owner: docs` is still used broadly and does not represent actionable
  ownership;
- explicit `code_paths` frontmatter is not standardized across active docs.

## Target Operating Model

The documentation system should follow one stable repository-wide pattern:

1. `Home`
2. `Concepts`
3. `Reference`
4. `How-to`
5. `Operations`
6. `Decisions`
7. `Planning`
8. `Evidence`
9. `Archive`

Interpretation of each area:

- `Concepts`: glossary, domain language, system map, bounded contexts,
  lifecycle vocabulary;
- `Reference`: contracts, schemas, APIs, invariants, versioned technical
  reference;
- `How-to`: development and contributor task guides;
- `Operations`: runbooks, observability, SLOs, incident response;
- `Decisions`: ADRs only;
- `Planning`: roadmap, status, gaps, proposals, reviews;
- `Evidence`: proof that high-impact changes were validated;
- `Archive`: superseded or historical material only.

## Scope

Included in this change:

- information architecture and navigation redesign;
- roadmap consolidation;
- concept and glossary entry points;
- cleanup of duplicate and hidden entry points;
- package/app documentation integration strategy;
- stronger CI rules for documentation usefulness;
- ownership and minimum traceability normalization.

Excluded from this change:

- rewriting every historical document immediately;
- changing technical architecture content unrelated to documentation access;
- producing a public marketing site or non-engineering knowledge base.

## Workstreams

### Workstream 1: Establish one visible architecture

Actions:

- redesign `zensical.yml` and top-level landing pages around the target operating
  model;
- stop using hidden active sections as parallel entry points;
- remove empty or misleading landing pages from the active surface;
- make the home page role-based and task-oriented.

Deliverables:

- new top-level navigation;
- rewritten `docs/index.md`;
- explicit destination for `knowledge` and `decisions`.

Acceptance:

- every active top-level documentation area is visible from the main nav;
- no active landing page is empty;
- the home page answers "what is this", "where do I start", and "where is the
  current status".

### Workstream 2: Create a domain-language layer

Actions:

- create a `Concepts` area with at least:
  - glossary;
  - domain language;
  - system map;
  - key entity and artifact lifecycle overview;
- separate repository-wide concepts from engine-only contract vocabulary;
- define canonical concept anchors and require cross-links from active docs.

Deliverables:

- `docs/concepts/index.md`;
- `docs/concepts/glossary.md`;
- `docs/concepts/domain-language.md`;
- `docs/concepts/system-map.md`.

Acceptance:

- the first occurrence of a critical term in active docs links to its canonical
  concept page;
- glossary and domain language are usable without reading engine contracts
  first.

### Workstream 3: Consolidate roadmap and status

Actions:

- define one canonical roadmap entry point;
- classify all other roadmap-like files as subsystem roadmap, status snapshot,
  compatibility alias, or archive candidate;
- translate or archive active planning docs that violate language policy;
- separate "future intent", "current status", and "historical assessment".

Deliverables:

- one canonical roadmap page under `docs/planning/`;
- explicit status board under `docs/planning/status/`;
- archive or downgrade plan for non-canonical roadmap copies.

Acceptance:

- there is only one roadmap of record for the repository;
- subsystem plans link upward to the canonical roadmap instead of competing with
  it;
- no active roadmap remains untranslated or ambiguously owned.

### Workstream 4: Bring package and app docs into the same system

Actions:

- decide for each package/app doc whether it should:
  - move under `docs/`;
  - be imported into the published site;
  - remain local reference-only and be linked from a canonical landing page;
- add a package-to-doc matrix for all active workspaces;
- eliminate "important but unpublished" documentation.

Deliverables:

- package/app documentation policy;
- completed package-to-doc matrix;
- canonical landing page for workspace documentation.

Acceptance:

- every active package or app has a visible documentation entry point;
- no critical workflow depends on reading an unindexed markdown file.

### Workstream 5: Harden governance around usefulness

Actions:

- replace generic ownership with actionable ownership;
- standardize a minimum traceability tuple for active technical docs:
  - canonical spec;
  - status doc;
  - code paths;
  - test paths;
  - verification command;
  - evidence or risk record when applicable;
- add CI checks for:
  - empty indexes;
  - duplicate active entry points;
  - active docs outside the allowed IA;
  - missing canonical mapping for active packages/apps;
  - missing minimum traceability on governed docs.

Deliverables:

- updated document metadata rules;
- upgraded docs CI checks;
- remediation list for non-compliant active docs.

Acceptance:

- documentation CI fails on structural usefulness regressions, not only syntax
  or legacy-path mistakes;
- owners are actionable and reviewable;
- traceability is not limited to one manually curated matrix.

## Execution Sequence

### Phase 0: Freeze and classify

- freeze new top-level documentation sections unless explicitly approved;
- classify all active entry points as canonical, alias, local-reference-only, or
  archive.

Exit criterion:

- no ambiguity remains about which entry points are active.

### Phase 1: Navigation and home rewrite

- implement the new top-level IA;
- rewrite home and landing pages;
- remove empty or misleading active indexes.

Exit criterion:

- published navigation reflects the actual active documentation model.

### Phase 2: Concepts and roadmap consolidation

- publish the new concept layer;
- publish the single roadmap of record;
- downgrade or archive duplicate roadmap copies.

Exit criterion:

- readers can find concept definitions and roadmap status without path hunting.

### Phase 3: Workspace integration and traceability

- map packages/apps to canonical docs;
- standardize traceability metadata and landing pages.

Exit criterion:

- no active package or app is documentation-dark.

### Phase 4: CI hardening

- add missing validators;
- convert warnings into failures where the baseline debt is closed.

Exit criterion:

- the repo can no longer drift back into the current fragmented state without
  CI surfacing it as a failure.

## Risks

- moving too many files at once may break links and reduce trust if sequencing is
  careless;
- attempting full content cleanup before fixing information architecture will
  waste effort;
- leaving compatibility aliases active for too long will preserve confusion;
- generic ownership will continue to block accountability if not addressed early;
- if package/app docs remain outside the visible system, the change will look
  clean while still failing users.

## Validation

Structural validation:

- `pnpm docs:sync`
- `pnpm docs:quality:check`
- `pnpm docs:doctor`
- `pnpm docs:canonical:check`

Required outcome validation:

- every active area is visible from the main nav;
- every active package/app has a canonical doc entry point;
- one and only one roadmap is marked as canonical;
- one and only one glossary/domain-language layer is marked as canonical;
- no empty active landing page remains;
- no broken root-to-doc redirect remains.

Usability validation:

- a new contributor can answer in less than 90 seconds:
  - what DVT is;
  - where the roadmap is;
  - where the glossary is;
  - where the current implementation status is;
  - which doc governs a given package or workflow.

## References

- [Documentation Restructuring Diagnostic And Roadmap](../../../archive/proposals/documentation-restructuring-diagnostic-and-roadmap.md)
- [Canonical Doc Code Matrix](../../../status/canonical-doc-code-matrix.md)
- [Repository Map](../../../../concepts/repository-map.md)
- [Roadmap Of Record](../../../roadmap/index.md)
