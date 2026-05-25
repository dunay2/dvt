---
title: Governance Startup Card Canon Plan
status: Active
owner: Docs / Architecture / Delivery
last_reviewed: 2026-05-24
planning_type: proposal
---

# Governance Startup Card Canon Plan

> Owned concern: canonize the governance startup card as a semantic router with
> explicit rails, invariants, consumers, and validation.

## Governed Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-router-plan-20260402.md`
- [Task: GOV-PROP-DISP-1] Planning DB task `GD-MAND-STARTUP-CARD`

## Fowler Analysis

- Ownership: the router exists, but the owned concern was mostly implicit in
  inventory/protocol prose. Action: name the router component and make startup
  classification the owned concern.
- Bounded context: documentation governance owns startup reading, while
  Planning DB owns task lifecycle. Action: keep route classification in docs
  governance and evidence task closure through Planning DB.
- Semantic compression: mature systems route by intent before deep reference
  reading. Action: preserve the startup-card table, but govern it as route
  semantics rather than formatting.
- [Task: GOV-PROP-DISP-1] Fitness function: markdown/link checks cannot detect route drift. Action: add
  a CI semantic test that checks routes, rails, component guide, stories, and
  Fowler mailbox.
- Evolution constraint: future governance additions can overload the startup
  card. Action: require every new route change to update rails, invariants,
  consumers, and validation.

## Mature-System Comparison

Mature architecture handbooks separate orientation from authority. The startup
card should behave like a routing table in an operations manual: short enough
for bounded work, precise enough to select the correct governing documents, and
backed by a deeper catalog when the task risk needs it.

The current implementation already improved the startup path. This canonization
adds the missing semantic encapsulation so the work is not just "a quick table
near the top of the inventory." It becomes a governed query surface with route
names, minimum baselines, and escalation rules.

## Antipatterns Detected

- [Task: GOV-PROP-DISP-1] **God inventory opening**: forcing every task to read the full catalog before
  routing.
- **Table as policy**: treating the startup card as presentation rather than a
  semantic classifier.
- **Shadow startup notes**: allowing local notes or PR text to explain startup
  routing instead of canonical docs.
- **Validation by syntax only**: passing markdown checks even if a route loses
  its owner or baseline.

## Drift And Repetition

- The original router plan, inventory, AI protocol, evidence doc, and generated
  planning views all discuss the startup card, but only the inventory/protocol
  are live execution surfaces.
- `GOV-S1` closed the implementation; `GD-MAND-STARTUP-CARD` exists to reconcile
  that implemented behavior with current Fowler/rail governance.
- Repetition is useful only when each surface has a role: plan rationale,
  component contract, user scenarios, domain index, and semantic test.

## Applied Pattern

Use an **Intent Router** pattern:

1. `ClassifyGovernanceStartupRoute` classifies work as `code`, `docs`,
   `planning`, `contracts`, `ci`, or `cross-cutting`.
2. `QueryGovernanceStartupRoute` returns the documents to open next and whether
   deep inventory reading is required.
3. `ValidateGovernanceStartupBaseline` proves the selected closeout baseline
   includes the mandatory validation level.

## Command And Query Rail

- `ClassifyGovernanceStartupRoute`
  Type: query. Owning bounded context: documentation governance. DDD object:
  `GovernanceStartupRoute`. Application port: governance inventory startup
  card. Adapter surface: `governance-document-rule-inventory.md` and semantic CI
  test. Scope: public contributor guidance. Negative tests: missing route or
  duplicate active startup surface.
- `QueryGovernanceStartupRoute`
  Type: query. Owning bounded context: documentation governance. DDD read model:
  `GovernanceStartupRouteReadModel`. Application port: AI work protocol startup
  router rule. Adapter surface: `ai-work-protocol.md` and component guide. Scope:
  public contributor guidance. Negative tests: route lacks next documents or
  deep-read escalation.
- `ValidateGovernanceStartupBaseline`
  Type: query. Owning bounded context: governance validation / CI. DDD policy:
  `GovernanceStartupBaselinePolicy`. Application port:
  `tools/ci/startup-card-canon.test.mjs`. Adapter surface: CI tools suite,
  feature-mechanization implementation gate, and PR checks. Scope: repository CI
  and local prepush. Negative tests: baseline omitted, route drift, or missing
  user stories.

## Component Grouping

- `docs/planning/status/governance-document-rule-inventory.md`: runtime
  startup-card table and canonical route definitions.
- `docs/guides/ai-work-protocol.md`: procedural consumer of the startup card.
- `docs/architecture/components/ci-governance/governance-startup-card-canon-component.md`:
  component API, invariants, transitions, consumers, and diagrams.
- `docs/architecture/components/ci-governance/governance-startup-card-canon-user-stories.md`:
  scenario coverage.
- `tools/ci/startup-card-canon.test.mjs`: architecture fitness function.
- `buzon/20260524-codex-fowler-governance-startup-card-canon.md`: Fowler
  analysis mailbox evidence.

## User Stories

- [Task: GOV-PROP-DISP-1] As a bounded-task contributor, I want to classify the task quickly so I open
  the right governing docs without reading unrelated catalog sections.
- As a cross-cutting implementer, I want the card to tell me when deep inventory
  reading is required so I do not under-govern risky changes.
- As a planning operator, I want planning tasks routed to Planning DB and
  generated workboard validation so task lifecycle changes stay canonical.
- As a PR reviewer, I want startup routing changes to have semantic tests so
  route drift is caught before merge.

## ADR Decision

No new ADR is required. This slice canonizes an existing governance router and
does not change a runtime, contract, adapter, or package boundary. If a future
slice adds a new mandatory startup route or changes the governing hierarchy, an
ADR may be warranted.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: GD-MAND-STARTUP-CARD
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-canon-plan-20260524.md
componentGuides:
  - docs/architecture/components/ci-governance/governance-startup-card-canon-component.md
userStories:
  - docs/architecture/components/ci-governance/governance-startup-card-canon-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-router-plan-20260402.md
allowedImplementationSurfaces:
  - buzon/20260524-codex-fowler-governance-startup-card-canon.md
  - docs/.manifest.json
  - docs/architecture/components/ci-governance/governance-startup-card-canon-component.md
  - docs/architecture/components/ci-governance/governance-startup-card-canon-user-stories.md
  - docs/architecture/components/ci-governance/index.md
  - docs/guides/ai-work-protocol.md
  - docs/planning/domains/documentation-governance.md
  - docs/planning/index.md
  - docs/planning/proposals/index.md
  - docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-canon-plan-20260524.md
  - docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-router-plan-20260402.md
  - docs/planning/proposals/portfolio-map-20260403.md
  - docs/planning/state/agent-lane-a.md
  - docs/planning/state/execution-workboard.md
  - docs/planning/state/open-task-route.md # Task: GOV-PROP-DISP-1
  - docs/planning/status/**
  - docs/planning/status/governance-document-rule-inventory.md
  - tools/ci/startup-card-canon.test.mjs
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
commandQueryRails:
  - name: ClassifyGovernanceStartupRoute
    type: query
    dddOwner: Governance startup route classifier
  - name: QueryGovernanceStartupRoute
    type: query
    dddOwner: Governance startup route read model
  - name: ValidateGovernanceStartupBaseline
    type: query
    dddOwner: Governance startup baseline policy
domainObjects:
  - name: GovernanceStartupRoute
    type: value object
    owner: Docs / Architecture / Delivery
  - name: GovernanceStartupRouteReadModel
    type: read model
    owner: Docs / Architecture / Delivery
  - name: GovernanceStartupBaselinePolicy
    type: policy
    owner: Docs / Architecture / Delivery
fowlerSignals:
  - God inventory opening
  - Table as policy
  - Shadow startup notes
  - Syntax-only validation
architectureGuards:
  - node --test tools/ci/startup-card-canon.test.mjs
cypressFlows:
  - N/A - documentation governance semantic guard only
completionGate:
  - node --test tools/ci/startup-card-canon.test.mjs
  - pnpm test:ci-tools
  - pnpm docs:sync
  - pnpm docs:status:generate
  - node scripts/check-feature-mechanization.cjs --feature GD-MAND-STARTUP-CARD
  - node scripts/check-feature-mechanization.cjs --implementation --feature GD-MAND-STARTUP-CARD
  - pnpm lint:md:changed
  - pnpm verify:prepush
redGreenCycles:
  - id: governance-startup-card-canon-rails
    redTest: node --test tools/ci/startup-card-canon.test.mjs
    expectedFailure: Governance startup card canon plan, guide, stories, and buzon analysis do not exist.
    patchSurfaces:
      - tools/ci/startup-card-canon.test.mjs
      - docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-canon-plan-20260524.md
      - docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-router-plan-20260402.md
      - docs/architecture/components/ci-governance/governance-startup-card-canon-component.md
      - docs/architecture/components/ci-governance/governance-startup-card-canon-user-stories.md
      - docs/architecture/components/ci-governance/index.md
      - docs/planning/domains/documentation-governance.md
      - docs/planning/proposals/portfolio-map-20260403.md
      - buzon/20260524-codex-fowler-governance-startup-card-canon.md
    greenTest: node --test tools/ci/startup-card-canon.test.mjs
  - id: governance-startup-card-baseline-review
    redTest: node --test tools/ci/startup-card-canon.test.mjs
    expectedFailure: A route can keep its label while weakening the minimum validation baseline.
    patchSurfaces:
      - tools/ci/startup-card-canon.test.mjs
      - docs/planning/proposals/mandatory/governance-and-docs/governance-startup-card-canon-plan-20260524.md
    greenTest: node --test tools/ci/startup-card-canon.test.mjs
symbols:
  - name: requiredFiles
    path: tools/ci/startup-card-canon.test.mjs
    dddOwner: Governance startup card canon semantic guard
    cqRails:
      - ClassifyGovernanceStartupRoute
    fowlerSignals:
      - Required artifact set
    architectureGuard: node --test tools/ci/startup-card-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs governance semantic guard only
  - name: requiredRails
    path: tools/ci/startup-card-canon.test.mjs
    dddOwner: Governance startup card canon semantic guard
    cqRails:
      - ClassifyGovernanceStartupRoute
      - QueryGovernanceStartupRoute
      - ValidateGovernanceStartupBaseline
    fowlerSignals:
      - Semantic route drift guard
    architectureGuard: node --test tools/ci/startup-card-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs governance semantic guard only
  - name: requiredRouteBaselines
    path: tools/ci/startup-card-canon.test.mjs
    dddOwner: Governance startup card canon semantic guard
    cqRails:
      - ValidateGovernanceStartupBaseline
    fowlerSignals:
      - Route baseline drift guard
      - Startup card validation baseline preservation
    architectureGuard: node --test tools/ci/startup-card-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs governance semantic guard only
  - name: readRepoFile
    path: tools/ci/startup-card-canon.test.mjs
    dddOwner: Governance startup card canon semantic guard
    cqRails:
      - ValidateGovernanceStartupBaseline
    fowlerSignals:
      - Semantic drift guard
    architectureGuard: node --test tools/ci/startup-card-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs governance semantic guard only
  - name: assertContains
    path: tools/ci/startup-card-canon.test.mjs
    dddOwner: Governance startup card canon semantic guard
    cqRails:
      - ValidateGovernanceStartupBaseline
    fowlerSignals:
      - Documentation route drift guard
    architectureGuard: node --test tools/ci/startup-card-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs governance semantic guard only
  - name: escapeRegExp
    path: tools/ci/startup-card-canon.test.mjs
    dddOwner: Governance startup card canon semantic guard
    cqRails:
      - ValidateGovernanceStartupBaseline
    fowlerSignals:
      - Test determinism
    architectureGuard: node --test tools/ci/startup-card-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs governance semantic guard only
```

## Validation Plan

```bash
node --test tools/ci/startup-card-canon.test.mjs
node scripts/check-feature-mechanization.cjs --implementation --feature GD-MAND-STARTUP-CARD
pnpm lint:md:changed
pnpm test:ci-tools
pnpm docs:sync
pnpm docs:status:generate
pnpm verify:prepush
```
