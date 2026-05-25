---
title: Documentation Usability Canon Plan
status: Active
owner: Docs / Architecture / Platform
last_reviewed: 2026-05-24
planning_type: proposal
---

# Documentation Usability Canon Plan

## Owned Concern

`GD-MAND-DOC-USABILITY` owns canonization of the documentation usability change
proposal into a governed consultation component with explicit information
architecture rails, invariants, user stories, and semantic CI coverage.

## Fowler Analysis

| Scenario                                                                  | Opportunity                                  | Fowler pattern                                            | DDD owner                             | Command/query rail                   | Implementation surfaces                        | Unit or package test                              | Architecture test   | User-flow test         | Out of scope               |
| ------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------- | ------------------------------------- | ------------------------------------ | ---------------------------------------------- | ------------------------------------------------- | ------------------- | ---------------------- | -------------------------- |
| Classify active documentation entry points by reader intent               | Duplicate semantics and documentation drift  | Replace Type Code with intention-revealing classification | Documentation entry point registry    | `ClassifyDocumentationEntryPoint`    | Proposal, component guide, domain note         | `tools/ci/documentation-usability-canon.test.mjs` | Same semantic guard | none - docs governance | moving documentation files |
| Resolve a contributor consultation path from question to canonical source | Feature envy and hidden navigation authority | Gateway plus Published Language                           | Documentation consultation read model | `QueryDocumentationConsultationPath` | Component guide, stories, original proposal    | `tools/ci/documentation-usability-canon.test.mjs` | Same semantic guard | none - docs governance | building a new docs UI     |
| Validate usefulness beyond syntax and link health                         | Test-only confidence                         | Semantic fitness function                                 | Documentation usefulness policy       | `ValidateDocumentationUsefulness`    | Component guide, buzon analysis, semantic test | `tools/ci/documentation-usability-canon.test.mjs` | Same semantic guard | none - docs governance | hardening all CI checks    |

## Mature-System Comparison

Mature documentation systems optimize for consultation paths, not folder
visibility alone. They separate authored source, canonical entry points, status
snapshots, decisions, evidence, and local reference docs. This canon keeps the
2026-03-08 target operating model but promotes it into an explicit component:

- `ClassifyDocumentationEntryPoint` decides whether a page is canonical,
  status, local reference, alias, or archive.
- `QueryDocumentationConsultationPath` answers where a reader should start for
  concepts, status, contracts, decisions, evidence, or package ownership.
- `ValidateDocumentationUsefulness` guards against regressions where docs pass
  syntax checks but become hard to use.

## Antipatterns Removed

- Treating navigation breadth as the same thing as usability.
- Keeping roadmap, status, and historical assessment under ambiguous names.
- Allowing package or app docs to remain important but unpublished.
- Depending only on markdown hygiene when the failure mode is consultation
  usefulness.

## Drift And Repetition Fixed

The original usability proposal, documentation-governance domain note,
component guide, user stories, and mailbox analysis now share the same rails:

- `ClassifyDocumentationEntryPoint`
- `QueryDocumentationConsultationPath`
- `ValidateDocumentationUsefulness`

## User Stories

1. As a new contributor, I want one consultation path for concepts, roadmap,
   current status, and governing docs so that I do not need to know the repo
   history before reading.
2. As a documentation maintainer, I want entry points classified by purpose so
   that active docs do not compete with aliases or archive material.
3. As an architecture reviewer, I want usefulness invariants in a component
   guide so that docs changes can be reviewed for reader outcomes.
4. As a governance operator, I want a semantic guard for usefulness rails so
   that future docs syntax passes cannot hide IA regressions.

## Decision

Accept the target operating model from
[Documentation Usability Change Plan](./documentation-usability-change-plan-20260308.md)
and promote its long-lived semantics into the
[Documentation Usability Canon Component](../../../architecture/components/ci-governance/documentation-usability-canon-component.md).

No documentation tree move or new docs UI is implemented in this slice. This
slice establishes the semantic contract, stories, analysis, and guard for
future usability work.

## ADR Decision

No new ADR is required. Existing documentation governance and command/query
rail governance already require canonical placement, explicit entry-point
semantics, and semantic architecture tests for governed docs behavior.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: GD-MAND-DOC-USABILITY
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/documentation-usability-canon-plan-20260524.md
componentGuides:
  - docs/architecture/components/ci-governance/documentation-usability-canon-component.md
userStories:
  - docs/architecture/components/ci-governance/documentation-usability-canon-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/proposals/mandatory/governance-and-docs/documentation-usability-change-plan-20260308.md
allowedImplementationSurfaces:
  - buzon/20260524-codex-fowler-documentation-usability-canon.md
  - docs/.manifest.json
  - docs/architecture/components/ci-governance/documentation-usability-canon-component.md
  - docs/architecture/components/ci-governance/documentation-usability-canon-user-stories.md
  - docs/architecture/components/ci-governance/index.md
  - docs/planning/domains/documentation-governance.md
  - docs/planning/index.md
  - docs/planning/proposals/index.md
  - docs/planning/proposals/mandatory/governance-and-docs/documentation-usability-canon-plan-20260524.md
  - docs/planning/proposals/mandatory/governance-and-docs/documentation-usability-change-plan-20260308.md
  - docs/planning/proposals/portfolio-map-20260403.md
  - docs/planning/state/agent-lane-a.md
  - docs/planning/state/execution-workboard.md
  - [Task: GOV-PROP-DISP-1] docs/planning/state/open-task-route.md
  - docs/planning/status/**
  - tools/ci/documentation-usability-canon.test.mjs
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
commandQueryRails:
  - name: ClassifyDocumentationEntryPoint
    type: query
    dddOwner: Documentation entry point registry
  - name: QueryDocumentationConsultationPath
    type: query
    dddOwner: Documentation consultation read model
  - name: ValidateDocumentationUsefulness
    type: query
    dddOwner: Documentation usefulness policy
domainObjects:
  - name: DocumentationEntryPoint
    type: value object
    owner: Docs / Architecture / Platform
  - name: DocumentationConsultationPath
    type: read model
    owner: Docs / Architecture / Platform
  - name: DocumentationUsefulnessPolicy
    type: policy
    owner: Docs / Architecture / Platform
fowlerSignals:
  - Documentation drift
  - Duplicate active entry points
  - Hidden navigation authority
  - Test-only confidence
architectureGuards:
  - node --test tools/ci/documentation-usability-canon.test.mjs
cypressFlows:
  - N/A - documentation governance semantic guard only
completionGate:
  - node --test tools/ci/documentation-usability-canon.test.mjs
  - pnpm test:ci-tools
  - pnpm docs:sync
  - pnpm docs:status:generate
  - node scripts/check-feature-mechanization.cjs --feature GD-MAND-DOC-USABILITY
  - node scripts/check-feature-mechanization.cjs --implementation --feature GD-MAND-DOC-USABILITY
  - pnpm lint:md:changed
  - pnpm verify:prepush
redGreenCycles:
  - id: documentation-usability-canon-rails
    redTest: node --test tools/ci/documentation-usability-canon.test.mjs
    expectedFailure: Documentation usability canon plan, guide, stories, and buzon analysis do not exist.
    patchSurfaces:
      - tools/ci/documentation-usability-canon.test.mjs
      - docs/planning/proposals/mandatory/governance-and-docs/documentation-usability-canon-plan-20260524.md
      - docs/planning/proposals/mandatory/governance-and-docs/documentation-usability-change-plan-20260308.md
      - docs/architecture/components/ci-governance/documentation-usability-canon-component.md
      - docs/architecture/components/ci-governance/documentation-usability-canon-user-stories.md
      - docs/architecture/components/ci-governance/index.md
      - docs/planning/domains/documentation-governance.md
      - docs/planning/proposals/portfolio-map-20260403.md
      - buzon/20260524-codex-fowler-documentation-usability-canon.md
    greenTest: node --test tools/ci/documentation-usability-canon.test.mjs
symbols:
  - name: requiredFiles
    path: tools/ci/documentation-usability-canon.test.mjs
    dddOwner: Documentation usability canon semantic guard
    cqRails:
      - ClassifyDocumentationEntryPoint
    fowlerSignals:
      - Required artifact set
    architectureGuard: node --test tools/ci/documentation-usability-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs governance semantic guard only
  - name: requiredRails
    path: tools/ci/documentation-usability-canon.test.mjs
    dddOwner: Documentation usability canon semantic guard
    cqRails:
      - ClassifyDocumentationEntryPoint
      - QueryDocumentationConsultationPath
      - ValidateDocumentationUsefulness
    fowlerSignals:
      - Semantic drift guard
    architectureGuard: node --test tools/ci/documentation-usability-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs governance semantic guard only
  - name: readRepoFile
    path: tools/ci/documentation-usability-canon.test.mjs
    dddOwner: Documentation usability canon semantic guard
    cqRails:
      - ValidateDocumentationUsefulness
    fowlerSignals:
      - Semantic drift guard
    architectureGuard: node --test tools/ci/documentation-usability-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs governance semantic guard only
  - name: assertContains
    path: tools/ci/documentation-usability-canon.test.mjs
    dddOwner: Documentation usability canon semantic guard
    cqRails:
      - ValidateDocumentationUsefulness
    fowlerSignals:
      - Documentation drift guard
    architectureGuard: node --test tools/ci/documentation-usability-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs governance semantic guard only
  - name: escapeRegExp
    path: tools/ci/documentation-usability-canon.test.mjs
    dddOwner: Documentation usability canon semantic guard
    cqRails:
      - ValidateDocumentationUsefulness
    fowlerSignals:
      - Test determinism
    architectureGuard: node --test tools/ci/documentation-usability-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs governance semantic guard only
```

## Validation

- `node --test tools/ci/documentation-usability-canon.test.mjs`
- `node scripts/check-feature-mechanization.cjs --feature GD-MAND-DOC-USABILITY`
- `node scripts/check-feature-mechanization.cjs --implementation --feature GD-MAND-DOC-USABILITY`
- `pnpm docs:sync`
- `pnpm docs:status:generate`
- `pnpm verify:prepush`
