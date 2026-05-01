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

Modify:

- `docs/planning/status/system-operations-inventory-20260501.md`
- `docs/planning/proposals/portfolio-map-20260403.md`
- `docs/planning/state/agent-lane-a.yaml`

Generated:

- run `pnpm docs:sync` after adding docs;
- run `pnpm docs:workboard:generate` after lane YAML changes.

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

## Validation Baseline

Run after each document-changing slice:

- `pnpm docs:sync`
- `pnpm docs:workboard:generate` when lane YAML changes
- `pnpm exec markdownlint-cli2 "<changed-docs>"`
- `pnpm verify:prepush`

## PR Slicing

Use small PRs:

1. **PR-1:** save this plan and reference it in the proposal portfolio.
2. **PR-2:** create taxonomy and root unit index.
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
