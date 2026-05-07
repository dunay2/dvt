---
title: Doc-Driven Framework And Tooling Plan
status: Accepted
owner: Product / Architecture / Docs / Delivery
last_reviewed: 2026-05-07
planning_type: proposal
---

# Doc-Driven Framework And Tooling Plan

## Goal

Turn the repository's current docs-and-governance toolchain into a coherent
doc-driven operating framework with:

- explicit document taxonomy and lifecycle rules;
- planning and execution tracked as data, not prose only;
- scaffolding and authoring commands that reduce manual friction;
- automated traceability across proposal, lane, evidence, risk, and PR
  surfaces;
- CI gates that validate the model instead of only linting the files.

## Problem

The repo is already governance-heavy and documentation-first, but it is not yet
framework-grade.

What exists today is useful, but fragmented:

- governance routing is explicit through the inventory and AI protocol;
- planning state is source-of-truth YAML with generated views;
- docs sync, workboard generation, ARC checks, and pre-push validation are
  already enforced;
- risk, evidence, ADR, proposal, review, roadmap, and runbook surfaces are all
  present.

What is still missing is a unifying framework layer:

- no canonical authoring scaffolds per document type;
- no single operational model for "how a governed slice moves from idea to
  execution to evidence to closure";
- no first-class traceability object connecting proposal, lane task, risk,
  evidence, and implementation slice;
- too much repo knowledge is still procedural and manual;
- current tooling is strong at rejecting drift, but weaker at helping authors
  produce the right artifacts by construction.

The result is a system that is disciplined, but still expensive to operate.

## Current Baseline

The current stack is not "no tooling." It is a partial framework built from
repo-native scripts and governance documents:

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/planning/state/agent-lane-*.yaml`
- `pnpm docs:sync`
- `pnpm docs:workboard:generate`
- `pnpm verify:prepush`
- `tools/ci/arc-check.mjs`
- GitHub workflows under `.github/workflows/`

This baseline already gives the repo:

- fail-closed validation;
- explicit source-of-truth planning inputs;
- generated navigation and workboard views;
- evidence and risk gates for ARC-triggering slices;
- documentation hygiene checks.

That is a strong foundation. The gap is that these pieces behave more like a
collection of controls than like a productized framework.

## Standard Rationale

This proposal follows a standard docs-as-code conclusion:

1. keep repository-authoritative governance in the repo, not in an external
   SaaS workflow;
2. adopt proven patterns from mature systems instead of inventing a custom
   philosophy;
3. avoid a portal-first rewrite that would add platform cost before fixing the
   model;
4. introduce the minimum framework needed to reduce authoring friction and
   improve traceability.

In other words:

- do not replace the current repo-native approach with Backstage-only or
  Docusaurus-only governance;
- do not keep growing bespoke scripts without an explicit operating model;
- converge on a hybrid model: mature information architecture plus repo-native
  automation.

## Mature Patterns To Reuse

The target framework should borrow from mature systems rather than from
greenfield invention:

- `Diataxis` for document intent taxonomy:
  tutorial, how-to, explanation, reference
- `ADR` practice for architectural decisions and decision lifecycle
- `Docs as Code` repositories that treat docs, contracts, and validation as one
  delivery system
- `Backstage TechDocs` style service thinking:
  docs are discoverable products with ownership and lifecycle
- `MkDocs Material` / `Docusaurus` style navigation discipline:
  generated structure, explicit taxonomies, predictable entrypoints
- `OpenAPI` / `AsyncAPI` style contract-to-generated-artifact posture:
  source-of-truth plus machine validation

The proposal does not recommend adopting all of those tools directly. It
recommends adopting their operating ideas and only adding external tooling where
the repo-native stack is clearly insufficient.

## Decision

Adopt a repo-native doc-driven framework with five explicit layers:

1. `Information architecture`
2. `Planning as data`
3. `Traceability spine`
4. `Authoring toolkit`
5. `Validation and publishing`

The repo remains Markdown + YAML + scripts + CI as the execution substrate.

The new part is that those pieces become one declared framework instead of a
set of isolated rules.

## Target Framework

### 1. Information architecture

Every governed document family must have:

- one declared purpose;
- one canonical location;
- one lifecycle model;
- one template or frontmatter contract;
- one navigation entrypoint.

Minimum families:

- `ADR`
- `contract`
- `proposal`
- `review`
- `closeout`
- `evidence`
- `risk`
- `runbook`
- `status`

This layer should explicitly combine current repo governance with a `Diataxis`
style reading model so users know whether a page is:

- explanatory architecture;
- operational guide;
- normative reference;
- execution planning.

### 2. Planning as data

Planning state should continue to live in machine-readable tracked sources.

The repo already does this well with lane YAML. The next step is to extend the
same discipline to proposal execution metadata:

- proposal status;
- owning lane and task;
- dependencies;
- rollout wave;
- acceptance status;
- replacement or supersession links.

Target principle:

planning prose explains;
planning data routes and validates.

### 3. Traceability spine

A governed slice should be able to answer, mechanically:

- which proposal authorized it;
- which lane task owns it;
- which risks it mitigates or creates;
- which evidence proves it;
- which closeout closed it;
- which PR or commit shipped it.

That traceability should not depend on a human reading long prose carefully.
It should be derivable from stable references and validated relationships.

### 4. Authoring toolkit

Current tooling validates well but scaffolds weakly. The framework needs:

- `new proposal` scaffold
- `new review` scaffold
- `new evidence` scaffold
- `new risk` scaffold
- `new runbook` scaffold
- lane-task creation helper for YAML-backed work items
- relationship helper for linking proposal, task, evidence, and risk

The practical goal is simple:

authors should spend their effort on content and decisions, not on remembering
file placement, frontmatter, or cross-link ritual.

### 5. Validation and publishing

Current fail-closed validation should be kept, but upgraded from file hygiene to
model validation.

Examples of target checks:

- every mandatory proposal has an owning lane task;
- every `done` task has evidence or closeout;
- every ARC-triggering slice has matching evidence and risk entries;
- proposal supersession chains are valid;
- indexes and navigation only point to active canonical surfaces;
- doc templates satisfy required frontmatter and section contracts.

## Options Considered

### Option A: Keep the current bespoke scripts and docs only

Pros:

- zero migration cost;
- no new framework decisions;
- preserves current contributor habits.

Cons:

- authoring friction stays high;
- traceability remains partly manual;
- governance keeps growing by accretion;
- repo knowledge remains too dependent on experienced contributors.

### Option B: Adopt an external docs/platform framework as the primary operating layer

Examples:

- Backstage + TechDocs
- MkDocs Material plugins
- Docusaurus plugin stack

Pros:

- stronger publishing and discovery;
- better out-of-the-box docs navigation;
- easier portal-style UX.

Cons:

- high migration and integration cost;
- risk of moving governance outside the real source tree;
- does not solve planning-data or traceability semantics by itself.

### Option C: Hybrid repo-native framework with selective external borrowing

Pros:

- preserves current repo authority and CI posture;
- upgrades the model without a portal rewrite;
- can be delivered incrementally;
- aligns with existing scripts, lanes, ARC checks, and planning state.

Cons:

- still requires disciplined design work;
- some tooling will remain custom;
- publishing UX may still lag full portal platforms for a while.

## Selected Option

Option C.

The repo already has enough governance machinery that a portal-first change
would be premature. The higher-value move is to formalize and reduce the
current operational friction first.

## What Improves

If this proposal is executed, the repo gains:

- lower authoring friction;
- fewer orphan proposals and ad hoc planning notes;
- clearer document ownership and lifecycle;
- stronger machine-checkable traceability;
- faster onboarding for humans and agents;
- less "read five docs and infer the process" overhead.

## What Does Not Change

This proposal does not change:

- ADR authority;
- shared contract governance;
- ARC evidence and risk requirements;
- repo-native source ownership;
- fail-closed CI posture.

It upgrades how those pieces are authored and connected.

## Execution Waves

### Wave 1: Define the framework contract

- publish the framework proposal
- define canonical document families and lifecycle rules
- define minimal traceability object model
- classify what remains repo-native and what may later move to external tooling

### Wave 2: Scaffold the authoring path

- add scaffold commands for proposal/review/evidence/risk/runbook
- add task-helper support for lane YAML creation or updates
- standardize frontmatter and required section templates

### Wave 3: Validate the planning model

- add checks for proposal-to-lane linkage
- add checks for done-task-to-evidence or closeout linkage
- add checks for supersession and replacement integrity
- add checks for active-vs-historical navigation correctness

### Wave 4: Publish the traceability spine

- generate a governed traceability index across proposal, task, evidence, risk,
  and closeout surfaces
- expose missing-link reports as CI failures or warnings by class
- document contributor workflow for maintaining those links

### Wave 5: Reassess external framework adoption

- after the repo-native framework stabilizes, reassess whether a publishing or
  catalog layer such as Backstage, MkDocs, or Docusaurus adds enough value to
  justify adoption
- do not make that decision before the internal model is coherent

## Lane Mapping

This proposal should be executed under a Lane A governance/docs tracker:

- umbrella: `GOV-S2`
- expected follow-on slices:
  - framework contract and taxonomy
  - scaffolding and authoring commands
  - planning-data validation
  - traceability automation
  - adoption metrics and closeout

## GOV-S2 Closure And Non-Duplication Decision

As of 2026-05-07, `GOV-S2` is closed as the umbrella framework slice. It now
owns the canonical operating model, not an indefinite implementation queue.

The implementation surfaces that satisfy the framework acceptance criteria are:

| Framework concern                            | Canonical closure surface                                                                                                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inventory-first startup and task routing     | `docs/planning/status/governance-document-rule-inventory.md`, `docs/guides/ai-work-protocol.md`, `docs/planning/state/planning-control-tower.md`                                        |
| Information architecture and lifecycle rules | `docs/planning/status/documentation-information-architecture-current-vs-target-20260407.md`, `docs/guides/documentation-maintenance-guide-20260407.md`                                  |
| Planning as data                             | `docs/planning/state/agent-lane-*.yaml`, `docs/planning/state/how-to-add-tasks.md`, `docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md` |
| Traceability and evidence checks             | `pnpm verify:prepush`, `pnpm governance:refresh`, `pnpm test:closeout-changed`, ARC evidence/risk gates, and feature-mechanization gates                                                |
| Generated-governance read side               | `docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md` plus the derived planning/governance query-store checks                                 |

Follow-on implementation work must not reopen `GOV-S2` or create another
governance umbrella for the same intent. It must use concrete task IDs and the
existing command/query rails:

- `GOV-S3-PLANNING-STATE-QUERY-STORE` for derived query-store parity,
  refresh/check/export, and eventual generated-artifact compaction.
- Existing docs governance gates for authoring, closeout, evidence, risk,
  frontmatter, links, and generated-doc ownership.
- Existing lane YAML task entries for any future scoped scaffold or validation
  helper.

The Postgres query store is a derived read model. It may reduce loading and
review fan-out, but it is not a second planning authority and must not replace
Git-tracked proposals, reviews, closeouts, risk, evidence, or lane YAML as
canonical sources.

## Tradeoffs

| Dimension             | Keep current controls only | Hybrid doc-driven framework |
| --------------------- | -------------------------- | --------------------------- |
| Governance rigor      | high                       | high                        |
| Authoring friction    | high                       | medium                      |
| Traceability quality  | medium                     | high                        |
| Migration cost        | low                        | medium                      |
| Platform dependency   | low                        | low                         |
| Long-term scalability | medium                     | high                        |

## Risks

- over-designing the framework before solving the most painful authoring gaps;
- adding more rules without enough scaffolding;
- creating a second planning system instead of extending the current one;
- making CI stricter before contributors have authoring helpers;
- hiding real content problems behind automation complexity.

## Mitigations

- keep execution incremental and wave-based;
- ship scaffolding before adding new hard gates where possible;
- reuse lane YAML and current planning entrypoints instead of creating parallel
  sources;
- treat external platforms as optional later layers, not immediate
  prerequisites.

## Non-Goals

- replacing repo-native docs with a SaaS planning tool;
- rewriting the full docs tree in one wave;
- adopting Backstage, MkDocs, or Docusaurus as a mandatory immediate platform;
- moving canonical governance out of the repository;
- relaxing current validation rigor.

## Acceptance Criteria

1. The repo has one explicit doc-driven operating framework proposal and lane
   owner instead of scattered intent.
2. A contributor can discover canonical doc families, authoring expectations,
   and lifecycle rules without guessing.
3. Framework rollout is sequenced as lane-backed work, not left as a narrative
   note.
4. The proposal clearly distinguishes current controls from the target
   framework.
5. The proposal leaves room for later external tooling, but does not depend on
   it now.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: GOV-S2-DOC-DRIVEN-FRAMEWORK-CLOSEOUT
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/doc-driven-framework-and-tooling-plan-20260404.md
componentGuides:
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/planning/state/planning-control-tower.md
  - docs/planning/state/how-to-add-tasks.md
  - docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md
userStories:
  - docs/planning/proposals/mandatory/governance-and-docs/doc-driven-framework-and-tooling-plan-20260404.md
  - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
  - docs/planning/closeouts/20260507-gov-s2-doc-driven-operating-framework-closeout.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/planning/state/planning-control-tower.md
  - docs/planning/state/how-to-add-tasks.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/governance-and-docs/doc-driven-framework-and-tooling-plan-20260404.md
  - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
  - docs/planning/status/documentation-information-architecture-current-vs-target-20260407.md
  - docs/planning/state/agent-lane-a.yaml
  - docs/planning/state/domain-status-board.md
  - docs/planning/closeouts/20260507-gov-s2-doc-driven-operating-framework-closeout.md
  - docs/planning/status/**
  - docs/.manifest.json
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
  - .github/**
  - scripts/**
  - tools/**
  - package.json
commandQueryRails:
  - name: CloseDocDrivenOperatingFramework
    type: command
    dddOwner: DocDrivenOperatingFramework
  - name: ReconcilePlanningGovernanceAuthority
    type: query
    dddOwner: PlanningGovernanceAuthorityProjection
domainObjects:
  - name: DocDrivenOperatingFramework
    type: governance framework aggregate
    owner: Product / Architecture / Docs / Delivery
  - name: PlanningGovernanceAuthorityProjection
    type: governance read model
    owner: Product / Architecture / Docs / Delivery
fowlerSignals:
  - Duplicate semantics
  - Documentation drift
  - Single Source of Truth
  - Explicit Gate
architectureGuards:
  - pnpm docs:feature-mechanization --feature GOV-S2-DOC-DRIVEN-FRAMEWORK-CLOSEOUT
  - pnpm docs:feature-mechanization:implementation
  - pnpm governance:refresh
cypressFlows:
  - N/A - governance closeout has no browser workflow.
completionGate:
  - pnpm docs:feature-mechanization --feature GOV-S2-DOC-DRIVEN-FRAMEWORK-CLOSEOUT
  - pnpm docs:feature-mechanization:implementation
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: gov-s2-closeout-surface-guard
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: GOV-S2 closeout, domain-board, and proposal edits are outside allowedImplementationSurfaces before this manifest declares the governance closeout surfaces.
    patchSurfaces:
      - docs/planning/proposals/mandatory/governance-and-docs/doc-driven-framework-and-tooling-plan-20260404.md
      - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
      - docs/planning/status/documentation-information-architecture-current-vs-target-20260407.md
      - docs/planning/state/agent-lane-a.yaml
      - docs/planning/state/domain-status-board.md
      - docs/planning/closeouts/20260507-gov-s2-doc-driven-operating-framework-closeout.md
      - docs/planning/status/**
      - docs/.manifest.json
    greenTest: pnpm docs:feature-mechanization:implementation
symbolDefaults: &govS2CloseoutSymbolDefaults
  dddOwner: DocDrivenOperatingFramework
  cqRails:
    - CloseDocDrivenOperatingFramework
    - ReconcilePlanningGovernanceAuthority
  fowlerSignals:
    - Duplicate semantics
    - Documentation drift
    - Single Source of Truth
  architectureGuard: pnpm docs:feature-mechanization:implementation
  cypressCoverage: N/A - governance closeout has no browser workflow.
  unitTests:
    - pnpm docs:feature-mechanization --feature GOV-S2-DOC-DRIVEN-FRAMEWORK-CLOSEOUT
    - pnpm docs:feature-mechanization:implementation
symbols:
  - <<: *govS2CloseoutSymbolDefaults
    name: GovS2DocDrivenFrameworkPlan
    path: docs/planning/proposals/mandatory/governance-and-docs/doc-driven-framework-and-tooling-plan-20260404.md
  - <<: *govS2CloseoutSymbolDefaults
    name: GovS2QueryStoreBoundary
    path: docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
  - <<: *govS2CloseoutSymbolDefaults
    name: GovS2LaneClosure
    path: docs/planning/state/agent-lane-a.yaml
  - <<: *govS2CloseoutSymbolDefaults
    name: GovS2DomainStatusClosure
    path: docs/planning/state/domain-status-board.md
  - <<: *govS2CloseoutSymbolDefaults
    name: GovS2Closeout
    path: docs/planning/closeouts/20260507-gov-s2-doc-driven-operating-framework-closeout.md
```

## References

- [Governance Document And Rule Inventory](../../../status/governance-document-rule-inventory.md)
- [AI Work Protocol](../../../../guides/ai-work-protocol.md)
- [Planning Control Tower](../../../state/planning-control-tower.md)
- [Proposal Portfolio Map 2026-04-03](../../portfolio-map-20260403.md)
- [Architecture Documentation Reconciliation Plan](./architecture-doc-reconciliation-plan-20260402.md)
- [Generated Planning Surfaces Extraction Plan](./generated-planning-surfaces-extraction-plan-20260403.md)
- [package.json](../../../../../package.json)
- [.github/workflows/ci.yml](../../../../../.github/workflows/ci.yml)
- [.github/workflows/pr-quality-gate.yml](../../../../../.github/workflows/pr-quality-gate.yml)
