---
title: System Governance Unit Index Plan
status: Review
owner: Architecture / Docs / Delivery
last_reviewed: 2026-05-01
planning_type: proposal
---

# System Governance Unit Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` or the repository AI work protocol to execute
> this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** create a governed, hierarchical index of DVT system units from
system-level domains down to source files and exported operations, with DDD
ownership, command/query rails, governing documentation, status, drift, tests,
and next subdivision recorded for every unit.

**Architecture:** mature systems govern architecture through stable unit maps,
bounded contexts, explicit dependencies, and traceable contracts. This plan
adds that control surface without replacing existing ADRs, proposals, reviews,
or status docs: it indexes them and makes gaps visible.

**Tech Stack:** Markdown governance docs, planning lane YAML, generated docs
indexes, existing repository validation scripts, and later architecture tests.

---

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/reference-architecture.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/planning/status/system-operations-inventory-20260501.md`
- `docs/planning/status/canonical-doc-code-matrix.md`
- `docs/architecture/system-delivery-status.md`
- `docs/concepts/domain-language.md`
- `docs/concepts/repository-map.md`

## Problem Summary

DVT has many governance surfaces: ADRs, contracts, status docs, closeouts,
risk entries, proposal plans, code ownership, and package-level tests. Those
surfaces are useful but not yet organized as a single hierarchical map of the
system. That makes it easy for work to be framed at the wrong granularity:
large buckets such as `apps/web`, `apps/api`, `@dvt/adapter-postgres`, or
`@dvt/engine` hide smaller units with different DDD owners, command/query
rails, dependency rules, and legacy posture.

The current system operations inventory is a good runtime/domain slice, but it
is not the root map for the whole system. The next governance surface must
subdivide DVT into units that can be progressively refined until each source
file and exported operation has a parent, owner, rail, and validation route.

## Root Cause

The repository has strong local governance but weak global unit indexing:

- ADRs govern decisions, not every implementation unit.
- Planning lanes govern tasks, not every system surface.
- The operations inventory classifies runtime operations, not all units.
- Frontend, docs, CI, and governance infrastructure do not yet have the same
  hierarchical unit treatment as backend runtime surfaces.
- Existing documents are authoritative in their own areas, but there is no
  single map that says which document governs which unit.

The result is avoidable boundary drift: some work can be described as a package
or app change even when the real unit is a route, use case, adapter, workflow,
view, hook, projection, policy, contract family, or generated artifact.

## Mature-System Model

The target model follows mature architecture practice:

- **bounded-context map** for system-level ownership;
- **context map / dependency rules** for allowed and forbidden dependencies;
- **application service and port catalog** for command/query rails;
- **component inventory** for deployable and library units;
- **source inventory** for files and exported operations;
- **documentation cross-reference** so ADRs, contracts, plans, reviews,
  closeouts, risk entries, and tests attach to concrete units;
- **architecture guard backlog** for unit rules that can be checked
  mechanically.

The index is not a replacement for ADRs or contracts. It is a routing surface:
it tells contributors where the authority lives and what must be checked before
changing a unit.

## Fowler Opportunity Model

Every unit subdivision must record which Fowler-style opportunity, if any,
motivates the split:

| Fowler signal           | System symptom                                           | Governance response                                                                     |
| ----------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Boundary drift          | route, view, adapter, or worker owns domain behavior     | create a unit with DDD owner and C&Q rail, then move behavior behind the owned boundary |
| Responsibility overload | one package/module has unrelated reasons to change       | split into child units by use case, port, adapter, projection, or workflow              |
| Duplicate semantics     | same intent exists under several local names             | attach all synonyms to one command/query rail and mark duplicates as drift              |
| Feature envy            | a unit reads another unit's internals to decide behavior | move the decision to the owning unit or expose an intention-revealing port              |
| Primitive obsession     | strings, booleans, and option bags carry policy          | name value objects, request objects, or policy units                                    |
| Data clump              | repeated argument trains cross boundaries                | introduce scope/request units with owner and validation                                 |
| Hidden authority        | mock, fixture, UI state, or local cache decides truth    | route authority through a governed command or query                                     |
| Anemic domain           | services mutate state without invariant owner            | name aggregate, domain service, policy, projection, or read model owner                 |
| Test-only confidence    | tests assert wiring or strings but not semantics         | add negative, architecture, contract, or workflow tests                                 |
| Documentation drift     | docs describe a different system than code               | link the stale doc to the affected unit and define disposition                          |

## Unit Model

Every governed unit must use the same fields.

| Field                    | Meaning                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `Unit ID`                | Stable identifier, for example `SYS-PLANSTORE-POSTGRES`                               |
| `Name`                   | Human-readable unit name                                                              |
| `Level`                  | `system`, `domain`, `workspace`, `module`, `component`, `source`, or `symbol`         |
| `Parent`                 | Parent unit ID, except for the root unit                                              |
| `Paths`                  | Repository paths that implement or document the unit                                  |
| `DDD owner`              | bounded context, `AGG`, `DS`, `AS`, `PORT`, `ADP`, `PROJ`, `INFRA`, `ENTRY`, or `N/A` |
| `C&Q rails`              | accepted/proposed command and query rows, or `none` with rationale                    |
| `Governance sources`     | ADRs, contracts, proposals, reviews, closeouts, risks, or status docs                 |
| `Runtime role`           | route, use case, adapter, worker, projection, UI view, schema, test, docs, CI         |
| `Status`                 | `canonical`, `review`, `drift`, `legacy`, `coverage-required`, or `superseded`        |
| `Fowler signal`          | opportunity type that explains the unit split                                         |
| `Allowed dependencies`   | units this unit may depend on                                                         |
| `Forbidden dependencies` | dependencies that would create drift                                                  |
| `Tests / validation`     | commands, test files, architecture guards, or missing validation                      |
| `Next subdivision`       | child units to create in the next pass                                                |

## Status Semantics

| Status              | Meaning                                                                  |
| ------------------- | ------------------------------------------------------------------------ |
| `canonical`         | current implementation and docs agree with governance                    |
| `review`            | documented but awaiting architecture review or acceptance                |
| `drift`             | current shape violates governance but is not necessarily legacy behavior |
| `legacy`            | active behavior or import path must be removed or superseded             |
| `coverage-required` | unit is known and must be inventoried before related closure is claimed  |
| `superseded`        | unit exists only as historical or transition context                     |

`coverage-required` is not a softer word for drift. It means the unit has not
yet been decomposed deeply enough to make a drift judgment. A closure claim
that depends on that unit is blocked until the unit is subdivided.

## Target Documents

Create:

- `docs/planning/status/system-governance-unit-taxonomy-20260501.md`
- `docs/planning/status/system-governance-unit-index-20260501.md`
- `docs/planning/status/system-governance-unit-index.units.yaml`
- `scripts/check-governance-unit-coverage.cjs`
- `scripts/check-governance-unit-coverage.test.cjs`

Modify:

- `docs/planning/status/system-operations-inventory-20260501.md`
- `docs/planning/proposals/portfolio-map-20260403.md`
- `docs/planning/state/agent-lane-a.yaml`

Generated:

- run `pnpm docs:sync` after adding docs;
- run `pnpm docs:workboard:generate` after lane YAML changes.
- run `pnpm docs:governance:unit-coverage` after manifest changes.

## Phase 0: Existing Documentation Review

Before inventing units, review existing documentation and attach it to the
unit model. This prevents a parallel governance system.

### Required source scan

- Architecture entrypoints:
  - `docs/architecture/index.md`
  - `docs/architecture/reference-architecture.md`
  - `docs/architecture/system-delivery-status.md`
  - `docs/architecture/command-query-rail-governance.md`
  - `docs/architecture/fowler-opportunity-planning-governance.md`
- Concepts:
  - `docs/concepts/domain-language.md`
  - `docs/concepts/repository-map.md`
  - `docs/concepts/glossary.md`
- Contracts:
  - `docs/contracts/index.md`
  - `docs/architecture/components/engine/contracts/VERSIONING.md`
- Planning:
  - `docs/planning/state/planning-control-tower.md`
  - `docs/planning/status/canonical-doc-code-matrix.md`
  - `docs/planning/status/system-operations-inventory-20260501.md`
  - active mandatory proposals under `docs/planning/proposals/mandatory/**`
  - active reviews under `docs/planning/reviews/**`
- Evidence and risk:
  - `docs/evidence/index.md`
  - `docs/risk-register/index.md`
  - quality risks under `docs/risk-register/quality/**`

### Output

Each reviewed doc must be classified as one of:

- `governs unit`
- `describes unit`
- `tracks drift`
- `tracks risk`
- `proves evidence`
- `historical/reference only`
- `needs disposition`

The first unit index must link to existing docs instead of duplicating their
full content.

## Phase 1: Create The Taxonomy

- [ ] Create `system-governance-unit-taxonomy-20260501.md`.
- [ ] Define unit levels and allowed parent-child relationships.
- [ ] Define status semantics.
- [ ] Define ID naming rules.
- [ ] Define DDD owner vocabulary.
- [ ] Define C&Q attachment rule: no command/query without DDD owner.
- [ ] Define documentation attachment rule.
- [ ] Define validation expectations for each status.
- [ ] Define that every tracked file must be owned by exactly one `component`
      or `source` unit.
- [ ] Run markdown lint on the taxonomy.

## Phase 2: Create The Root Unit Index

- [ ] Create `system-governance-unit-index-20260501.md`.
- [ ] Add root unit `SYS-DVT`.
- [ ] Add first-level units:
  - `SYS-CONTRACTS`
  - `SYS-RUNTIME`
  - `SYS-PLANSTORE`
  - `SYS-API`
  - `SYS-WEB`
  - `SYS-PLANNER`
  - `SYS-ADAPTERS`
  - `SYS-WORKERS`
  - `SYS-OBSERVABILITY`
  - `SYS-TRACEABILITY`
  - `SYS-CI-GOVERNANCE`
  - `SYS-DOCS-GOVERNANCE`
- [ ] For each unit, record paths, DDD owner, C&Q posture, governance sources,
      status, and next subdivision.
- [ ] Mark `SYS-WEB` as `coverage-required`, not as drift.
- [ ] Mark `SYS-PLANSTORE` as `review` with active S08 drift references.
- [ ] Create the machine-readable unit manifest with broad component coverage
      for every tracked repository file.
- [ ] Add the unit coverage guard script and tests.
- [ ] Wire `pnpm docs:governance:unit-coverage` into repository validation.
- [ ] Run markdown lint on the index.

## Phase 3: Link Existing Inventory And Planning Surfaces

- [ ] Update `system-operations-inventory-20260501.md` to identify itself as a
      runtime/domain operation view that feeds the unit index.
- [ ] Link `SYS-PLANSTORE`, `SYS-API`, `SYS-WORKERS`, and `SYS-RUNTIME` from
      the operations inventory.
- [ ] Update `portfolio-map-20260403.md` so the plan is visible under mandatory
      governance/docs proposals.
- [ ] Update `agent-lane-a.yaml` only if S08 or architecture lane posture
      changes.
- [ ] Run `pnpm docs:sync`.
- [ ] Run `pnpm docs:workboard:generate` if lane YAML changed.

## Phase 4: First Deep Subdivision - `SYS-PLANSTORE`

This is the first critical unit because it governs S08.

Create child units:

- `SYS-PLANSTORE-CONTRACTS`
- `SYS-PLANSTORE-ARTIFACTS-PORTS`
- `SYS-PLANSTORE-POSTGRES`
- `SYS-PLANSTORE-API-COMPOSITION`
- `SYS-PLANSTORE-TEMPORAL-COMPOSITION`
- `SYS-PLANSTORE-ENGINE-FETCH`
- `SYS-PLANSTORE-TESTS`
- `SYS-PLANSTORE-DOCS-RISK`

Each child must map to:

- `PS-Cxx` and `PS-Qxx` rows where applicable;
- S08 drift IDs;
- paths;
- DDD owner;
- allowed dependencies;
- forbidden legacy dependencies;
- tests or missing tests.

## Phase 5: First Frontend Subdivision - `SYS-WEB`

This is required because frontend behavior is part of the command/query rail.

Create child units:

- `SYS-WEB-ADMIN`
- `SYS-WEB-RUNS`
- `SYS-WEB-PLANS`
- `SYS-WEB-API-CLIENT`
- `SYS-WEB-STATE`
- `SYS-WEB-TESTS`

Each child must identify:

- commands triggered by UI actions;
- queries/read models consumed by views and hooks;
- mocked behavior that may hide backend drift;
- user-flow tests that encode current behavior;
- API contracts or routes that govern the UI.

## Phase 6: Architecture Guard Backlog

After the first two deep subdivisions, define architecture guards but do not
implement them until their unit rules are reviewed.

Initial guard candidates:

- every workspace must have a root unit;
- every root unit must have at least one governance source;
- no `legacy` unit may be marked `canonical`;
- no C&Q rail may exist without DDD owner;
- `apps/web` user workflows must map to API commands/queries;
- S08 closure cannot be claimed while `SYS-PLANSTORE-*` units remain
  `coverage-required`, `drift`, or `legacy`.

## API Component Planning Correction

This plan does not authorize ad hoc component creation inside `apps/api`.
The API route-registration extraction is classified as module/source work
inside already planned API units:

| Implementation file                                                     | Planned owning unit             | Classification                                        | DDD owner | C&Q posture                                                                                    | Validation                                                                                   |
| ----------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `apps/api/src/routes/registerOperationalRoutes.ts`                      | `SYS-API-OPS-ROUTES`            | source/module registrar under existing component      | `ENTRY`   | Implements existing API operational readiness queries; does not define a new product rail      | `pnpm --filter dvt-api test -- test/routes/registerOperationalRoutes.test.ts`                |
| `apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts`       | `SYS-API-HTTP-ENTRYPOINTS`      | source/module registrar under existing component      | `ENTRY`   | Wires existing protected runtime command/query route rails; does not define a new product rail | `pnpm --filter dvt-api test -- test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts` |
| `apps/api/test/routes/registerOperationalRoutes.test.ts`                | `SYS-API-TESTS`                 | source-level validation under API test component      | `INFRA`   | Validates operational-route registration semantics                                             | `pnpm --filter dvt-api test -- test/routes/registerOperationalRoutes.test.ts`                |
| `apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts` | `SYS-API-HTTP-ENTRYPOINT-TESTS` | source-level validation under API HTTP test component | `INFRA`   | Validates protected runtime route registration semantics                                       | `pnpm --filter dvt-api test -- test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts` |

No new API component IDs are accepted by this correction. A future API
component subdivision must be planned first in the unit index or a mandatory
proposal, then implemented after review.

## Feature Mechanization Manifest

This plan owns the governance-index and file-fingerprint implementation
surfaces and the API route-registration module extraction that proves unit
subdivision is not documentation-only. The manifest keeps the
repository-level implementation guard from binding governance changes to
unrelated frontend feature manifests.
Because the file/component and fingerprint indexes are exhaustive generated
artifacts, the integration PR may use the repository size-gate exemption marker
when the generated YAML projections exceed the default PR line budget.

```feature-mechanization
version: 1
featureId: SYS-GOV-UNIT-INDEX
mechanizationStatus: closed
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/system-governance-unit-index-plan-20260501.md
componentGuides:
  - docs/planning/status/system-governance-unit-taxonomy-20260501.md
userStories:
  - docs/planning/status/system-governance-unit-index-20260501.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/adr/ADR-0053-file-state-fingerprint-governance.md
allowedImplementationSurfaces:
  - .github/workflows/pr-quality-gate.yml
  - apps/api/package.json
  - apps/api/src/app.ts
  - apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts
  - apps/api/src/plugins/env.ts
  - apps/api/test/application/services/applicationArchitectureAst.support.ts
  - apps/api/test/entrypoints/http/startRunControlBoundary.architecture.test.ts
  - apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
  - apps/api/test/plugins/env.test.ts
  - apps/api/test/plugins/observability.test.ts
  - apps/api/test/modules/protectedRuntimeAndPlanCompileArchitecture.cases.ts
  - apps/api/src/routes/registerOperationalRoutes.ts
  - apps/api/test/routes/registerOperationalRoutes.test.ts
  - docs/.manifest.json
  - docs/adr/ADR-0053-file-state-fingerprint-governance.md
  - docs/adr/index.md
  - docs/generated-docs-policy.json
  - docs/guides/testing-and-ci-capabilities.md
  - docs/planning/proposals/mandatory/governance-and-docs/governance-file-index-sharding-plan-20260503.md
  - docs/planning/proposals/mandatory/governance-and-docs/system-governance-unit-index-plan-20260501.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/api-governance-subdivision-plan-20260502.md
  - docs/risk-register/quality/R-20260503-PROTECTED-RUNTIME-RAIL-CLOSURE.yaml
  - docs/planning/status/**
  - package.json
  - pnpm-lock.yaml
  - scripts/check-governance-changed-files.cjs
  - scripts/check-governance-changed-files.test.cjs
  - scripts/check-governance-file-fingerprint-baseline.cjs
  - scripts/check-governance-file-fingerprint-baseline.test.cjs
  - scripts/check-governance-unit-coverage.cjs
  - scripts/check-governance-unit-coverage.test.cjs
  - scripts/generate-governance-coverage-report.cjs
  - scripts/generate-governance-coverage-report.test.cjs
  - scripts/generate-governance-document-unit-map.cjs
  - scripts/generate-governance-file-component-index.cjs
  - scripts/generate-governance-file-component-index.test.cjs
  - scripts/generate-governance-remediation-queue.cjs
  - scripts/generate-governance-remediation-queue.test.cjs
  - tools/ci/docs-manifest-contract.test.mjs
  - tools/ci/workflow-pattern-parity.test.mjs
  - tools/docs/generate-docs-manifest.ts
forbiddenImplementationSurfaces:
  - apps/web/**
  - apps/temporal-worker/**
  - apps/outbox-worker/**
  - apps/projector-worker/**
  - apps/lineage-worker/**
  - packages/**
  - specs/contracts/**
commandQueryRails:
  - name: GenerateGovernanceUnitCoverage
    type: command
    dddOwner: Repository governance unit index
  - name: GenerateGovernanceDocumentUnitMap
    type: command
    dddOwner: Repository governance document map
  - name: GenerateGovernanceFileComponentIndex
    type: command
    dddOwner: Repository governance file/component index
  - name: AcceptGovernanceFileFingerprintBaseline
    type: command
    dddOwner: Repository governance file fingerprint baseline
  - name: CheckGovernanceFileFingerprintBaseline
    type: query
    dddOwner: Repository governance file fingerprint baseline
  - name: RenderGovernanceFileFingerprintImpact
    type: query
    dddOwner: Repository governance file fingerprint impact report
  - name: GenerateGovernanceCoverageReport
    type: query
    dddOwner: Repository governance coverage report
  - name: GenerateGovernanceRemediationQueue
    type: query
    dddOwner: Repository governance remediation queue
  - name: CheckGovernanceChangedFiles
    type: query
    dddOwner: Repository governance changed-file gate
  - name: GenerateDocsGovernanceManifest
    type: command
    dddOwner: Repository docs governance manifest
  - name: QueryDocsGovernanceManifestAuditCatalog
    type: query
    dddOwner: Repository docs governance manifest
  - name: RegisterApiOperationalRoutesModule
    type: command
    dddOwner: SYS-API-OPS-ROUTES source/module registrar
  - name: RegisterApiProtectedRuntimeRoutesModule
    type: command
    dddOwner: SYS-API-HTTP-ENTRYPOINTS source/module registrar
domainObjects:
  - name: GovernanceUnitIndex
    type: generated status aggregate
    owner: SYS-DOCS-GOVERNANCE-ROOT
  - name: GovernanceDocumentUnitMap
    type: generated status projection
    owner: SYS-DOCS-GOVERNANCE-ROOT
  - name: GovernanceFileComponentIndex
    type: generated status projection
    owner: SYS-DOCS-GOVERNANCE-ROOT
  - name: GovernanceFileFingerprintBaseline
    type: accepted fingerprint baseline
    owner: SYS-DOCS-GOVERNANCE-ROOT
  - name: GovernanceCoverageReport
    type: generated coverage read model
    owner: SYS-DOCS-GOVERNANCE-ROOT
  - name: GovernanceRemediationQueue
    type: generated remediation read model
    owner: SYS-DOCS-GOVERNANCE-ROOT
  - name: GovernanceChangedFileSet
    type: pull-request diff read model
    owner: SYS-DOCS-GOVERNANCE-ROOT
  - name: DocsGovernanceManifest
    type: compact generated docs catalog
    owner: SYS-DOCS-GOVERNANCE-ROOT
  - name: ApiOperationalRoutesComponent
    type: API route composition component
    owner: SYS-API-OPS-ROUTES
  - name: ApiProtectedRuntimeRoutesComponent
    type: API protected runtime route composition component
    owner: SYS-API-HTTP-ENTRYPOINTS
fowlerSignals:
  - Documentation drift
  - Hidden authority
  - Boundary drift
architectureGuards:
  - pnpm docs:governance:unit-coverage
  - pnpm docs:governance:document-unit-map:check
  - pnpm docs:governance:file-component-index:check
  - pnpm docs:governance:file-fingerprint-baseline:check
  - pnpm docs:governance:file-fingerprint-impact:check
  - pnpm docs:governance:coverage-report:check
  - pnpm docs:governance:remediation-queue:check
  - pnpm docs:governance:changed-files:check
  - pnpm docs:gov:manifest:check
  - pnpm test:docs:governance:coverage-report
  - pnpm test:docs:governance:remediation-queue
  - pnpm test:docs:governance:changed-files
  - pnpm exec node --test tools/ci/docs-manifest-contract.test.mjs
  - pnpm --filter dvt-api test -- test/routes/registerOperationalRoutes.test.ts
  - pnpm --filter dvt-api test -- test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
  - pnpm --filter dvt-api typecheck
cypressFlows:
  - N/A - repository governance docs and CI only
completionGate:
  - pnpm test:docs:governance:unit-coverage
  - pnpm test:docs:governance:document-unit-map
  - pnpm test:docs:governance:file-component-index
  - pnpm test:docs:governance:file-fingerprint-baseline
  - pnpm test:docs:governance:coverage-report
  - pnpm test:docs:governance:remediation-queue
  - pnpm test:docs:governance:changed-files
  - pnpm --filter dvt-api test -- test/routes/registerOperationalRoutes.test.ts
  - pnpm --filter dvt-api test -- test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
  - pnpm --filter dvt-api typecheck
  - pnpm ci:docs
  - pnpm verify:prepush
redGreenCycles:
  - id: governance-unit-coverage
    redTest: pnpm test:docs:governance:unit-coverage
    expectedFailure: Unowned tracked files or invalid unit parent chains are rejected.
    patchSurfaces:
      - scripts/check-governance-unit-coverage.cjs
      - docs/planning/status/system-governance-unit-index.units.yaml
    greenTest: pnpm test:docs:governance:unit-coverage
  - id: governance-file-component-index
    redTest: pnpm test:docs:governance:file-component-index
    expectedFailure: File/component index generation rejects stale or unstable ownership projections.
    patchSurfaces:
      - scripts/generate-governance-file-component-index.cjs
      - docs/planning/status/system-governance-file-index.files.yaml
    greenTest: pnpm test:docs:governance:file-component-index
  - id: governance-file-fingerprint-baseline
    redTest: pnpm test:docs:governance:file-fingerprint-baseline
    expectedFailure: Accepted fingerprint baseline drift is reported before merge.
    patchSurfaces:
      - scripts/check-governance-file-fingerprint-baseline.cjs
      - docs/planning/status/system-governance-file-fingerprint-baseline.yaml
    greenTest: pnpm test:docs:governance:file-fingerprint-baseline
  - id: governance-coverage-report
    redTest: pnpm test:docs:governance:coverage-report
    expectedFailure: Governance coverage report must expose totals, drift, legacy, and subdivision gaps.
    patchSurfaces:
      - scripts/generate-governance-coverage-report.cjs
      - scripts/generate-governance-coverage-report.test.cjs
      - docs/planning/status/system-governance-coverage-report.coverage.yaml
      - docs/planning/status/system-governance-coverage-report-20260502.md
    greenTest: pnpm test:docs:governance:coverage-report
  - id: governance-remediation-queue
    redTest: pnpm test:docs:governance:remediation-queue
    expectedFailure: Coverage gaps must become component-scoped remediation tasks.
    patchSurfaces:
      - scripts/generate-governance-remediation-queue.cjs
      - scripts/generate-governance-remediation-queue.test.cjs
      - docs/planning/status/system-governance-remediation-queue.queue.yaml
      - docs/planning/status/system-governance-remediation-queue-20260502.md
    greenTest: pnpm test:docs:governance:remediation-queue
  - id: governance-changed-files
    redTest: pnpm test:docs:governance:changed-files
    expectedFailure: Changed files without accepted file-index and fingerprint state are rejected.
    patchSurfaces:
      - scripts/check-governance-changed-files.cjs
      - scripts/check-governance-changed-files.test.cjs
      - .github/workflows/pr-quality-gate.yml
    greenTest: pnpm test:docs:governance:changed-files
  - id: docs-governance-manifest-compaction
    redTest: pnpm exec node --test tools/ci/docs-manifest-contract.test.mjs
    expectedFailure: Tracked docs manifest must stay compact while full audit output remains available on demand.
    patchSurfaces:
      - tools/docs/generate-docs-manifest.ts
      - tools/ci/docs-manifest-contract.test.mjs
      - docs/.manifest.json
    greenTest: pnpm exec node --test tools/ci/docs-manifest-contract.test.mjs
  - id: api-operational-routes-module
    redTest: pnpm --filter dvt-api test -- test/routes/registerOperationalRoutes.test.ts
    expectedFailure: API operational routes are not mounted through a planned source/module registrar.
    patchSurfaces:
      - apps/api/src/routes/registerOperationalRoutes.ts
      - apps/api/test/routes/registerOperationalRoutes.test.ts
      - apps/api/src/app.ts
    greenTest: pnpm --filter dvt-api test -- test/routes/registerOperationalRoutes.test.ts
  - id: api-protected-runtime-routes-module
    redTest: pnpm --filter dvt-api test -- test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
    expectedFailure: API protected runtime routes are not mounted through a planned source/module registrar.
    patchSurfaces:
      - apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts
      - apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
      - apps/api/test/application/services/applicationArchitectureAst.support.ts
      - apps/api/test/entrypoints/http/startRunControlBoundary.architecture.test.ts
      - apps/api/test/modules/protectedRuntimeAndPlanCompileArchitecture.cases.ts
      - apps/api/src/app.ts
    greenTest: pnpm --filter dvt-api test -- test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
symbols:
  - name: APP_SOURCE_PATH
    path: apps/api/test/entrypoints/http/startRunControlBoundary.architecture.test.ts
    dddOwner: API protected runtime HTTP entrypoint source/module architecture guard
    cqRails:
      - RegisterApiProtectedRuntimeRoutesModule
    fowlerSignals:
      - Boundary drift
    architectureGuard: apps/api/test/entrypoints/http/startRunControlBoundary.architecture.test.ts
    cypressCoverage: N/A - backend protected runtime route composition
    unitTests:
      - apps/api/test/entrypoints/http/startRunControlBoundary.architecture.test.ts
  - name: PROTECTED_RUNTIME_ROUTES_SOURCE
    path: apps/api/test/modules/protectedRuntimeAndPlanCompileArchitecture.cases.ts
    dddOwner: API protected runtime HTTP entrypoint source/module architecture guard
    cqRails:
      - RegisterApiProtectedRuntimeRoutesModule
    fowlerSignals:
      - Boundary drift
    architectureGuard: apps/api/test/modules.test.ts
    cypressCoverage: N/A - backend protected runtime route composition
    unitTests:
      - apps/api/test/modules.test.ts
  - name: RegisterProtectedRuntimeRoutesOptions
    path: apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts
    dddOwner: API protected runtime HTTP entrypoint source/module
    cqRails:
      - RegisterApiProtectedRuntimeRoutesModule
    fowlerSignals:
      - Boundary drift
    architectureGuard: apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
    cypressCoverage: N/A - backend protected runtime route composition
    unitTests:
      - apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
  - name: registerProtectedRuntimeRoutes
    path: apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts
    dddOwner: API protected runtime HTTP entrypoint source/module
    cqRails:
      - RegisterApiProtectedRuntimeRoutesModule
    fowlerSignals:
      - Boundary drift
    architectureGuard: apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
    cypressCoverage: N/A - backend protected runtime route composition
    unitTests:
      - apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
  - name: RuntimeAuth
    path: apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts
    dddOwner: API protected runtime HTTP entrypoint source/module
    cqRails:
      - RegisterApiProtectedRuntimeRoutesModule
    fowlerSignals:
      - Boundary drift
    architectureGuard: apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
    cypressCoverage: N/A - backend protected runtime route composition
    unitTests:
      - apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
  - name: ProtectedRuntimeRouteDependencies
    path: apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts
    dddOwner: API protected runtime HTTP entrypoint source/module
    cqRails:
      - RegisterApiProtectedRuntimeRoutesModule
    fowlerSignals:
      - Boundary drift
    architectureGuard: apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
    cypressCoverage: N/A - backend protected runtime route composition
    unitTests:
      - apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
  - name: buildProtectedRuntimeRouteDependencies
    path: apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts
    dddOwner: API protected runtime HTTP entrypoint source/module
    cqRails:
      - RegisterApiProtectedRuntimeRoutesModule
    fowlerSignals:
      - Boundary drift
    architectureGuard: apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
    cypressCoverage: N/A - backend protected runtime route composition
    unitTests:
      - apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
  - name: registerProtectedPlanRoutes
    path: apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts
    dddOwner: API protected runtime HTTP entrypoint source/module
    cqRails:
      - RegisterApiProtectedRuntimeRoutesModule
    fowlerSignals:
      - Boundary drift
    architectureGuard: apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
    cypressCoverage: N/A - backend protected runtime route composition
    unitTests:
      - apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
  - name: registerProtectedWorkspaceGraphDraftRouteGroup
    path: apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts
    dddOwner: API protected runtime HTTP entrypoint source/module
    cqRails:
      - RegisterApiProtectedRuntimeRoutesModule
    fowlerSignals:
      - Boundary drift
    architectureGuard: apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
    cypressCoverage: N/A - backend protected runtime route composition
    unitTests:
      - apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
  - name: registerProtectedRunRoutes
    path: apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts
    dddOwner: API protected runtime HTTP entrypoint source/module
    cqRails:
      - RegisterApiProtectedRuntimeRoutesModule
    fowlerSignals:
      - Boundary drift
    architectureGuard: apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
    cypressCoverage: N/A - backend protected runtime route composition
    unitTests:
      - apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
  - name: registerProtectedAdminRouteGroup
    path: apps/api/src/entrypoints/http/registerProtectedRuntimeRoutes.ts
    dddOwner: API protected runtime HTTP entrypoint source/module
    cqRails:
      - RegisterApiProtectedRuntimeRoutesModule
    fowlerSignals:
      - Boundary drift
    architectureGuard: apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
    cypressCoverage: N/A - backend protected runtime route composition
    unitTests:
      - apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
  - name: protectedRuntimeModule
    path: apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
    dddOwner: API protected runtime HTTP entrypoint source/module test fixture
    cqRails:
      - RegisterApiProtectedRuntimeRoutesModule
    fowlerSignals:
      - Boundary drift
    architectureGuard: apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
    cypressCoverage: N/A - backend protected runtime route composition
    unitTests:
      - apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
  - name: observability
    path: apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
    dddOwner: API protected runtime HTTP entrypoint source/module test fixture
    cqRails:
      - RegisterApiProtectedRuntimeRoutesModule
    fowlerSignals:
      - Boundary drift
    architectureGuard: apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
    cypressCoverage: N/A - backend protected runtime route composition
    unitTests:
      - apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts
  - name: RegisterOperationalRoutesOptions
    path: apps/api/src/routes/registerOperationalRoutes.ts
    dddOwner: API operational routes source/module
    cqRails:
      - RegisterApiOperationalRoutesModule
    fowlerSignals:
      - Boundary drift
    architectureGuard: apps/api/test/routes/registerOperationalRoutes.test.ts
    cypressCoverage: N/A - backend operational route composition
    unitTests:
      - apps/api/test/routes/registerOperationalRoutes.test.ts
  - name: registerOperationalRoutes
    path: apps/api/src/routes/registerOperationalRoutes.ts
    dddOwner: API operational routes source/module
    cqRails:
      - RegisterApiOperationalRoutesModule
    fowlerSignals:
      - Boundary drift
    architectureGuard: apps/api/test/routes/registerOperationalRoutes.test.ts
    cypressCoverage: N/A - backend operational route composition
    unitTests:
      - apps/api/test/routes/registerOperationalRoutes.test.ts
  - name: fs
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue dependency
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: path
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue dependency
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: yaml
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue dependency
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: repoRoot
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue path policy
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: statusDir
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue path policy
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: coverageReportPath
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue input contract
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: fileIndexPath
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue input contract
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: componentIndexPath
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue input contract
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: documentMapPath
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue input contract
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: queueYamlPath
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue output contract
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: queueMarkdownPath
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue output contract
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: readYaml
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue input parser
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: renderYaml
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue renderer
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: asArray
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue normalizer
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: groupBy
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue grouping policy
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Boundary drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: sortByPath
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue ordering policy
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: componentById
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue component lookup
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Boundary drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: classifyPriority
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue priority policy
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Boundary drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: isSpecificRail
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue rail classifier
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Duplicate semantics
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: taskId
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue identity policy
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: taskValidation
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue validation policy
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Test-only confidence
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: buildTask
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue task model
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Boundary drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: buildDriftTasks
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue drift policy
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Boundary drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: buildSubdivisionTasks
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue subdivision policy
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Responsibility overload
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: buildRailGapTasks
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue rail gap policy
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Duplicate semantics
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: buildDocumentAlignmentTasks
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue docs policy
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: buildFingerprintReviewTasks
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue fingerprint policy
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: sortTasks
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue ordering policy
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: countBy
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue summary policy
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: buildRemediationQueue
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Boundary drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: renderTaskRows
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue markdown renderer
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: renderCountTable
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue markdown renderer
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: renderMarkdown
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue markdown renderer
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: writeIfChanged
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue drift gate
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: buildOutputs
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue generator
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: main
    path: scripts/generate-governance-remediation-queue.cjs
    dddOwner: Repository governance remediation queue CLI
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: assert
    path: scripts/generate-governance-remediation-queue.test.cjs
    dddOwner: Repository governance remediation queue test contract
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Coverage refinement
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: test
    path: scripts/generate-governance-remediation-queue.test.cjs
    dddOwner: Repository governance remediation queue test contract
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Coverage refinement
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: coverageReport
    path: scripts/generate-governance-remediation-queue.test.cjs
    dddOwner: Repository governance remediation queue test fixture
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Coverage refinement
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: fileIndex
    path: scripts/generate-governance-remediation-queue.test.cjs
    dddOwner: Repository governance remediation queue test fixture
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Coverage refinement
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: componentIndex
    path: scripts/generate-governance-remediation-queue.test.cjs
    dddOwner: Repository governance remediation queue test fixture
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Coverage refinement
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: documentMap
    path: scripts/generate-governance-remediation-queue.test.cjs
    dddOwner: Repository governance remediation queue test fixture
    cqRails:
      - GenerateGovernanceRemediationQueue
    fowlerSignals:
      - Coverage refinement
    architectureGuard: scripts/generate-governance-remediation-queue.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-remediation-queue.test.cjs
  - name: GenerateGovernanceFileComponentIndex
    path: scripts/generate-governance-file-component-index.cjs
    dddOwner: Repository governance file/component index
    cqRails:
      - GenerateGovernanceFileComponentIndex
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-file-component-index.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-file-component-index.test.cjs
  - name: CheckGovernanceFileFingerprintBaseline
    path: scripts/check-governance-file-fingerprint-baseline.cjs
    dddOwner: Repository governance file fingerprint baseline
    cqRails:
      - AcceptGovernanceFileFingerprintBaseline
      - CheckGovernanceFileFingerprintBaseline
      - RenderGovernanceFileFingerprintImpact
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-file-fingerprint-baseline.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-file-fingerprint-baseline.test.cjs
  - name: CheckGovernanceChangedFiles
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Documentation drift
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: GenerateGovernanceCoverageReport
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Documentation drift
      - Hidden authority
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: fs
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report dependency
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: path
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report dependency
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: yaml
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report dependency
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: repoRoot
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report path configuration
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: statusDir
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report path configuration
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: fileIndexPath
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report path configuration
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: componentIndexPath
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report path configuration
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: coverageYamlPath
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report output path
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: coverageMarkdownPath
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report output path
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: readYaml
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report input adapter
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: renderYaml
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report output adapter
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: countBy
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report read model
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: countGovernanceDocuments
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report read model
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: buildComponentCoverage
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report read model
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Responsibility overload
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: buildOpenGovernanceFindings
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report read model
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Boundary drift
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: buildCoverageReport
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report read model
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Documentation drift
      - Boundary drift
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: renderCountTable
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report markdown projection
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: renderFileFindingRows
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report markdown projection
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: renderComponentRows
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report markdown projection
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: renderGovernanceRows
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report markdown projection
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: renderMarkdown
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report markdown projection
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: writeIfChanged
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report output adapter
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: buildOutputs
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report application command
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: main
    path: scripts/generate-governance-coverage-report.cjs
    dddOwner: Repository governance coverage report CLI entrypoint
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: test
    path: scripts/generate-governance-coverage-report.test.cjs
    dddOwner: Repository governance coverage report test contract
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Coverage refinement
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: assert
    path: scripts/generate-governance-coverage-report.test.cjs
    dddOwner: Repository governance coverage report test contract
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Coverage refinement
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: fileIndex
    path: scripts/generate-governance-coverage-report.test.cjs
    dddOwner: Repository governance coverage report test fixture
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Coverage refinement
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: componentIndex
    path: scripts/generate-governance-coverage-report.test.cjs
    dddOwner: Repository governance coverage report test fixture
    cqRails:
      - GenerateGovernanceCoverageReport
    fowlerSignals:
      - Coverage refinement
    architectureGuard: scripts/generate-governance-coverage-report.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/generate-governance-coverage-report.test.cjs
  - name: parseNameStatus
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: validateChangedFiles
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: parseArgs
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: readNameStatusDiff
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: resolveBaseRef
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: execGit
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: changeKey
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: dedupeChanges
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: requireActiveGovernance
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Boundary drift
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: validateAdded
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Boundary drift
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: validateModified
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: validateDeleted
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: validateRenamed
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Boundary drift
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: isUngoverned
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: isLegacyOrDrift
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Boundary drift
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: entriesByPath
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: printResult
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: main
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: toPosix
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: readYaml
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: readYamlFromGit
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Documentation drift
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: repoRoot
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: statusDir
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: fileIndexPath
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: baselinePath
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: baselineRepoPath
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: gitOutputMaxBuffer
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: fs
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate dependency
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: path
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate dependency
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: yaml
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository governance changed-file gate dependency
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Hidden authority
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: assert
    path: scripts/check-governance-changed-files.test.cjs
    dddOwner: Repository governance changed-file gate test contract
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Coverage refinement
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: test
    path: scripts/check-governance-changed-files.test.cjs
    dddOwner: Repository governance changed-file gate test contract
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Coverage refinement
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: baseBaseline
    path: scripts/check-governance-changed-files.test.cjs
    dddOwner: Repository governance changed-file gate test fixture
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Coverage refinement
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: currentFileIndex
    path: scripts/check-governance-changed-files.test.cjs
    dddOwner: Repository governance changed-file gate test fixture
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Coverage refinement
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: currentBaseline
    path: scripts/check-governance-changed-files.test.cjs
    dddOwner: Repository governance changed-file gate test fixture
    cqRails:
      - CheckGovernanceChangedFiles
    fowlerSignals:
      - Coverage refinement
    architectureGuard: scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: FULL_OUTPUT
    path: tools/docs/generate-docs-manifest.ts
    dddOwner: Repository docs governance manifest
    cqRails:
      - GenerateDocsGovernanceManifest
      - QueryDocsGovernanceManifestAuditCatalog
    fowlerSignals:
      - Documentation drift
    architectureGuard: tools/ci/docs-manifest-contract.test.mjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - tools/ci/docs-manifest-contract.test.mjs
  - name: FullManifest
    path: tools/docs/generate-docs-manifest.ts
    dddOwner: Repository docs governance manifest
    cqRails:
      - QueryDocsGovernanceManifestAuditCatalog
    fowlerSignals:
      - Documentation drift
    architectureGuard: tools/ci/docs-manifest-contract.test.mjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - tools/ci/docs-manifest-contract.test.mjs
  - name: CompactManifest
    path: tools/docs/generate-docs-manifest.ts
    dddOwner: Repository docs governance manifest
    cqRails:
      - GenerateDocsGovernanceManifest
    fowlerSignals:
      - Documentation drift
    architectureGuard: tools/ci/docs-manifest-contract.test.mjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - tools/ci/docs-manifest-contract.test.mjs
  - name: createCatalogDigest
    path: tools/docs/generate-docs-manifest.ts
    dddOwner: Repository docs governance manifest
    cqRails:
      - GenerateDocsGovernanceManifest
    fowlerSignals:
      - Hidden authority
    architectureGuard: tools/ci/docs-manifest-contract.test.mjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - tools/ci/docs-manifest-contract.test.mjs
  - name: isSha256Hex
    path: tools/ci/docs-manifest-contract.test.mjs
    dddOwner: Repository docs governance manifest test contract
    cqRails:
      - GenerateDocsGovernanceManifest
    fowlerSignals:
      - Coverage refinement
    architectureGuard: tools/ci/docs-manifest-contract.test.mjs
    cypressCoverage: N/A - docs governance script
    unitTests:
      - tools/ci/docs-manifest-contract.test.mjs
```

## Validation Baseline

Run after each document-changing slice:

- `pnpm docs:sync`
- `pnpm docs:workboard:generate` when lane YAML changes
- `pnpm docs:governance:unit-coverage`
- `pnpm test:docs:governance:unit-coverage`
- `pnpm exec markdownlint-cli2 "<changed-docs>"`
- `pnpm verify:prepush`

## PR Slicing

Use small PRs:

1. **PR-1:** save this plan and reference it in the proposal portfolio.
2. **PR-2:** create taxonomy, root unit index, manifest, and coverage guard.
3. **PR-3:** link existing documentation into the index.
4. **PR-4:** subdivide `SYS-PLANSTORE`.
5. **PR-5:** subdivide `SYS-WEB`.
6. **PR-6:** add first architecture guard backlog or tests after review.

No code behavior changes are allowed before the taxonomy and root index are in
review.

## Completion Criteria

- The plan is linked from the proposal portfolio.
- The taxonomy exists and names the allowed unit model.
- The root index exists and covers every top-level system area.
- Existing docs are referenced instead of duplicated.
- `SYS-PLANSTORE` and `SYS-WEB` are explicitly scheduled for deep subdivision.
- No S08 implementation closure can bypass the unit index once accepted.
