---
title: DB Surface Inventory
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-05-10
planning_type: status
---

# DB Surface Inventory

## Purpose

This inventory makes the planning and governance DB boundary explicit. It names
which surfaces are DB-owned, which remain Git-owned, and which are generated
projections, so scripts do not force file edits where a command or query rail
already exists.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/adr/adr-0055-planning-db-canonical-operational-source.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/architecture/command-query-rail-governance.md`
- `scripts/planning-db-*.cjs`
- `scripts/governance-db-*.cjs`
- `scripts/governance-refresh.cjs`

## Command And Query Rail

- Rail name: `InventoryDbGovernanceSurface`
- Type: Query
- Owning context: Planning and governance local operations
- DDD object/read model: DB surface inventory read model
- Application port: `pnpm planning:db:inventory:check`
- Adapter surface: `scripts/planning-db-surface-inventory-check.cjs`
- Scope and auth: repo-local, read-only maintainer and CI check
- Negative tests: missing inventory, missing required surface, missing rail
  columns, invalid migration state row

Additional operational rails covered by this inventory:

- Rail name: `ReadComponentEngineeringRecord`
  - Type: Query
  - Owning context: Governance local operations
  - DDD object/read model: component engineering record read model
  - Application port: `pnpm planning:db:query cer --component <component_id>`
  - Adapter surface: `scripts/planning-db-query.cjs`
  - Scope and auth: repo-local, read-only maintainer and CI inspection query
  - Projection freshness: `planning:db:query` runs governance import with
    `--if-stale` before reading this DB projection
  - Negative tests: unknown query rejection, component filter parameterization,
    missing migration view, stale projection refresh, and DB-view-only read path
- Rail name: `ReadComponentHierarchy`
  - Type: Query
  - Owning context: Governance local operations
  - DDD object/read model: recursive component hierarchy read model
  - Application port:
    `pnpm planning:db:query component-tree --component <component_id>`
  - Adapter surface: `scripts/planning-db-query.cjs`
  - Scope and auth: repo-local, read-only maintainer and CI inspection query
  - Projection freshness: `planning:db:query` runs governance import with
    `--if-stale` before reading this DB projection
  - Negative tests: unknown query rejection, component, parent, and state
    filter parameterization, missing migration view, stale projection refresh,
    and parent closure drift
- Rail name: `ValidateComponentEngineeringDrift`
  - Type: Query
  - Owning context: Governance local operations
  - DDD object/read model: component engineering drift read model
  - Application port:
    `pnpm planning:db:query component-drift --component <component_id>`
  - Adapter surface: `scripts/planning-db-query.cjs`
  - Scope and auth: repo-local, read-only maintainer and CI inspection query
  - Projection freshness: `planning:db:query` runs governance import with
    `--if-stale` before reading this DB projection
  - Negative tests: unknown query rejection, component filter parameterization,
    stale projection refresh, unresolved parent detection, missing child
    detection, and non-leaf file ownership detection
- Rail name: `ReadComponentEngineeringRules`
  - Type: Query
  - Owning context: Governance local operations
  - DDD object/read model: component engineering invariant catalog
  - Application port:
    `pnpm planning:db:query component-rules --kind <category>`
  - Adapter surface: `scripts/planning-db-query.cjs`
  - Scope and auth: repo-local, read-only maintainer and CI inspection query
  - Projection freshness: `planning:db:query` runs governance import with
    `--if-stale` before reading this DB projection
  - Negative tests: unknown query rejection, kind filter parameterization,
    missing migration view, and DB-view-only read path
- Rail name: `EvaluateComponentEngineeringRules`
  - Type: Query
  - Owning context: Governance local operations
  - DDD object/read model: component engineering rule evaluation read model
  - Application port:
    `pnpm planning:db:query component-rule-evaluations --component <component_id>`
  - Adapter surface: `scripts/planning-db-query.cjs`
  - Scope and auth: repo-local, read-only maintainer and CI inspection query
  - Projection freshness: `planning:db:query` runs governance import with
    `--if-stale` before reading this DB projection
  - Negative tests: unknown query rejection, component, state, and kind filter
    parameterization, missing migration view, and parent validation against the
    full governance unit tree
- Rail name: `ReadComponentEngineeringQuality`
  - Type: Query
  - Owning context: Governance local operations
  - DDD object/read model: component engineering quality rollup read model
  - Application port:
    `pnpm planning:db:query component-quality --component <component_id>`
  - Adapter surface: `scripts/planning-db-query.cjs`
  - Scope and auth: repo-local, read-only maintainer and CI inspection query
  - Projection freshness: `planning:db:query` runs governance import with
    `--if-stale` before reading this DB projection
  - Negative tests: unknown query rejection, component and state filter
    parameterization, missing migration view, and DB-view-only read path
- Rail name: `ReadGovernanceUnitTree`
  - Type: Query
  - Owning context: Governance local operations
  - DDD object/read model: governance unit tree read model
  - Application port: `pnpm planning:db:query units --unit <unit_id>` and
    `pnpm planning:db:query units --parent <unit_id>`
  - Adapter surface: `scripts/planning-db-query.cjs`
  - Scope and auth: repo-local, read-only maintainer and CI inspection query
  - Negative tests: unknown query rejection, unit and parent filter
    parameterization, missing migration view, and DB-view-only read path
- Rail name: `ImportPlanningBootstrapSnapshot`
  - Type: Command
  - Owning context: Planning local operations
  - DDD object/read model: planning lane/task bootstrap snapshot imported into
    `planning_query_store`
  - Application port: `pnpm planning:db:import -- --if-stale --planning-only`
  - Adapter surface: `scripts/planning-db-import.cjs`
  - Scope and auth: repo-local maintainer and CI command; no product tenant data
  - Negative tests: incompatible scope flags, fresh-scope skip, stale-scope
    import, unavailable DB treated as stale and retried through the import rail
- Rail name: `ImportGovernanceSnapshot`
  - Type: Command
  - Owning context: Governance local operations
  - DDD object/read model: governance source/query snapshot imported into
    `planning_query_store`
  - Application port: `pnpm governance:db:import -- --if-stale`
  - Adapter surface: `scripts/governance-db-import.cjs`
  - Scope and auth: repo-local maintainer and CI command; no product tenant data
  - Negative tests: fresh-scope skip through delegated planning import and
    governance-only scope delegation; auxiliary projection drift forces reimport
- Rail name: `QueryGovernedFeatureWork`
  - Type: Query
  - Owning context: Planning and governance local operations
  - DDD object/read model: governed feature-mechanization work references
    derived from `doc_task_reference_query`
  - Application port: `pnpm planning:db:query feature-work`
  - Adapter surface: `scripts/planning-db-query.cjs`
  - Scope and auth: repo-local, read-only maintainer and CI inspection query
  - Negative tests: unknown query rejection, DB reference classification filter,
    document metadata join, and filter parameterization

## Surface Inventory

| Surface                         | Canonical source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Write rail                                                                                                                                                                                   | Read/query rail                                                                                                                                                                                                                                                                                                                                                                                       | Projection                                                                                                                         | Validation                                                                                                                                                                                                                                                                                                                                                                                                                                     | Migration state   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Planning task lifecycle         | `planning_query_store` effective task rows with DB local definitions/overlays; `agent-lane-*.yaml` is bootstrap/export compatibility only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `pnpm planning:db:operate`                                                                                                                                                                   | `pnpm planning:db:query tasks`, `pnpm planning:db:query next`, `pnpm planning:db:query open`, `pnpm planning:db:query focus`                                                                                                                                                                                                                                                                          | `docs/planning/state/execution-workboard.md`, `docs/planning/state/open-task-route.md`                                             | `pnpm planning:db:check`, `pnpm planning:db:export:check`, `pnpm docs:workboard:check`                                                                                                                                                                                                                                                                                                                                                         | DB-first          |
| Planning lane registry          | `planning_query_store` lane rows for active query state; `docs/planning/state/agent-lane-*.yaml` is the bootstrap/export snapshot                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Git edit only for taxonomy/bootstrap changes, then `pnpm planning:db:import -- --if-stale --planning-only`                                                                                   | `pnpm planning:db:query summary`, `pnpm planning:db:query tasks --lane <id>`                                                                                                                                                                                                                                                                                                                          | DB lane rows and exported lane YAML                                                                                                | `pnpm planning:db:check`, `pnpm planning:db:export:check`                                                                                                                                                                                                                                                                                                                                                                                      | Bootstrap/export  |
| Workboard and open task route   | DB effective planning views produced by stale-aware `planning:db:import -- --if-stale --planning-only` when bootstrap rows drift                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | No direct file write; use task lifecycle or lane registry rails                                                                                                                              | `pnpm planning:db:query next`, generator source `db`                                                                                                                                                                                                                                                                                                                                                  | `docs/planning/state/execution-workboard.md`, `docs/planning/state/open-task-route.md`                                             | `pnpm docs:workboard:check`, `pnpm planning:db:export:check`                                                                                                                                                                                                                                                                                                                                                                                   | Generated-only    |
| Governance file inventory       | Git tracked docs and source files imported into governance DB tables; generated policy may declare local governance-file shards as DB-backed inspection artifacts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Git edit to governed source, then `pnpm governance:refresh` or `pnpm governance:db:import`                                                                                                   | `pnpm governance:db:query files`, `pnpm governance:db:query components`, `pnpm governance:db:query drift`                                                                                                                                                                                                                                                                                             | `docs/.manifest.json`, `docs/planning/status/system-governance-unit-index-20260501.md`                                             | `pnpm governance:db:check`, `pnpm governance:db:export:check`, `pnpm docs:gov:generated-policy`                                                                                                                                                                                                                                                                                                                                                | Hybrid indexed    |
| Governance unit tree            | `planning_query_store.governance_unit_query` derived from governance component `unitReferences`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Git edit to governed source, then `pnpm governance:refresh` and `pnpm planning:db:migrate`                                                                                                   | `pnpm planning:db:query units --unit <unit_id>`, `pnpm planning:db:query units --parent <unit_id>`                                                                                                                                                                                                                                                                                                    | Queryable system/module/component/source parent tree                                                                               | `pnpm test:planning:db`, `pnpm planning:db:query units --unit <unit_id>`                                                                                                                                                                                                                                                                                                                                                                       | DB-first          |
| Governance remediation queue    | Governance DB coverage and fingerprint reports after refresh                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Fix owning docs, config, code, or scripts; then `pnpm governance:refresh`                                                                                                                    | `pnpm governance:db:query remediation`, `pnpm governance:db:query coverage`                                                                                                                                                                                                                                                                                                                           | Governance coverage and remediation generated reports                                                                              | `pnpm docs:governance:coverage-report:check`, `pnpm docs:governance:remediation-queue:check`                                                                                                                                                                                                                                                                                                                                                   | Generated-only    |
| Code state inventory            | Git tracked workspace source and test files under `apps/**` and `packages/**`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Git edit to source files, then `pnpm docs:status:generate`                                                                                                                                   | Local render at `.generated-docs/planning/status/generated-code-state.md`                                                                                                                                                                                                                                                                                                                             | Stable tracked pointer at `docs/planning/status/generated-code-state.md`                                                           | `pnpm docs:status:generate`, `pnpm docs:gov:generated-policy`, `pnpm verify:prepush`                                                                                                                                                                                                                                                                                                                                                           | Generated-only    |
| Component engineering records   | Relational read views `component_engineering_component_query`, `component_engineering_document_query`, `component_engineering_file_query`, `component_engineering_file_rollup_query`, `component_engineering_relation_query`, `component_engineering_contract_query`, `component_engineering_gap_query`, `component_engineering_component_tree_query`, `component_engineering_file_ownership_query`, `component_engineering_component_metadata_query`, `component_engineering_rule_catalog_query`, `component_engineering_rule_evaluation_query`, `component_engineering_quality_query`, and `component_engineering_drift_query`; JSON CER is a final render projection | Git edit to governed source; `planning:db:query` performs stale-aware `governance:db:import` before reads, and closeout still runs `pnpm governance:refresh` plus `pnpm planning:db:migrate` | `pnpm planning:db:query cer --component <component_id>`, `pnpm planning:db:query component-tree --component <component_id>`, `pnpm planning:db:query component-rules`, `pnpm planning:db:query component-rule-evaluations --component <component_id>`, `pnpm planning:db:query component-quality --component <component_id>`, and `pnpm planning:db:query component-drift --component <component_id>` | JSON component engineering record with explicit completeness gaps plus DB-first component tree, invariant, quality, and drift rows | `pnpm test:planning:db`, `pnpm planning:db:query cer --component <component_id> --schema-version v2`, `pnpm planning:db:query component-tree --component <component_id>`, `pnpm planning:db:query component-rules`, `pnpm planning:db:query component-rule-evaluations --component <component_id>`, `pnpm planning:db:query component-quality --component <component_id>`, `pnpm planning:db:query component-drift --component <component_id>` | DB-first          |
| ADR and contract decisions      | `docs/adr/**`, `docs/contracts/**`, and `specs/contracts/**`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Git edit through ADR or contract review flow                                                                                                                                                 | `pnpm governance:db:query files --prefix docs/adr`, `pnpm governance:db:query files --prefix specs/contracts`                                                                                                                                                                                                                                                                                         | Docs indexes and governance file inventory                                                                                         | `pnpm docs:sync:check`, `pnpm contracts:index:check`, `pnpm docs:arc:evidence:check -- --changed-only`                                                                                                                                                                                                                                                                                                                                         | Git-first indexed |
| Risk and evidence records       | `docs/evidence/**` and `docs/risk-register/**`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Git edit through ARC evidence and risk register rules                                                                                                                                        | `pnpm governance:db:query files --prefix docs/evidence`, `pnpm governance:db:query files --prefix docs/risk-register`                                                                                                                                                                                                                                                                                 | `docs/evidence/index.md`, `docs/risk-register/index.md`, risk category indexes                                                     | `pnpm docs:sync:check`, `pnpm docs:arc:evidence:check -- --changed-only`                                                                                                                                                                                                                                                                                                                                                                       | Git-first indexed |
| Repository command catalog      | `tools/ci/repository-command-catalog.mjs` imported into planning DB command rows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Git edit to command catalog or workflow source                                                                                                                                               | `pnpm planning:db:query commands`, `pnpm planning:db:query pr-readiness`                                                                                                                                                                                                                                                                                                                              | Repository command and PR-readiness query output                                                                                   | `pnpm test:ci-tools`, `pnpm docs:feature-mechanization:implementation`                                                                                                                                                                                                                                                                                                                                                                         | Hybrid indexed    |
| Docs task disposition inventory | `docs/planning/status/docs-task-disposition-inventory-20260510.md` and related planning status docs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Git edit to disposition inventory, then `pnpm governance:refresh`                                                                                                                            | `pnpm planning:db:query docs-disposition`, `pnpm planning:db:query task-references`, `pnpm planning:db:query feature-work`                                                                                                                                                                                                                                                                            | Disposition query rows, task-reference reports, and governed feature-work reports                                                  | `pnpm governance:db:check`, `pnpm docs:governance:changed-files:check`, `pnpm test:planning:db`                                                                                                                                                                                                                                                                                                                                                | Git-first indexed |
| Docs resolution overlays        | `planning_query_store.doc_resolution_overlays` keyed to docs disposition and task-gap source hashes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `pnpm planning:db:operate docs-disposition resolve`, `pnpm planning:db:operate task-gap resolve`                                                                                             | `pnpm planning:db:query docs-disposition --resolution <state>`, `pnpm planning:db:query task-gaps --resolution <state>`                                                                                                                                                                                                                                                                               | `doc_disposition_action_query` and `planning_task_gap_query` resolution status rows                                                | `pnpm test:planning:db`, `pnpm planning:db:query task-gaps --resolution all`, `pnpm verify:prepush`                                                                                                                                                                                                                                                                                                                                            | DB-first          |

## Operating Rule

DB-first rows must be changed through their command rail and read through their
query rail. Generated-only rows must not be edited directly. Git-first indexed
rows remain reviewable source documents, but their query behavior must be
validated by the DB import/export checks before closeout.
