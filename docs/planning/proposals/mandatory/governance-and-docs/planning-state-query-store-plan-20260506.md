---
title: Planning And Governance Query Store Plan
status: Review
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-05-06
planning_type: mandatory-proposal
---

# Planning And Governance Query Store Plan

## Summary

The lane YAML registry remains the canonical planning state, but the current
monolithic lane files and generated `system-governance-*` shards are no longer
ergonomic for repeated human and agent work.

This plan introduces a local Postgres-backed planning and governance query store
as a derived read model. The database is persistent on disk for local speed, but
it is rebuildable from Git-tracked planning and governance sources and must not
become the only copy of repository truth in this slice.

## Decision

Adopt Postgres as a local and CI-capable derived query store for planning state
and file-governance state.

Git remains the canonical review and authority boundary:

- lane state, proposals, reviews, closeouts, roadmap docs, evidence, and risk
  records remain tracked in the repository;
- governance rules remain tracked; derived file indexes, component maps,
  fingerprints, coverage reports, remediation queues, and governance shards are
  generated under `.generated-docs/planning/status/` for local inspection
  instead of being committed as review files;
- Postgres rebuilds equivalent governance projections in memory from the same
  generator modules and imports them into normalized tables for queries, status
  reconciliation, dashboards, generated planning outputs, and governance
  coverage analysis;
- export and drift checks prove that the database state matches the repository
  state before a branch can be called ready;
- the Docker volume is local persistence, not canonical state.

GitHub Issues and Projects remain optional collaboration mirrors. They must not
be the first canonical task store because they introduce network dependency,
mutable state outside PR review, API/rate-limit behavior, and weaker offline
determinism for agents.

MongoDB remains rejected for this slice. A document database would match the raw
YAML shape, but GOV-S3's current correctness problem is not document storage; it
is deterministic comparison across Git-tracked sources, imported rows, hashes,
counts, and composite identities. Postgres keeps those checks explicit with SQL
constraints, joins, transactions, and `jsonb` columns that preserve the full
source document without making the database canonical.

## System Governance Scope

This proposal explicitly includes the `system-governance-*` family under the
derived Postgres query-store path.

The target is not only lane/task state. The query store should also import,
query, drift-check, and eventually regenerate these governance read models:

- `docs/planning/status/system-governance-file-index.files.yaml`
- `docs/planning/status/system-governance-file-index-20260501.md`
- `docs/planning/status/system-governance-component-index.components.yaml`
- `docs/planning/status/system-governance-component-index-20260501.md`
- `docs/planning/status/system-governance-component-file-map.components.yaml`
- `docs/planning/status/system-governance-component-file-map-20260503.md`
- `docs/planning/status/system-governance-file-fingerprint-baseline.yaml`
- `docs/planning/status/system-governance-file-fingerprint-impact-20260501.md`
- `docs/planning/status/system-governance-coverage-report.coverage.yaml`
- `docs/planning/status/system-governance-coverage-report-20260502.md`
- `docs/planning/status/system-governance-remediation-queue.queue.yaml`
- `docs/planning/status/system-governance-remediation-queue-20260502.md`
- `docs/planning/status/governance-files/**`
- `docs/planning/status/governance-components/**`

As of the generated-artifact extraction slice, the entries above are former
tracked review paths. Their live generated location is now
`.generated-docs/planning/status/**`, and the old `docs/planning/status/**`
paths are removed from tracking and ignored to prevent PR fan-out.

In other words, GOV-S3 moves the bulky governance read side toward:

```text
Git-tracked governance sources and generator rules
  -> deterministic import
  -> Postgres governance read model
  -> query/check/report/export
  -> deterministic ignored governance artifacts under .generated-docs
  -> Postgres import/check for query and drift evidence
```

The canonical authority still remains the repository. The database makes the
read side queryable and cheaper for agents; it does not hide governance changes
outside PR review.

## Current System Governance Workflow

The `system-governance-*` workflow is deterministic, but the old tracked-output
model was the fan-out mechanism that made a small source change touch many
tracked files. The workflow below is preserved, but its generated outputs now
write to `.generated-docs/planning/status/` for local inspection. Postgres
import/checks rebuild the same governance projections in memory instead of
reading those local files as input.

The canonical component view for this existing workflow is
[`System Governance Generation Workflow Component`](../../../../architecture/components/ci-governance/system-governance-generation-workflow-component.md).
GOV-S3-W0 records the current workflow there before any Docker, migration, or
Postgres-backed exporter work starts.

```mermaid
flowchart TD
  SourceChange["Small source change\nproposal, lane YAML, docs, code"]
  DocsSync["docs:sync / workboard generation"]
  FileComponent["docs:governance:file-component-index"]
  Fingerprint["docs:governance:file-fingerprint-baseline"]
  FingerprintImpact["docs:governance:file-fingerprint-impact"]
  Coverage["docs:governance:coverage-report"]
  Remediation["docs:governance:remediation-queue"]
  ChangedFiles["docs:governance:changed-files:check"]
  Prepush["verify:prepush / ci:docs"]

  SourceChange --> DocsSync
  SourceChange --> FileComponent
  DocsSync --> FileComponent
  FileComponent --> FileIndex["system-governance-file-index.*"]
  FileComponent --> ComponentIndex["system-governance-component-index.*"]
  FileComponent --> ComponentMap["system-governance-component-file-map.*"]
  FileComponent --> GovernanceShards["governance-files/**\ngovernance-components/**"]
  FileIndex --> Fingerprint
  ComponentMap --> Fingerprint
  Fingerprint --> FingerprintBaseline["system-governance-file-fingerprint-baseline.yaml"]
  Fingerprint --> FingerprintImpact
  FileIndex --> Coverage
  ComponentIndex --> Coverage
  ComponentMap --> Coverage
  FingerprintBaseline --> Coverage
  Coverage --> CoverageReport["system-governance-coverage-report.*"]
  CoverageReport --> Remediation
  FileIndex --> Remediation
  ComponentIndex --> Remediation
  ComponentMap --> Remediation
  Remediation --> RemediationQueue["system-governance-remediation-queue*"]
  FileIndex --> ChangedFiles
  FingerprintBaseline --> ChangedFiles
  ComponentMap --> ChangedFiles
  ChangedFiles --> Prepush
  FingerprintImpact --> Prepush
  CoverageReport --> Prepush
  RemediationQueue --> Prepush
```

The direct generators and checks are:

- `pnpm docs:governance:file-component-index` generates the file index,
  component indexes, component maps, and governance shard folders under
  `.generated-docs/planning/status/`.
- `pnpm docs:governance:file-fingerprint-baseline` generates
  `.generated-docs/planning/status/system-governance-file-fingerprint-baseline.yaml`.
- `pnpm docs:governance:file-fingerprint-impact` generates
  `.generated-docs/planning/status/system-governance-file-fingerprint-impact-20260501.md`.
- `pnpm docs:governance:coverage-report` generates
  `.generated-docs/planning/status/system-governance-coverage-report.*`.
- `pnpm docs:governance:remediation-queue` generates
  `.generated-docs/planning/status/system-governance-remediation-queue*`.
- `pnpm verify:prepush` and `pnpm ci:docs` regenerate ignored artifacts,
  validate changed files against active governance, and check DB import/drift
  paths where applicable.

Before this extraction, one planning/proposal change fanned out into the same
surface visible in the editor:

- proposal sources under `docs/planning/proposals/mandatory/governance-and-docs/`;
- lane sources under `docs/planning/state/agent-lane-*.yaml`;
- `system-governance-file-index.*`;
- `system-governance-component-index.*`;
- `system-governance-component-file-map.*`;
- `system-governance-coverage-report.*`;
- `system-governance-file-fingerprint-baseline.yaml`;
- governance shard files under `governance-files/**` and
  `governance-components/**`.

That tracked fan-out was the problem to derive. GOV-S3 now keeps the same
generation order as an explicit import/query pipeline while removing those
derived files from the tracked review surface.

## Problem

The current planning model is correct but increasingly expensive to operate:

- `agent-lane-a.yaml` and `agent-lane-e.yaml` already exceed three thousand
  lines each;
- cross-lane status reconciliation requires broad edits to large files;
- generated governance file indexes, component maps, fingerprints, coverage
  reports, and remediation queues add review noise when small source changes
  update large generated surfaces;
- agents must repeatedly parse large YAML documents to answer narrow questions;
- local gates can fail for scope declarations rather than for the substantive
  planning decision.

The root issue is not that YAML is invalid as a source format. The root issue is
that flat files are serving two roles at once:

1. canonical reviewable planning and governance state;
2. query, dashboard, reconciliation, fingerprint, coverage, and
   generated-output backend.

Those roles should be separated.

## Current State

```mermaid
flowchart LR
  Human[Human or agent] --> LaneYaml[agent-lane-*.yaml]
  LaneYaml --> Workboard[generated workboard]
  LaneYaml --> Route[generated open-task route]
  GitFiles[tracked repo files] --> GovIndex[ignored .generated-docs governance artifacts]
  GovIndex --> Coverage[coverage and remediation reports]
  Human --> LargeYaml[large YAML reads and edits]
  GovIndex --> PgImport[Postgres import/check]
  Coverage --> PgImport
```

The lane YAML registry is still reviewable and deterministic. Governance
artifacts are now ignored generated read models: useful for import/checks, but
not a PR review surface or concurrency surface.

## Target State

```mermaid
flowchart LR
  Files[Existing tracked YAML and docs sources] --> Generate[ignored .generated-docs artifacts]
  Generate --> Import[bootstrap import]
  Import --> Pg[(local persistent Postgres)]
  Agent[Agent command] --> Command[transactional local command]
  Command --> Pg
  Command --> Audit[append-only audit rows]
  Pg --> Queries[status, dependency, file, and component queries]
  Pg --> Reconcile[planning and governance reconciliation checks]
  Pg --> Export[deterministic export or PR snapshot]
  Export --> Artifacts
  Pg --> Generated[workboard, route, and governance report generation]
  Generated --> Artifacts[local or CI artifacts]
```

The local database exists to make planning and governance state cheap to inspect
and safe for multiple local agents to coordinate through transactional commands.
Tracked files remain the bootstrap and PR-review compatibility surface during
the transition, but agents should stop treating lane YAML and generated
governance shards as the daily write backend.

## Local Operational Boundary

This plan now separates three boundaries that were previously collapsed:

1. Bootstrap/import: existing tracked YAML/docs sources plus ignored
   `.generated-docs` governance artifacts can seed the local database with
   source hashes and raw payloads.
2. Local operation: agents claim and update planning work through Postgres
   commands that use optimistic revisions and append-only audit rows.
3. Review/export: deterministic file exports, closeouts, evidence, risk records,
   and PRs remain the reviewable repository boundary until a later ADR replaces
   that review model.

The database is local and persistent, not temporary validation state. A
temporary database may still be used for CI or parity tests, but temporary DBs
must not be presented as audit storage. Durable local audit lives in the shared
Postgres volume; durable repository evidence lives in tracked closeouts,
evidence, risk entries, and exported snapshots.

## Scope

In scope:

- define the planning query store boundary and canonicality rules;
- define the governance query-store boundary for `system-governance-*` read
  models;
- add a Docker Compose posture for local Postgres with a persistent ignored
  data directory;
- define migrations, import, query, export, and drift-check commands;
- define local DB-first planning authoring commands for agent coordination;
- normalize lane task data into tables suitable for status reconciliation;
- preserve local planning operation audit rows across imports;
- normalize file governance, component ownership, fingerprints, coverage, and
  remediation data into queryable tables;
- keep generated planning views derived from tracked inputs;
- keep generated governance views derived from tracked inputs and generated
  policy;
- allow CI to build the query store from a clean checkout.

Out of scope:

- making Postgres the canonical repository review authority in this slice;
- replacing Git review with GitHub Issues, Projects, or a mutable database UI;
- changing product runtime Postgres adapters under `packages/@dvt/adapter-*`;
- changing planner, engine, API, or web product behavior;
- committing live database files or binary snapshots as planning truth.

## Canonicality Rules

- Git-tracked planning sources remain the bootstrap and PR-review boundary until
  a later ADR changes repository review authority.
- The Postgres store is the local operational surface for agent coordination.
- Imports seed read-model rows from existing files; local operation rows are not
  deleted by import and must be audited in Postgres.
- The local Docker volume may persist data for speed, but it must be
  treated as the machine-local coordination store when agents are operating
  locally.
- Temporary validation databases are disposable and must not be treated as audit
  storage.
- Migrations are tracked in Git and are the only schema authority.
- Imports must be deterministic for the same Git tree.
- Exports must use stable ordering, stable serialization, and explicit hashes.
- Drift checks must fail when imported/exported state disagrees with the chosen
  boundary for that command: Git bootstrap rows for import checks, local
  operation revisions for DB-first authoring checks.
- Generated workboards, routes, dashboards, SQLite/JSONL summaries, and query
  artifacts are derived outputs.
- Generated `system-governance-*` reports may move behind the same derived
  query-store path only after parity proves the Postgres output matches the
  existing file generators.
- Any future decision to make Postgres the canonical repository review source
  requires a separate ADR, backup/restore runbook, CI seed/restore proof, and
  PR-review replacement model.

## Proposed Local Shape

```text
infra/planning-db/docker-compose.yml
scripts/planning-db-run.cjs
scripts/planning-db-run.test.cjs
scripts/planning-db-migrate.cjs
scripts/planning-db-migrate.test.cjs
scripts/planning-db-import.cjs
scripts/planning-db-import.test.cjs
scripts/planning-db-query.cjs
scripts/planning-db-query.test.cjs
scripts/planning-db-operate.cjs
scripts/planning-db-operate.test.cjs
tools/planning-db/migrations/
tools/planning-db/import-planning-state.mjs
tools/planning-db/export-planning-state.mjs
tools/planning-db/check-planning-state-drift.mjs
tools/planning-db/query-planning-state.mjs
tools/planning-db/import-governance-state.mjs
tools/planning-db/export-governance-state.mjs
tools/planning-db/check-governance-state-drift.mjs
tools/planning-db/query-governance-state.mjs
C:\dvt\planning-db\postgres-data
```

`C:\dvt\planning-db\postgres-data` is the shared machine-local volume for all
agents and worktrees on the same Windows PC. It is outside the repository and
must remain untracked. The data directory is a persistent cache, not a canonical
planning source. Operators may still override the data location with
`DVT_PLANNING_DB_DATA_DIR` when they intentionally need a different local disk.

## Proposed Commands

Implemented through the local Docker, content-import, and W4 drift-check
slices:

```bash
pnpm planning:db:up
pnpm planning:db:down
pnpm planning:db:logs
pnpm planning:db:ps
pnpm planning:db:env
pnpm planning:db:health
pnpm planning:db:reset -- --confirm-destroy-shared-planning-db
pnpm planning:db:migrate
pnpm planning:db:import
pnpm planning:db:query
pnpm planning:db:operate
pnpm planning:db:check
pnpm planning:db:export
pnpm planning:db:export:check
pnpm governance:db:check
pnpm governance:refresh
pnpm test:planning:db
pnpm test:planning:db:integration
```

Planned for later governance export and parity slices:

```bash
pnpm governance:db:import
pnpm governance:db:query
pnpm governance:db:export
```

The closeout baseline for the local Docker substrate slice includes:

```bash
pnpm test:planning:db
pnpm test:planning:db:integration
pnpm planning:db:migrate
pnpm planning:db:import
pnpm planning:db:query
pnpm planning:db:check
pnpm governance:db:check
pnpm docs:feature-mechanization --feature GOV-S3-PLANNING-STATE-QUERY-STORE
pnpm docs:feature-mechanization:implementation
pnpm verify:prepush
```

`planning:db:reset` is the only accepted local repair route when the shared
machine-local Postgres volume has applied migration checksums that no longer
match the Git-tracked migration files. The command requires
`--confirm-destroy-shared-planning-db`, verifies the target is a
`postgres-data` directory, backs up any `planning_task_local_state` and
`planning_local_operations` rows under `C:\dvt\planning-db\backups`, stops the
Compose project, deletes only `C:\dvt\planning-db\postgres-data` or the
explicit `DVT_PLANNING_DB_DATA_DIR` override, recreates it, and restarts
Postgres. Contributors must not repair this state by hand-editing
`planning_query_store.schema_migrations`.

Once import/export and drift commands exist, implementation PRs should also
include:

```bash
pnpm governance:refresh
pnpm planning:db:check
pnpm governance:db:check
pnpm docs:workboard:generate
pnpm docs:feature-mechanization:implementation
pnpm verify:prepush
```

## Data Model

The first schema should cover two derived read-model families.

### Planning tables

| Table                       | W2/W6 status | Purpose                                                                  |
| --------------------------- | ------------ | ------------------------------------------------------------------------ |
| `planning_sources`          | implemented  | Git path, content hash, source type, byte size, and local import time    |
| `planning_lanes`            | implemented  | Lane id, source path/hash, title, owner, status, goal, and raw YAML      |
| `planning_tasks`            | implemented  | Task id, lane, status, priority, objective, target, evidence, raw YAML   |
| `planning_task_local_state` | implemented  | Local DB-first task overlay, optimistic revision, claim, and status data |
| `planning_local_operations` | implemented  | Append-only audit log for local planning task commands                   |
| `planning_dependencies`     | planned      | Explicit task-to-task dependency edges parsed out of task dependencies   |
| `planning_evidence_refs`    | planned      | Evidence, closeout, PR, commit, and doc references per task as rows      |
| `planning_status_events`    | planned      | Derived status history when imports detect changed state                 |
| `planning_artifacts`        | planned      | Generated output path, source hash, and artifact hash                    |

### Governance tables

| Table                              | Status      | Purpose                                                     |
| ---------------------------------- | ----------- | ----------------------------------------------------------- |
| `governance_sources`               | implemented | Source path, source type, content hash, byte size           |
| `governance_file_shards`           | implemented | File-index shard id, path, count, and upstream content hash |
| `governance_files`                 | implemented | Tracked path, owning unit, component, root, drift flags     |
| `governance_components`            | implemented | Component/source units and ownership metadata               |
| `governance_component_file_shards` | implemented | Component shard provenance, file counts, and content hashes |
| `governance_component_files`       | implemented | File-to-component membership and shard provenance           |
| `governance_fingerprints`          | implemented | Imported baseline compatibility rows                        |
| `governance_coverage`              | implemented | Governed, ungoverned, drift, legacy, and summary counters   |
| `governance_remediation`           | implemented | Remediation queue items, priority, owner, and source cause  |
| `governance_generated_assets`      | planned     | Generated report path, source hash, and artifact hash       |

### Governance derived projections

| Projection                        | Status      | Purpose                                                      |
| --------------------------------- | ----------- | ------------------------------------------------------------ |
| `governance_file_hash_projection` | implemented | Derive file id, path hash, governance hash, and state hash   |
| `governance_file_hash_drift`      | implemented | Expose mismatches between imported columns and DB derivation |

The W2 schema is intentionally content-first. It stores the source hash for each
imported YAML file and keeps `raw_lane`, `raw_task`, `raw_shard`, and `raw_file`
JSONB columns so no current lane or governance field is thrown away while the
first typed query columns stabilize. Typed columns are added only for fields that
already drive repeated operational questions: lane/status/priority/progress,
task objective/target/evidence, file ownership, component unit, governance
state, drift, legacy, and content hashes.

The W3 governance-content slice extends the same posture to component indexes,
component-file shards, fingerprint baselines, coverage reports, and remediation
queues. The import still treats Git-tracked YAML as authority and stores raw
JSONB next to typed query columns so the database can double-check counts and
hashes without hiding any source content outside PR review.

The W6 local-operation slice adds DB-first authoring state without deleting the
imported read model. `planning_task_local_state` stores the effective local
overlay for one `(lane_id, task_id)` with an optimistic revision and optional
claim token. `planning_local_operations` stores every claim, release, and patch
as an append-only audit row with the actor, idempotency key, base source hash,
expected revision, resulting revision, and payload. Imports may refresh
`planning_tasks`; they must not erase the local operation audit.

These tables are enough to answer high-value operational questions without
introducing a large platform:

- which tasks are in `review` without accepted evidence;
- which blockers reference tasks already marked `done`;
- which cross-lane dependencies are stale;
- which generated artifacts are stale for the imported state;
- which lane summaries disagree with task-level weighted progress.
- which files moved components or ownership;
- which component shards changed because of real source edits;
- which governance fingerprints changed, disappeared, or appeared;
- which drift/remediation rows are real root-cause items versus generated
  churn;
- which source file caused a generated governance report to move.
- which local agent claimed or patched a task and which revision was produced;
- which local DB task overlay still needs export into a reviewable snapshot.

## Command And Query Rail Impact

This plan defines planning-tooling rails. It does not change product runtime
behavior.

| Rail                               | Type    | Bounded context       | DDD object                    | Adapter surface                   |
| ---------------------------------- | ------- | --------------------- | ----------------------------- | --------------------------------- |
| `ImportPlanningStateQueryStore`    | command | Planning registry     | `PlanningStateImport`         | file-system + SQL                 |
| `QueryPlanningStateReadModel`      | query   | Planning registry     | `PlanningStateReadModel`      | SQL query adapter                 |
| `ExportPlanningStateSnapshot`      | command | Planning registry     | `PlanningStateExport`         | SQL + file-system                 |
| `ValidatePlanningStateDrift`       | query   | Planning governance   | `PlanningStateDriftReport`    | SQL + Git comparison              |
| `ApplyPlanningLocalOperation`      | command | Planning registry     | `PlanningLocalOperation`      | SQL transaction                   |
| `QueryPlanningLocalOperationAudit` | query   | Planning registry     | `PlanningLocalOperationAudit` | SQL query adapter                 |
| `GeneratePlanningDerivedSurfaces`  | command | Documentation tooling | `PlanningGeneratedArtifact`   | docs generator                    |
| `MigratePlanningQueryStoreSchema`  | command | Planning tooling      | `PlanningQueryStoreSchema`    | SQL migration runner              |
| `ManagePlanningQueryStoreRuntime`  | command | Planning tooling      | `PlanningQueryStoreRuntime`   | Docker Compose                    |
| `InspectPlanningQueryStoreRuntime` | query   | Planning tooling      | `PlanningQueryStoreRuntime`   | Docker Compose + env              |
| `ImportGovernanceStateQueryStore`  | command | Docs governance       | `GovernanceStateImport`       | file-system + SQL                 |
| `QueryGovernanceStateReadModel`    | query   | Docs governance       | `GovernanceStateReadModel`    | SQL query adapter                 |
| `ExportGovernanceStateSnapshot`    | command | Docs governance       | `GovernanceStateExport`       | SQL + file-system                 |
| `ValidateGovernanceStateDrift`     | query   | Docs governance       | `GovernanceStateDriftReport`  | SQL + Git comparison              |
| `RefreshGovernanceDerivedSurfaces` | command | Docs governance       | `GovernanceRefreshWorkflow`   | package scripts + Git fingerprint |

Implementation must not create parallel planning task semantics outside these
rails. If a future slice adds a UI, API, or GitHub mirror, it must reuse these
rails or extend the catalog explicitly.

The local runtime rails are operational only. `planning:db:up` and
`planning:db:down` and `planning:db:reset` implement
`ManagePlanningQueryStoreRuntime`.
`planning:db:ps`, `planning:db:env`, `planning:db:logs`, and
`planning:db:health` implement `InspectPlanningQueryStoreRuntime`. Scope is
local machine operation; authorization is the developer's local OS and Docker
access. Negative tests live in `scripts/planning-db-run.test.cjs` and verify the
shared Windows data directory, fixed Compose project, environment override
policy, Docker command selection, reset confirmation, reset target safety, and
rejection of unknown actions.

`planning:db:migrate` implements `MigratePlanningQueryStoreSchema`.
`planning:db:import` implements `ImportPlanningStateQueryStore` and
`ImportGovernanceStateQueryStore` together for the W2 local content snapshot.
`planning:db:query` implements `QueryPlanningStateReadModel` and
`QueryGovernanceStateReadModel` for the current summary surface. The default
`summary` query is intentionally lightweight and does not touch the
`governance_file_hash_drift` projection. `planning:db:query hash-drift` is the
explicit heavy query for DB-derived governance hash drift. `planning:db:query
tasks` and `planning:db:query next` read `planning_effective_tasks`, not raw
lane YAML, so local DB-first overlays are visible in daily filtering and next
task selection. Scope is local developer tooling only; authorization is local
OS and Docker/Postgres access. Negative tests cover migration checksum
mismatch, unknown query names, fast summary isolation from the hash-drift
projection, explicit hash-drift querying, effective task filtering, actionable
next-task filtering, content extraction from real lane YAML, and governance
file-count parity with the Git-tracked file index.

`planning:db:operate` implements `ApplyPlanningLocalOperation` and
`QueryPlanningLocalOperationAudit`. It is the local DB-first command surface for
agents: `task claim`, `task release`, `task update`, `task show`, and `audit`.
It validates that a task exists in the imported planning read model, writes a
local overlay with an optimistic revision, and appends an audit row in the same
transaction. Scope is local developer tooling only; authorization is local OS
and Docker/Postgres access. Negative tests cover required actor/lane/task
arguments, invalid statuses, stale expected revisions, idempotency, jsonb
payload key-order stability, stale replay rejection after task revision
advances, and audit row formatting.

`planning:db:check` implements `ValidatePlanningStateDrift`. It compares the
current Git-tracked planning lane snapshot with imported Postgres rows by source
hash, lane id, and `(lane_id, task_id)` identity. It fails closed when a source
hash is stale, a row is missing, or an unexpected imported row exists.

`planning:db:export` implements `ExportPlanningStateSnapshot` for the first
planning-derived surface parity slice. It reads Postgres lane rows and
`planning_effective_tasks`, reconstructs lane registry documents into a
temporary source directory, exports reviewable status/progress/evidence fields
from local DB overlays, and delegates rendering to the existing
`GeneratePlanningDerivedSurfaces` adapter instead of adding a parallel workboard
renderer. Scope is local developer tooling only; authorization is local OS and
Docker/Postgres access. Local claim tokens, claim expiry, and audit rows remain
DB-local and are not exported to lane YAML. `planning:db:export:check` compares
the DB-rendered execution workboard and open-task route against the current
generated files and fails closed on missing artifacts, stale DB content, or
renderer drift.

`governance:db:check` implements `ValidateGovernanceStateDrift`. It compares the
current Git-tracked governance snapshot with imported Postgres rows by source
hash, file path, component id, `(component_id, path)` identity, DB-derived
fingerprint path, coverage id, and remediation task id. It fails closed when any
imported governance read model no longer matches the repository state. File id,
path hash, governance hash, and state fingerprint are read from the Postgres
projection, so the accepted fingerprint baseline is no longer the comparison
source for those values.

`governance:refresh` implements `RefreshGovernanceDerivedSurfaces`. It runs the
canonical generation order from the system-governance workflow component,
repeats generation until staged, unstaged, and untracked non-ignored worktree
fingerprints stop changing, then imports and checks the planning/governance
query store. Scope is local developer tooling only; authorization is local OS
and Docker/Postgres access. Negative tests in
`scripts/governance-refresh.test.cjs` prove the stage order, repeat-until-stable
behavior, and fail-closed posture when generated output does not converge.

### W4 Implementation Plan

1. Correct this plan so the W4 drift checks are no longer described as future
   work and the Postgres-versus-Mongo decision is explicit.
2. Keep the existing TDD red tests in `scripts/planning-db-check.test.cjs` and
   `scripts/governance-db-check.test.cjs`, then run `pnpm test:planning:db` to
   prove the missing runners fail before implementation.
3. Add focused check runners in `scripts/planning-db-check.cjs` and
   `scripts/governance-db-check.cjs`; reuse the canonical snapshot builders from
   `scripts/planning-db-import.cjs` rather than reparsing YAML differently.
4. Keep the database read side read-only for checks: compare Postgres rows to
   Git snapshots and never mutate canonical state from a check command.
5. Regenerate the affected governance/status projections after adding files and
   updating package scripts.
6. Validate W4 with `pnpm test:planning:db`, `pnpm planning:db:import`,
   `pnpm planning:db:check`, `pnpm governance:db:check`, `pnpm ci:docs`, and
   `pnpm verify:prepush`.

### W5 Implementation Plan

1. Add a focused red test in `scripts/governance-refresh.test.cjs` that fixes
   the canonical generation order, requires repeat-until-stable behavior, and
   fails before database import when generation does not converge.
2. Add `scripts/governance-refresh.cjs` as the single local orchestration
   command for docs/governance generation plus planning/governance DB drift
   checks.
3. Use a Git worktree fingerprint only as a convergence guard. Git remains the
   canonical source boundary; the fingerprint does not replace reviewed
   tracked sources or `contentSha256` DB drift checks.
4. Document the workflow in the ci-governance component so agents no longer
   rely on memory for regeneration sequence.
5. Keep any proposal to reduce non-code check cost as a later CI policy slice.
   This implementation records the cost gap but does not silently relax docs,
   feature mechanization, fingerprint, or prepush gates.
6. Validate W5 with `pnpm test:governance:refresh`, `pnpm test:planning:db`,
   `pnpm governance:refresh`, `pnpm ci:docs`, and `pnpm verify:prepush`.

### W6 Implementation Plan

1. Update this plan and the GOV-S2 closeout to clarify that the current file
   import/check flow was a derived read model and that agent collision avoidance
   requires DB-first local operations.
2. Add red tests in `scripts/planning-db-operate.test.cjs` for CLI argument
   validation, operation planning, optimistic revision rejection, idempotency,
   and audit formatting.
3. Add `003_local_operation_store.sql` with `planning_task_local_state` and
   `planning_local_operations`. The audit table must not reference imported
   rows with cascading deletes because audit must survive re-imports.
4. Add `scripts/planning-db-operate.cjs` with transactional `task claim`,
   `task release`, `task update`, `task show`, and `audit` surfaces.
5. Add `planning:db:operate` to `package.json` and include the new tests in
   `test:planning:db`.
6. Validate W6 with `pnpm test:planning:db`,
   `pnpm docs:feature-mechanization --feature GOV-S3-PLANNING-STATE-QUERY-STORE`,
   `pnpm docs:feature-mechanization:implementation`, `pnpm governance:refresh`,
   `pnpm planning:db:reset -- --confirm-destroy-shared-planning-db`, and
   `pnpm verify:prepush`.

### W7 Implementation Plan

1. Update this plan before code so `planning:db:export` is no longer an
   undeclared future command and the export parity boundary is explicit.
2. Add red tests in `scripts/planning-db-export.test.cjs` for reconstructing
   lane documents from DB rows, replacing raw lane task arrays with normalized
   task rows, detecting generated artifact drift, and preserving the generated
   artifact allowlist.
3. Add `scripts/planning-db-export.cjs` as a thin DB-to-generator command. It
   must read imported Postgres rows, emit temporary lane YAML source files, and
   invoke the existing `scripts/generate-workboard.cjs` renderer rather than
   duplicating workboard formatting logic.
4. Add `planning:db:export` and `planning:db:export:check` package scripts and
   wire `planning:db:export:check` into `governance:refresh` after import and
   planning drift check. This keeps the current generation sequence canonical
   while proving DB parity before closeout.
5. Extend the live planning DB integration test to export DB-derived planning
   views into a temporary output root after import and assert both expected
   generated files exist.
6. Validate W7 with `pnpm test:planning:db`,
   `pnpm test:planning:db:integration`, `pnpm planning:db:import`,
   `pnpm planning:db:export:check`, `pnpm governance:refresh`,
   `pnpm ci:docs`, and `pnpm verify:prepush`.

### W8 Implementation Plan

1. Add a focused red test for the new governance generated-output boundary:
   derived `system-governance-*` artifacts must resolve to
   `.generated-docs/planning/status/`, while
   `system-governance-unit-index.units.yaml` remains the tracked source
   manifest.
2. Add `scripts/governance-generated-paths.cjs` as the single path helper for
   generated governance outputs.
3. Retarget document-map, file/component-index, fingerprint, coverage,
   remediation, and changed-file scripts to read/write the generated governance
   read side from `.generated-docs/planning/status/`. This W8 step is
   superseded for `planning:db:import` by W10, where DB import rebuilds
   equivalent projections in memory.
4. Change governance `:check` scripts so local/CI checks regenerate ignored
   artifacts instead of failing because generated files are absent from a clean
   checkout.
5. Remove former derived `system-governance-*`, `governance-files/**`, and
   `governance-components/**` outputs from tracking. Keep source surfaces such
   as `system-governance-unit-index.units.yaml`,
   `system-governance-unit-index-20260501.md`, and
   `system-governance-unit-taxonomy-20260501.md` tracked.
6. Update `docs/generated-docs-policy.json` and the CI governance component so
   reviewers see that these artifacts are ignored local outputs, not PR review
   files.
7. Validate W8 with focused generator tests, `pnpm test:planning:db`,
   `pnpm governance:refresh`, `pnpm ci:docs`, and `pnpm verify:prepush`.

### W9 Implementation Plan

1. Add focused red tests requiring a Postgres migration for derived governance
   hash projections and an explicit query surface for governance hash drift.
2. Add a Postgres hash projection that recomputes file id, path hash,
   governance hash, and state fingerprint from imported governance file rows.
   The imported `content_hash` remains the byte-level fact until a later slice
   imports file contents directly.
3. Retarget `governance:db:check` so fingerprint comparisons read from
   `governance_file_hash_projection`, not from the imported fingerprint baseline.
4. Extend the live planning DB integration test to assert zero
   `governance_file_hash_drift` rows after import.
5. Validate W9 with `pnpm test:planning:db`,
   `pnpm test:planning:db:integration`, `pnpm planning:db:import`,
   `pnpm planning:db:query`, `pnpm governance:db:check`,
   `pnpm governance:refresh`, `pnpm ci:docs`, and `pnpm verify:prepush`.

### W10 Implementation Plan

1. Add focused red tests proving `buildGovernanceFileSnapshot` builds DB import
   rows from in-memory governance generator projections and marks those sources
   as `in-memory-generator`.
2. Expose typed payloads from the governance file/component and document-unit
   generators so import code can reuse the existing generator logic without
   reading `.generated-docs` shards from disk.
3. Retarget `planning:db:import` to build governance file, component,
   fingerprint, coverage, remediation, and document-map inputs in memory. Keep
   generated repo paths as stable source identifiers, but compute source hashes
   from the in-memory payloads.
4. Keep `.generated-docs` generation as a local inspection and legacy parity
   surface only. It must no longer be required before `planning:db:import`.
5. Retarget `docs:governance:changed-files:check` to derive the current file
   index and baseline from the same in-memory snapshot instead of reading
   `.generated-docs` files.
6. Remove the obsolete `governance:artifacts:generate` rail so
   `governance:refresh` remains the single local orchestration command. The DB
   test rail must prove it can build governance import content without
   pregenerated local files.
7. Serialize `planning:db:import` destructive read-model replacement with a
   transaction-scoped advisory lock so concurrent agents using the shared
   machine-local Postgres volume cannot interleave delete and insert phases.
8. Validate W10 with `pnpm test:planning:db`,
   `pnpm test:planning:db:integration`, `pnpm planning:db:import`,
   `pnpm planning:db:query`, `pnpm governance:db:check`,
   `pnpm governance:refresh`, `pnpm ci:docs`, and `pnpm verify:prepush`.

### W10A Fast Query Summary Implementation Plan

1. Keep `planning:db:query` as the daily local inspection command and prevent
   it from recalculating DB-derived governance hashes during the default
   `summary` query.
2. Add an explicit `planning:db:query hash-drift` query for operators and QA
   slices that need to inspect `governance_file_hash_drift` directly.
3. Keep `governance:db:check` as the fail-closed deep validation rail for
   governance drift; the fast summary must not replace it.
4. Prove the split with tests that fail when the default summary references
   `governance_file_hash_drift` and pass only when hash drift is queried through
   the explicit heavy route.
5. Validate W10A with `pnpm test:planning:db`,
   `pnpm test:planning:db:integration`, `pnpm planning:db:query`,
   `pnpm planning:db:query hash-drift`, `pnpm governance:db:check`,
   `pnpm ci:docs`, and `pnpm verify:prepush`.

### W11 Effective Task Operations Implementation Plan

1. Add red migration coverage proving a tracked SQL migration creates
   `planning_effective_tasks`, the read model that overlays
   `planning_task_local_state` on top of imported `planning_tasks`.
2. Add red query tests for `planning:db:query tasks` and
   `planning:db:query next`, including lane/status/claim filters, stable task
   row rendering, and actionable-next filtering from effective task status.
3. Add red export tests proving `planning:db:export` writes effective status,
   progress, evidence, and status reason from the DB overlay back into temporary
   lane YAML before rendering workboard/open-task-route artifacts.
4. Implement `005_planning_effective_task_read_model.sql` as a view only. The
   slice must not mutate imported `planning_tasks`, create/delete tasks, or make
   Postgres the repository review authority.
5. Retarget `planning:db:query summary`, `tasks`, and `next` to read
   `planning_effective_tasks` so daily filters reflect local DB-first task
   operations without rereading lane YAML.
6. Retarget `planning:db:export` to read the effective view and overlay only
   exported task fields that belong in the reviewable lane registry. Local
   claims, claim tokens, and audit rows remain DB-local and are not exported to
   YAML.
7. Update planning operation docs so existing-task status/claim/review updates
   use `planning:db:operate` plus query/export/check. Keep lane YAML as the
   bootstrap and PR-review compatibility surface for new task creation until a
   later slice moves create/delete semantics.
8. Validate W11 with `pnpm test:planning:db`,
   `pnpm test:planning:db:integration`, `pnpm planning:db:query tasks`,
   `pnpm planning:db:query next`, `pnpm planning:db:export:check`,
   `pnpm governance:refresh`, `pnpm docs:feature-mechanization:implementation`,
   and `pnpm verify:prepush`.

## GitHub Issues Role

GitHub Issues may be useful as a collaboration mirror after the query store is
stable:

- issue forms can collect human intake;
- labels and project fields can expose lane, status, priority, and assignee;
- PR links can improve traceability from execution to review.

The first slice should not make Issues canonical. An agent working from local
repo state should be able to import, query, validate, and regenerate planning
surfaces without network access.

## Migration Sequence

1. Add this plan and agree on the storage boundary.
2. Extract the current `system-governance-*` generation workflow into the
   `ci-governance` component contract, including stages, inputs, outputs,
   check modes, and review fan-out.
3. Add Docker Compose with the shared `C:\dvt\planning-db\postgres-data`
   machine-local volume and local runtime scripts.
4. Add schema migrations and import existing `agent-lane-*.yaml` plus
   `system-governance-file-index.files.yaml` shards into read-only Postgres
   tables with source hashes.
5. Import existing `system-governance-*` component maps,
   fingerprints, coverage reports, and remediation queues into read-only
   Postgres tables.
6. Add query and drift checks that compare Postgres output to Git-tracked lane
   and governance state.
7. Add `governance:refresh` as the canonical local refresh sequence for docs
   and system-governance generated surfaces, with query-store import/checks
   gated on stable generated output.
8. Add DB-first local operation commands for task claims, task patches, and
   durable audit so local agents stop using lane YAML as their coordination
   backend.
9. Derive governance file identity, path hash, governance hash, and state
   fingerprint in Postgres views from imported governance file rows.
10. Build governance DB import from in-memory generator projections instead of
    reading `.generated-docs` files as import input.
11. Move workboard and open-task-route generation to read from the query store
    when available, with deterministic file fallback during transition. The
    first slice of this step is the effective task read model for existing task
    operations only: local claim/status/progress/evidence overlays are queried
    and exported through Postgres, while task creation and deletion stay in lane
    YAML until a later slice declares those command semantics.
12. Move governance report generation to read from the query store only after
    parity proves it matches the current generators.
13. Split large lane YAML files into smaller Git-tracked task shards only after
    the import/export checks prove parity.
14. Consider compacting generated governance shards after query-store parity
    proves reviewers can inspect root causes without losing deterministic output.
15. Consider an optional GitHub Issues mirror after local and CI query-store
    workflows are stable.

Current implementation status on 2026-05-08:

- steps 1 through 5 are implemented in the local query-store branch;
- `pnpm planning:db:query` now exposes summary counts for lanes, tasks,
  governance files, governance components, component-file memberships,
  fingerprints, coverage rows, and remediation tasks;
- step 6 is implemented: deterministic drift checks compare the imported
  Postgres state back to Git-tracked planning and governance sources before
  later export or generator migration work starts;
- step 7 is implemented: `pnpm governance:refresh` encodes the canonical
  regeneration order, repeats until generated output stabilizes, then runs
  planning and governance query-store import/checks;
- step 8 is implemented: `pnpm planning:db:operate` gives agents a local
  DB-first task operation surface with revision checks, collision-safe default
  idempotency keys, jsonb-stable idempotent replay validation, and durable audit
  rows. Replays fail closed when the task has advanced beyond the original
  operation's resulting revision;
- step 9 is implemented: Postgres derives governance file id, path hash,
  governance hash, and state fingerprint through
  `governance_file_hash_projection`, and `governance:db:check` compares against
  that projection instead of the imported fingerprint baseline;
- step 10 is implemented: `planning:db:import` builds governance rows from
  generator projections in memory instead of reading `.generated-docs` files as
  the DB import source, `docs:governance:changed-files:check` reads the same
  in-memory current index/baseline, and `test:planning:db` no longer
  pregenerates governance artifacts before the DB tests. The import transaction
  also takes a transaction-scoped advisory lock before replacing read-model rows
  so concurrent local agents cannot race on the shared Postgres volume;
- W10A is implemented: the default `pnpm planning:db:query` summary reads only
  lightweight read-model counts, while `pnpm planning:db:query hash-drift`
  owns the explicit heavy hash projection inspection;
- W11 first slice is implemented: `planning_effective_tasks` overlays
  `planning_task_local_state` on imported `planning_tasks`;
  `planning:db:query tasks` and `planning:db:query next` read effective task
  state, and
  `planning:db:export` exports reviewable effective status/progress/evidence
  fields without exporting local claim tokens or audit rows;
- the obsolete `governance:artifacts:generate` package alias is removed;
  `pnpm governance:refresh` is the single local orchestration command for
  generated inspection artifacts plus planning/governance DB import and checks;
- one-off architecture migration helpers from the earlier architecture rehome
  are removed from active `scripts/` because the move has already landed and
  the scripts were not part of any package, CI, governance refresh, or DB rail;
- the shared DB checksum-repair route is implemented through
  `pnpm planning:db:reset -- --confirm-destroy-shared-planning-db`, not through
  manual edits to `schema_migrations`;
- the remainder of step 11 and steps 12 through 15 remain future concrete
  follow-up work. They do not keep
  `GOV-S2` open; `GOV-S2` is the closed framework umbrella and this plan owns
  any remaining query-store parity or generated-artifact compaction work.

## Failure Modes And Guardrails

| Failure mode                              | Guardrail                                                     |
| ----------------------------------------- | ------------------------------------------------------------- |
| Local DB diverges from Git                | `planning:db:check` fails on drift                            |
| Docker volume lost                        | Rebuild from Git with import command                          |
| Import order affects output               | Stable ordering and hash checks                               |
| Generated artifact churn returns          | Artifact hashes recorded in `planning_artifacts`              |
| Agents forget refresh order               | `governance:refresh` owns order and repeats until stable      |
| Agents collide on lane YAML edits         | `planning:db:operate` owns local task claims and revisions    |
| Applied migration checksum mismatch       | `planning:db:reset` rebuilds the shared volume from Git       |
| Local DB audit is lost in temp DB         | durable audit uses the shared local Postgres volume           |
| Non-code gate cost grows unchecked        | Treat CI policy reduction as a separate governed optimization |
| Governance report churn is hidden         | Governance artifact hashes and source causes are queryable    |
| DB treated as hidden repository authority | No committed database files; export must remain reviewable    |
| GitHub mirror edits bypass PR review      | Mirror is read-only or imports as reviewed repo changes first |

## Acceptance Criteria

- A clean checkout can start Postgres, run migrations, import planning sources,
  and produce the same query-state hash.
- Resetting `C:\dvt\planning-db\postgres-data` does not lose canonical planning
  truth because Git-tracked files remain the bootstrap and review boundary.
- The drift check fails when a task differs between Git and exported DB state.
- The governance drift check fails when a file index, component map,
  fingerprint, coverage, or remediation row differs between Git and exported DB
  state.
- Agents can answer review, blocker, dependency, and evidence questions through
  narrow SQL/query commands instead of loading entire lane files.
- Agents can claim and patch local planning task state through
  `planning:db:operate` without editing lane YAML directly.
- Local task operations produce append-only audit rows that survive read-model
  imports.
- Agents can answer file ownership, component, fingerprint, coverage, and
  remediation questions through narrow SQL/query commands instead of loading
  entire governance shards.
- Generated planning views remain deterministic and traceable to source hashes.
- Generated governance reports remain deterministic and traceable to source
  hashes.
- The governance refresh sequence is executable through one local command and
  fails closed if generated output does not stabilize before DB import/check.

## Non-Goals

- No product runtime storage change.
- No migration of engine, planner, adapter, API, or web state.
- No canonical GitHub Issues migration.
- No committed Postgres data directory, dump, or binary database.
- No relaxation of docs, feature mechanization, fingerprint, or prepush gates.
- No product runtime dependency on the local planning DB.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: GOV-S3-PLANNING-STATE-QUERY-STORE
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
componentGuides:
  - docs/planning/state/planning-control-tower.md
  - docs/planning/state/how-to-add-tasks.md
  - docs/DOCS_README.md
  - docs/architecture/components/ci-governance/index.md
  - docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md
  - docs/architecture/components/ci-governance/local-changed-files-gate-component.md
userStories:
  - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/DOCS_README.md
  - docs/planning/state/planning-control-tower.md
  - docs/planning/state/how-to-add-tasks.md
  - docs/architecture/reference-architecture.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - .gitignore
  - AGENTS.md
  - package.json
  - infra/planning-db/**
  - tools/planning-db/**
  - tools/governance-db/**
  - scripts/planning-db-*.cjs
  - scripts/governance-db-*.cjs
  - scripts/governance-refresh*.cjs
  - scripts/governance-generated-paths*.cjs
  - scripts/generate-governance-*.cjs
  - scripts/check-governance-*.cjs
  - scripts/check-feature-mechanization.cjs
  - scripts/check-feature-mechanization.test.cjs
  - docs/DOCS_README.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/components/ci-governance/index.md
  - docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md
  - docs/planning/state/planning-control-tower.md
  - docs/planning/state/how-to-add-tasks.md
  - docs/planning/closeouts/**
  - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
  - docs/planning/proposals/portfolio-map-20260403.md
  - docs/planning/index.md
  - docs/planning/proposals/index.md
  - docs/planning/status/**
  - docs/.manifest.json
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
  - .github/workflows/**
commandQueryRails:
  - name: ImportPlanningStateQueryStore
    type: command
    dddOwner: PlanningStateImport
  - name: QueryPlanningStateReadModel
    type: query
    dddOwner: PlanningStateReadModel
  - name: ExportPlanningStateSnapshot
    type: command
    dddOwner: PlanningStateExport
  - name: ValidatePlanningStateDrift
    type: query
    dddOwner: PlanningStateDriftReport
  - name: ApplyPlanningLocalOperation
    type: command
    dddOwner: PlanningLocalOperation
  - name: QueryPlanningLocalOperationAudit
    type: query
    dddOwner: PlanningLocalOperationAudit
  - name: GeneratePlanningDerivedSurfaces
    type: command
    dddOwner: PlanningGeneratedArtifact
  - name: MigratePlanningQueryStoreSchema
    type: command
    dddOwner: PlanningQueryStoreSchema
  - name: ManagePlanningQueryStoreRuntime
    type: command
    dddOwner: PlanningQueryStoreRuntime
  - name: InspectPlanningQueryStoreRuntime
    type: query
    dddOwner: PlanningQueryStoreRuntime
  - name: ImportGovernanceStateQueryStore
    type: command
    dddOwner: GovernanceStateImport
  - name: QueryGovernanceStateReadModel
    type: query
    dddOwner: GovernanceStateReadModel
  - name: ExportGovernanceStateSnapshot
    type: command
    dddOwner: GovernanceStateExport
  - name: ValidateGovernanceStateDrift
    type: query
    dddOwner: GovernanceStateDriftReport
  - name: RefreshGovernanceDerivedSurfaces
    type: command
    dddOwner: GovernanceRefreshWorkflow
  - name: QuerySystemGovernanceGenerationWorkflow
    type: query
    dddOwner: GovernanceGenerationWorkflow
  - name: ValidateSystemGovernanceGenerationWorkflow
    type: query
    dddOwner: GovernanceWorkflowDriftReport
domainObjects:
  - name: PlanningStateImport
    type: command model
    owner: Product / Architecture / Delivery / Docs
  - name: PlanningStateReadModel
    type: read model
    owner: Product / Architecture / Delivery / Docs
  - name: PlanningStateExport
    type: command model
    owner: Product / Architecture / Delivery / Docs
  - name: PlanningStateDriftReport
    type: read model
    owner: Docs governance
  - name: PlanningLocalOperation
    type: command model
    owner: Product / Architecture / Delivery / Docs
  - name: PlanningLocalOperationAudit
    type: read model
    owner: Product / Architecture / Delivery / Docs
  - name: PlanningGeneratedArtifact
    type: generated artifact
    owner: Docs governance
  - name: PlanningQueryStoreSchema
    type: local schema
    owner: Product / Architecture / Delivery / Docs
  - name: PlanningQueryStoreRuntime
    type: local runtime
    owner: Product / Architecture / Delivery / Docs
  - name: GovernanceStateImport
    type: command model
    owner: Docs governance
  - name: GovernanceStateReadModel
    type: read model
    owner: Docs governance
  - name: GovernanceStateExport
    type: command model
    owner: Docs governance
  - name: GovernanceStateDriftReport
    type: read model
    owner: Docs governance
  - name: GovernanceRefreshWorkflow
    type: command model
    owner: Docs governance
  - name: GovernanceGenerationWorkflow
    type: read model
    owner: Docs governance
  - name: GovernanceWorkflowDriftReport
    type: read model
    owner: Docs governance
fowlerSignals:
  - Large planning file operating cost
  - Generated artifact churn
  - Hidden query model inside YAML
  - Hidden query model inside governance shards
  - Mutable external tracker authority risk
architectureGuards:
  - pnpm test:governance:refresh
  - pnpm test:planning:db
  - pnpm test:planning:db:integration
  - pnpm docs:feature-mechanization --feature GOV-S3-PLANNING-STATE-QUERY-STORE
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - planning query-store proposal has no browser workflow.
completionGate:
  - pnpm test:governance:refresh
  - pnpm test:planning:db
  - pnpm test:planning:db:integration
  - pnpm planning:db:migrate
  - pnpm planning:db:import
  - pnpm planning:db:query
  - pnpm planning:db:query hash-drift
  - pnpm planning:db:export
  - pnpm planning:db:export:check
  - pnpm planning:db:reset -- --confirm-destroy-shared-planning-db
  - pnpm planning:db:operate
  - pnpm planning:db:check
  - pnpm governance:db:check
  - pnpm governance:refresh
  - pnpm docs:sync
  - pnpm docs:workboard:generate
  - pnpm docs:feature-mechanization --feature GOV-S3-PLANNING-STATE-QUERY-STORE
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: proposal-surface-admission
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: Planning query-store proposal is outside allowedImplementationSurfaces before this manifest declares it.
    patchSurfaces:
      - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
    greenTest: pnpm docs:feature-mechanization:implementation
  - id: system-governance-workflow-contract
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: New ci-governance workflow contract is outside allowedImplementationSurfaces before this manifest declares it.
    patchSurfaces:
      - docs/architecture/components/ci-governance/index.md
      - docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md
      - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
    greenTest: pnpm docs:feature-mechanization:implementation
  - id: planning-db-common-docker-runtime
    redTest: pnpm test:planning:db
    expectedFailure: Shared machine-local Docker runtime contract is missing before the wrapper and Compose file exist.
    patchSurfaces:
      - package.json
      - infra/planning-db/**
      - scripts/planning-db-*.cjs
      - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
    greenTest: pnpm test:planning:db
  - id: planning-db-content-schema-and-import
    redTest: pnpm test:planning:db
    expectedFailure: Planning DB content parser, migration runner, and summary query are missing before W2 exists.
    patchSurfaces:
      - package.json
      - tools/planning-db/**
      - scripts/planning-db-*.cjs
      - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
    greenTest: pnpm test:planning:db
  - id: planning-db-live-content-parity
    redTest: pnpm test:planning:db:integration
    expectedFailure: Live Postgres does not yet contain lane tasks and governance files matching Git-tracked source counts.
    patchSurfaces:
      - package.json
      - tools/planning-db/**
      - scripts/planning-db-*.cjs
      - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
    greenTest: pnpm test:planning:db:integration
  - id: governance-db-content-schema-and-import
    redTest: pnpm test:planning:db
    expectedFailure: Governance component, fingerprint, coverage, and remediation content is not yet queryable from Postgres.
    patchSurfaces:
      - tools/planning-db/**
      - scripts/planning-db-*.cjs
      - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
    greenTest: pnpm test:planning:db
  - id: governance-db-live-content-parity
    redTest: pnpm test:planning:db:integration
    expectedFailure: Live Postgres does not yet preserve governance component, fingerprint, coverage, and remediation counts from Git-tracked YAML.
    patchSurfaces:
      - tools/planning-db/**
      - scripts/planning-db-*.cjs
      - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
    greenTest: pnpm test:planning:db:integration
  - id: planning-query-store-drift-check
    redTest: pnpm planning:db:check
    expectedFailure: Drift check fails when imported Postgres state differs from Git-tracked planning state.
    patchSurfaces:
      - package.json
      - scripts/planning-db-*.cjs
      - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
    greenTest: pnpm planning:db:check
  - id: governance-query-store-drift-check
    redTest: pnpm governance:db:check
    expectedFailure: Drift check fails when imported Postgres state differs from Git-tracked governance state.
    patchSurfaces:
      - package.json
      - scripts/governance-db-*.cjs
      - scripts/planning-db-*.cjs
      - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
      - docs/planning/status/**
    greenTest: pnpm governance:db:check
  - id: governance-refresh-orchestrator
    redTest: pnpm test:governance:refresh
    expectedFailure: Governance refresh runner does not exist before the W5 orchestrator slice.
    patchSurfaces:
      - AGENTS.md
      - package.json
      - scripts/governance-refresh*.cjs
      - docs/guides/ai-work-protocol.md
      - docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md
      - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
      - docs/planning/status/**
    greenTest: pnpm test:governance:refresh
  - id: planning-db-local-operation-audit
    redTest: pnpm test:planning:db
    expectedFailure: Local DB-first task operation tables and runner are missing before the W6 operational slice.
    patchSurfaces:
      - package.json
      - tools/planning-db/**
      - scripts/planning-db-*.cjs
      - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
    greenTest: pnpm test:planning:db
  - id: planning-db-export-parity
    redTest: pnpm test:planning:db
    expectedFailure: Planning DB export runner does not yet regenerate planning-derived views through the canonical workboard renderer.
    patchSurfaces:
      - package.json
      - scripts/planning-db-*.cjs
      - scripts/governance-refresh*.cjs
      - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
    greenTest: pnpm test:planning:db
  - id: governance-generated-artifact-extraction
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: Governance generation still treats system-governance indexes, shards, fingerprints, coverage, and remediation reports as tracked review files instead of local inspection artifacts with equivalent in-memory Postgres import payloads.
    patchSurfaces:
      - .gitignore
      - package.json
      - scripts/governance-generated-paths*.cjs
      - scripts/generate-governance-*.cjs
      - scripts/check-governance-*.cjs
      - scripts/planning-db-*.cjs
      - scripts/governance-db-*.cjs
      - docs/generated-docs-policy.json
      - docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md
      - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
      - docs/planning/status/**
    greenTest: pnpm docs:feature-mechanization:implementation
  - id: governance-db-derived-hash-projections
    redTest: pnpm test:planning:db
    expectedFailure: Governance file id, path hash, governance hash, and state fingerprint are still compared from the imported fingerprint baseline instead of DB-derived projections.
    patchSurfaces:
      - tools/planning-db/**
      - scripts/planning-db-*.cjs
      - scripts/governance-db-*.cjs
      - docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md
      - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
    greenTest: pnpm test:planning:db
  - id: governance-db-in-memory-import
    redTest: pnpm test:planning:db
    expectedFailure: Planning DB import still reads governance projections from generated files instead of rebuilding generator projections in memory.
    patchSurfaces:
      - scripts/planning-db-*.cjs
      - scripts/generate-governance-*.cjs
      - scripts/check-governance-*.cjs
      - docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md
      - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
    greenTest: pnpm test:planning:db
  - id: planning-db-effective-task-operations
    redTest: pnpm test:planning:db
    expectedFailure: Planning DB queries and export still read imported lane task rows directly instead of the effective DB overlay read model for existing task operations.
    patchSurfaces:
      - tools/planning-db/**
      - scripts/planning-db-*.cjs
      - docs/planning/state/planning-control-tower.md
      - docs/planning/state/how-to-add-tasks.md
      - docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
    greenTest: pnpm test:planning:db
symbols:
  - name: PlanningAndGovernanceQueryStorePlan
    path: docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md
    dddOwner: PlanningStateReadModel
    cqRails:
      - ImportPlanningStateQueryStore
      - QueryPlanningStateReadModel
      - ExportPlanningStateSnapshot
      - ValidatePlanningStateDrift
      - ApplyPlanningLocalOperation
      - QueryPlanningLocalOperationAudit
      - GeneratePlanningDerivedSurfaces
      - MigratePlanningQueryStoreSchema
      - ManagePlanningQueryStoreRuntime
      - InspectPlanningQueryStoreRuntime
      - ImportGovernanceStateQueryStore
      - QueryGovernanceStateReadModel
      - ExportGovernanceStateSnapshot
      - ValidateGovernanceStateDrift
      - RefreshGovernanceDerivedSurfaces
      - QuerySystemGovernanceGenerationWorkflow
      - ValidateSystemGovernanceGenerationWorkflow
    fowlerSignals:
      - Large planning file operating cost
      - Generated artifact churn
      - Hidden query model inside YAML
      - Hidden query model inside governance shards
      - Mutable external tracker authority risk
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - planning query-store proposal has no browser workflow.
    unitTests:
      - pnpm test:planning:db
      - pnpm docs:feature-mechanization --feature GOV-S3-PLANNING-STATE-QUERY-STORE
      - pnpm docs:feature-mechanization:implementation
  - &planningDbRuntimeSymbol
    name: PlanningDbDockerCompose
    path: infra/planning-db/docker-compose.yml
    dddOwner: PlanningQueryStoreRuntime
    cqRails:
      - ManagePlanningQueryStoreRuntime
      - InspectPlanningQueryStoreRuntime
    fowlerSignals:
      - Large planning file operating cost
      - Generated artifact churn
      - Hidden query model inside YAML
      - Hidden query model inside governance shards
    architectureGuard: pnpm test:planning:db
    cypressCoverage: N/A - planning DB runtime has no browser workflow.
    unitTests:
      - pnpm test:planning:db
  - name: PlanningDbRunWrapper
    path: scripts/planning-db-run.cjs
    dddOwner: PlanningQueryStoreRuntime
    cqRails:
      - ManagePlanningQueryStoreRuntime
      - InspectPlanningQueryStoreRuntime
    fowlerSignals:
      - Large planning file operating cost
      - Generated artifact churn
      - Hidden query model inside YAML
      - Hidden query model inside governance shards
    architectureGuard: pnpm test:planning:db
    cypressCoverage: N/A - planning DB runtime has no browser workflow.
    unitTests:
      - pnpm test:planning:db
  - <<: *planningDbRuntimeSymbol
    name: childProcess
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: fs
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: path
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: Client
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: repoRoot
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: composeFile
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: projectName
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: defaultDataDir
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: defaultPgUrl
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: containerName
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: resetConfirmFlag
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: composeCommandCache
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: run
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: runQuiet
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: buildPgEnv
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: ensureDataDir
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: timestampForFile
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: assertSafeDataDir
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: planResetDataDir
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: buildComposeArgs
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: resolveComposeCommand
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: resetComposeCommandCache
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: runCompose
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: runComposeQuiet
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: sleep
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: waitForPlanningDbReady
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: readLocalOperationBackup
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: writeLocalOperationBackup
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: resetPlanningDb
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: printEnv
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: main
    path: scripts/planning-db-run.cjs
  - <<: *planningDbRuntimeSymbol
    name: test
    path: scripts/planning-db-run.test.cjs
  - <<: *planningDbRuntimeSymbol
    name: assert
    path: scripts/planning-db-run.test.cjs
  - <<: *planningDbRuntimeSymbol
    name: childProcess
    path: scripts/planning-db-run.test.cjs
  - <<: *planningDbRuntimeSymbol
    name: fs
    path: scripts/planning-db-run.test.cjs
  - <<: *planningDbRuntimeSymbol
    name: path
    path: scripts/planning-db-run.test.cjs
  - <<: *planningDbRuntimeSymbol
    name: scriptPath
    path: scripts/planning-db-run.test.cjs
  - <<: *planningDbRuntimeSymbol
    name: planResetDataDir
    path: scripts/planning-db-run.test.cjs
  - <<: *planningDbRuntimeSymbol
    name: resetPlanningDb
    path: scripts/planning-db-run.test.cjs
  - &planningDbContentSymbol
    name: PlanningDbContentMigration
    path: tools/planning-db/migrations/001_content_read_model.sql
    dddOwner: PlanningQueryStoreSchema
    cqRails:
      - MigratePlanningQueryStoreSchema
      - ImportPlanningStateQueryStore
      - QueryPlanningStateReadModel
      - ImportGovernanceStateQueryStore
      - QueryGovernanceStateReadModel
    fowlerSignals:
      - Large planning file operating cost
      - Generated artifact churn
      - Hidden query model inside YAML
      - Hidden query model inside governance shards
    architectureGuard: pnpm test:planning:db
    cypressCoverage: N/A - planning DB content import has no browser workflow.
    unitTests:
      - pnpm test:planning:db
      - pnpm test:planning:db:integration
  - <<: *planningDbContentSymbol
    name: PlanningDbGovernanceContentMigration
    path: tools/planning-db/migrations/002_governance_content_read_model.sql
  - <<: *planningDbContentSymbol
    name: PlanningDbMigrateRunner
    path: scripts/planning-db-migrate.cjs
  - <<: *planningDbContentSymbol
    name: crypto
    path: scripts/planning-db-migrate.cjs
  - <<: *planningDbContentSymbol
    name: fs
    path: scripts/planning-db-migrate.cjs
  - <<: *planningDbContentSymbol
    name: path
    path: scripts/planning-db-migrate.cjs
  - <<: *planningDbContentSymbol
    name: repoRoot
    path: scripts/planning-db-migrate.cjs
  - <<: *planningDbContentSymbol
    name: migrationsDir
    path: scripts/planning-db-migrate.cjs
  - <<: *planningDbContentSymbol
    name: schemaName
    path: scripts/planning-db-migrate.cjs
  - <<: *planningDbContentSymbol
    name: databaseUrl
    path: scripts/planning-db-migrate.cjs
  - <<: *planningDbContentSymbol
    name: sha256
    path: scripts/planning-db-migrate.cjs
  - <<: *planningDbContentSymbol
    name: quoteIdentifier
    path: scripts/planning-db-migrate.cjs
  - <<: *planningDbContentSymbol
    name: readMigrationFiles
    path: scripts/planning-db-migrate.cjs
  - <<: *planningDbContentSymbol
    name: buildMigrationRecords
    path: scripts/planning-db-migrate.cjs
  - <<: *planningDbContentSymbol
    name: detectChecksumMismatch
    path: scripts/planning-db-migrate.cjs
  - <<: *planningDbContentSymbol
    name: ensureMigrationTable
    path: scripts/planning-db-migrate.cjs
  - <<: *planningDbContentSymbol
    name: runMigrations
    path: scripts/planning-db-migrate.cjs
  - <<: *planningDbContentSymbol
    name: main
    path: scripts/planning-db-migrate.cjs
  - <<: *planningDbContentSymbol
    name: test
    path: scripts/planning-db-migrate.test.cjs
  - <<: *planningDbContentSymbol
    name: assert
    path: scripts/planning-db-migrate.test.cjs
  - <<: *planningDbContentSymbol
    name: PlanningDbImportRunner
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: crypto
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: fs
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: path
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: yaml
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: repoRoot
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: laneDirectory
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: governanceFileIndexPath
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: governanceComponentIndexPath
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: governanceComponentFileMapPath
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: governanceFingerprintBaselinePath
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: governanceCoverageReportPath
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: governanceRemediationQueuePath
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: databaseUrl
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: toPosix
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: repoRelative
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: sha256
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: readYamlSource
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: renderYamlSourcePayload
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: buildGeneratedYamlSource
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: cleanJson
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: toJson
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: normalizeText
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: normalizeArray
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: normalizeNumber
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: normalizeDate
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: addGovernanceSource
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: inMemorySourceMetadata
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: buildCoverageRows
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: planningLaneFiles
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: buildPlanningContentSnapshot
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: buildGovernanceGeneratedInputs
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: buildGovernanceFileSnapshot
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: insertPlanningSnapshot
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: insertGovernanceSnapshot
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: beginImportTransaction
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: importContent
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: main
    path: scripts/planning-db-import.cjs
  - <<: *planningDbContentSymbol
    name: test
    path: scripts/planning-db-import.test.cjs
  - <<: *planningDbContentSymbol
    name: assert
    path: scripts/planning-db-import.test.cjs
  - <<: *planningDbContentSymbol
    name: PlanningDbQueryRunner
    path: scripts/planning-db-query.cjs
  - <<: *planningDbContentSymbol
    name: knownQueries
    path: scripts/planning-db-query.cjs
  - <<: *planningDbContentSymbol
    name: databaseUrl
    path: scripts/planning-db-query.cjs
  - <<: *planningDbContentSymbol
    name: resolveQueryName
    path: scripts/planning-db-query.cjs
  - <<: *planningDbContentSymbol
    name: buildSummaryRows
    path: scripts/planning-db-query.cjs
  - <<: *planningDbContentSymbol
    name: buildHashDriftRows
    path: scripts/planning-db-query.cjs
  - <<: *planningDbContentSymbol
    name: readSummary
    path: scripts/planning-db-query.cjs
  - <<: *planningDbContentSymbol
    name: readHashDriftSummary
    path: scripts/planning-db-query.cjs
  - <<: *planningDbContentSymbol
    name: printRows
    path: scripts/planning-db-query.cjs
  - <<: *planningDbContentSymbol
    name: printSummary
    path: scripts/planning-db-query.cjs
  - <<: *planningDbContentSymbol
    name: printHashDriftSummary
    path: scripts/planning-db-query.cjs
  - <<: *planningDbContentSymbol
    name: runQuery
    path: scripts/planning-db-query.cjs
  - &planningDbEffectiveTaskSymbol
    name: PlanningEffectiveTaskReadModelMigration
    path: tools/planning-db/migrations/005_planning_effective_task_read_model.sql
    dddOwner: PlanningStateReadModel
    cqRails:
      - QueryPlanningStateReadModel
      - ExportPlanningStateSnapshot
      - GeneratePlanningDerivedSurfaces
      - MigratePlanningQueryStoreSchema
    fowlerSignals:
      - Large planning file operating cost
      - Hidden query model inside YAML
      - Generated artifact churn
    architectureGuard: pnpm test:planning:db
    cypressCoverage: N/A - planning DB effective task read model has no browser workflow.
    unitTests:
      - pnpm test:planning:db
      - pnpm test:planning:db:integration
      - pnpm planning:db:query tasks
      - pnpm planning:db:query next
      - pnpm planning:db:export:check
  - <<: *planningDbEffectiveTaskSymbol
    name: parseLimit
    path: scripts/planning-db-query.cjs
  - <<: *planningDbEffectiveTaskSymbol
    name: parseArgs
    path: scripts/planning-db-query.cjs
  - <<: *planningDbEffectiveTaskSymbol
    name: normalizeProgress
    path: scripts/planning-db-query.cjs
  - <<: *planningDbEffectiveTaskSymbol
    name: buildTaskRows
    path: scripts/planning-db-query.cjs
  - <<: *planningDbEffectiveTaskSymbol
    name: parseDependencyTokens
    path: scripts/planning-db-query.cjs
  - <<: *planningDbEffectiveTaskSymbol
    name: isTaskUnblocked
    path: scripts/planning-db-query.cjs
  - <<: *planningDbEffectiveTaskSymbol
    name: priorityRank
    path: scripts/planning-db-query.cjs
  - <<: *planningDbEffectiveTaskSymbol
    name: compareTasksForRoute
    path: scripts/planning-db-query.cjs
  - <<: *planningDbEffectiveTaskSymbol
    name: buildNextTaskRows
    path: scripts/planning-db-query.cjs
  - <<: *planningDbEffectiveTaskSymbol
    name: appendFilter
    path: scripts/planning-db-query.cjs
  - <<: *planningDbEffectiveTaskSymbol
    name: effectiveTaskSelect
    path: scripts/planning-db-query.cjs
  - <<: *planningDbEffectiveTaskSymbol
    name: readTaskRows
    path: scripts/planning-db-query.cjs
  - <<: *planningDbEffectiveTaskSymbol
    name: readNextTaskRows
    path: scripts/planning-db-query.cjs
  - <<: *planningDbEffectiveTaskSymbol
    name: printTaskRows
    path: scripts/planning-db-query.cjs
  - <<: *planningDbContentSymbol
    name: main
    path: scripts/planning-db-query.cjs
  - <<: *planningDbContentSymbol
    name: test
    path: scripts/planning-db-query.test.cjs
  - <<: *planningDbContentSymbol
    name: assert
    path: scripts/planning-db-query.test.cjs
  - <<: *planningDbContentSymbol
    name: test
    path: scripts/planning-db-content.integration.test.cjs
  - <<: *planningDbContentSymbol
    name: assert
    path: scripts/planning-db-content.integration.test.cjs
  - <<: *planningDbContentSymbol
    name: dbUrl
    path: scripts/planning-db-content.integration.test.cjs
  - &planningDbLocalOperationSymbol
    name: PlanningDbLocalOperationMigration
    path: tools/planning-db/migrations/003_local_operation_store.sql
    dddOwner: PlanningLocalOperation
    cqRails:
      - ApplyPlanningLocalOperation
      - QueryPlanningLocalOperationAudit
      - MigratePlanningQueryStoreSchema
      - QueryPlanningStateReadModel
    fowlerSignals:
      - Large planning file operating cost
      - Hidden query model inside YAML
      - Generated artifact churn
    architectureGuard: pnpm test:planning:db
    cypressCoverage: N/A - planning DB local operation has no browser workflow.
    unitTests:
      - pnpm test:planning:db
      - pnpm test:planning:db:integration
  - <<: *planningDbLocalOperationSymbol
    name: PlanningDbOperateRunner
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: crypto
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: allowedStatuses
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: databaseUrl
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: toJson
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: normalizeOptionalText
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: requireOption
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: validateTaskStatus
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: parseIntegerOption
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: parseProgress
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: parseFlagOptions
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: operationPayload
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: defaultIdempotencyKey
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: normalizeExistingPayload
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: canonicalJson
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: normalizeRevision
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: assertIdempotentReplayMatches
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: parseTaskCommand
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: parseArgs
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: normalizeState
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: buildInitialState
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: toIso
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: planTaskLocalOperation
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: buildAuditRows
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: readImportedTask
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: readCurrentState
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: readExistingOperation
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: writePlannedOperation
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: applyTaskLocalOperation
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: showTask
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: readAudit
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: printOperationResult
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: main
    path: scripts/planning-db-operate.cjs
  - <<: *planningDbLocalOperationSymbol
    name: test
    path: scripts/planning-db-operate.test.cjs
  - <<: *planningDbLocalOperationSymbol
    name: assert
    path: scripts/planning-db-operate.test.cjs
  - <<: *planningDbLocalOperationSymbol
    name: importedTask
    path: scripts/planning-db-operate.test.cjs
  - <<: *planningDbLocalOperationSymbol
    name: assertIdempotentReplayMatches
    path: scripts/planning-db-operate.test.cjs
  - &planningDbExportSymbol
    name: PlanningDbExportRunner
    path: scripts/planning-db-export.cjs
    dddOwner: PlanningStateExport
    cqRails:
      - ExportPlanningStateSnapshot
      - GeneratePlanningDerivedSurfaces
      - QueryPlanningStateReadModel
    fowlerSignals:
      - Large planning file operating cost
      - Hidden query model inside YAML
      - Generated artifact churn
    architectureGuard: pnpm test:planning:db
    cypressCoverage: N/A - planning DB export has no browser workflow.
    unitTests:
      - pnpm test:planning:db
      - pnpm test:planning:db:integration
      - pnpm planning:db:export:check
  - <<: *planningDbExportSymbol
    name: dependencies
    path: scripts/planning-db-export.cjs
  - <<: *planningDbExportSymbol
    name: exportedArtifactPaths
    path: scripts/planning-db-export.cjs
  - <<: *planningDbExportSymbol
    name: main
    path: scripts/planning-db-export.cjs
  - <<: *planningDbExportSymbol
    name: node
    path: scripts/planning-db-export.test.cjs
  - &planningDbDriftSymbol
    name: PlanningDbDriftCheckRunner
    path: scripts/planning-db-check.cjs
    dddOwner: PlanningStateDriftReport
    cqRails:
      - ValidatePlanningStateDrift
    fowlerSignals:
      - Large planning file operating cost
      - Hidden query model inside YAML
    architectureGuard: pnpm test:planning:db
    cypressCoverage: N/A - planning DB drift check has no browser workflow.
    unitTests:
      - pnpm test:planning:db
      - pnpm planning:db:check
  - <<: *planningDbDriftSymbol
    name: Client
    path: scripts/planning-db-check.cjs
  - <<: *planningDbDriftSymbol
    name: buildPlanningContentSnapshot
    path: scripts/planning-db-check.cjs
  - <<: *planningDbDriftSymbol
    name: schemaName
    path: scripts/planning-db-check.cjs
  - <<: *planningDbDriftSymbol
    name: normalizeComparable
    path: scripts/planning-db-check.cjs
  - <<: *planningDbDriftSymbol
    name: formatValue
    path: scripts/planning-db-check.cjs
  - <<: *planningDbDriftSymbol
    name: buildPlanningExpectedState
    path: scripts/planning-db-check.cjs
  - <<: *planningDbDriftSymbol
    name: sortUnique
    path: scripts/planning-db-check.cjs
  - <<: *planningDbDriftSymbol
    name: indexBy
    path: scripts/planning-db-check.cjs
  - <<: *planningDbDriftSymbol
    name: compareRows
    path: scripts/planning-db-check.cjs
  - <<: *planningDbDriftSymbol
    name: comparePlanningDatabaseState
    path: scripts/planning-db-check.cjs
  - <<: *planningDbDriftSymbol
    name: readPlanningDatabaseState
    path: scripts/planning-db-check.cjs
  - <<: *planningDbDriftSymbol
    name: formatSection
    path: scripts/planning-db-check.cjs
  - <<: *planningDbDriftSymbol
    name: formatDriftReport
    path: scripts/planning-db-check.cjs
  - <<: *planningDbDriftSymbol
    name: checkPlanningDatabase
    path: scripts/planning-db-check.cjs
  - <<: *planningDbDriftSymbol
    name: main
    path: scripts/planning-db-check.cjs
  - <<: *planningDbDriftSymbol
    name: test
    path: scripts/planning-db-check.test.cjs
  - <<: *planningDbDriftSymbol
    name: assert
    path: scripts/planning-db-check.test.cjs
  - &governanceDbDriftSymbol
    name: GovernanceDbDriftCheckRunner
    path: scripts/governance-db-check.cjs
    dddOwner: GovernanceStateDriftReport
    cqRails:
      - ValidateGovernanceStateDrift
    fowlerSignals:
      - Generated artifact churn
      - Hidden query model inside governance shards
    architectureGuard: pnpm test:planning:db
    cypressCoverage: N/A - governance DB drift check has no browser workflow.
    unitTests:
      - pnpm test:planning:db
      - pnpm governance:db:check
  - <<: *governanceDbDriftSymbol
    name: Client
    path: scripts/governance-db-check.cjs
  - <<: *governanceDbDriftSymbol
    name: buildGovernanceFileSnapshot
    path: scripts/governance-db-check.cjs
  - <<: *governanceDbDriftSymbol
    name: schemaName
    path: scripts/governance-db-check.cjs
  - <<: *governanceDbDriftSymbol
    name: buildGovernanceExpectedState
    path: scripts/governance-db-check.cjs
  - <<: *governanceDbDriftSymbol
    name: compareGovernanceDatabaseState
    path: scripts/governance-db-check.cjs
  - <<: *governanceDbDriftSymbol
    name: readGovernanceDatabaseState
    path: scripts/governance-db-check.cjs
  - <<: *governanceDbDriftSymbol
    name: checkGovernanceDatabase
    path: scripts/governance-db-check.cjs
  - <<: *governanceDbDriftSymbol
    name: formatDriftReport
    path: scripts/governance-db-check.cjs
  - <<: *governanceDbDriftSymbol
    name: main
    path: scripts/governance-db-check.cjs
  - <<: *governanceDbDriftSymbol
    name: test
    path: scripts/governance-db-check.test.cjs
  - <<: *governanceDbDriftSymbol
    name: assert
    path: scripts/governance-db-check.test.cjs
  - &governanceRefreshSymbol
    name: GovernanceRefreshRunner
    path: scripts/governance-refresh.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - RefreshGovernanceDerivedSurfaces
      - ImportPlanningStateQueryStore
      - ValidatePlanningStateDrift
      - ValidateGovernanceStateDrift
    fowlerSignals:
      - Generated artifact churn
      - Hidden query model inside governance shards
    architectureGuard: pnpm test:planning:db
    cypressCoverage: N/A - governance refresh tooling has no browser workflow.
    unitTests:
      - pnpm test:governance:refresh
      - pnpm test:planning:db
      - pnpm governance:refresh
  - <<: *governanceRefreshSymbol
    name: childProcess
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: crypto
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: fs
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: path
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: repoRoot
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: defaultMaxPasses
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: buildRefreshStages
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: pnpmCommand
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: runPnpmScript
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: runText
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: sha256
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: readUntrackedFileHashes
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: readWorktreeFingerprint
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: assertPositiveInteger
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: runGovernanceRefresh
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: parseArgs
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: printHelp
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: main
    path: scripts/governance-refresh.cjs
  - <<: *governanceRefreshSymbol
    name: test
    path: scripts/governance-refresh.test.cjs
  - <<: *governanceRefreshSymbol
    name: assert
    path: scripts/governance-refresh.test.cjs
  - <<: *governanceRefreshSymbol
    name: fs
    path: scripts/governance-refresh.test.cjs
  - <<: *governanceRefreshSymbol
    name: path
    path: scripts/governance-refresh.test.cjs
  - <<: *governanceRefreshSymbol
    name: packageJson
    path: scripts/governance-refresh.test.cjs
  - &governanceGeneratedArtifactSymbol
    name: GovernanceGeneratedArtifactPaths
    path: scripts/governance-generated-paths.cjs
    dddOwner: GovernanceGenerationWorkflow
    cqRails:
      - RefreshGovernanceDerivedSurfaces
      - QuerySystemGovernanceGenerationWorkflow
      - ValidateSystemGovernanceGenerationWorkflow
      - ImportGovernanceStateQueryStore
      - QueryGovernanceStateReadModel
      - ValidateGovernanceStateDrift
    fowlerSignals:
      - Generated artifact churn
      - Hidden query model inside governance shards
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - governance generated artifact paths have no browser workflow.
    unitTests:
      - pnpm test:planning:db
      - pnpm governance:refresh
      - pnpm docs:feature-mechanization:implementation
  - <<: *governanceGeneratedArtifactSymbol
    name: path
    path: scripts/governance-generated-paths.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: repoRoot
    path: scripts/governance-generated-paths.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: statusSourceDir
    path: scripts/governance-generated-paths.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: generatedStatusRepoPath
    path: scripts/governance-generated-paths.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: generatedStatusDir
    path: scripts/governance-generated-paths.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: unitManifestPath
    path: scripts/governance-generated-paths.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: toPosix
    path: scripts/governance-generated-paths.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: repoRelative
    path: scripts/governance-generated-paths.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: governanceGeneratedPath
    path: scripts/governance-generated-paths.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: governanceGeneratedRepoPath
    path: scripts/governance-generated-paths.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: test
    path: scripts/governance-generated-paths.test.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: assert
    path: scripts/governance-generated-paths.test.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: path
    path: scripts/governance-generated-paths.test.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: statusDir
    path: scripts/check-governance-file-fingerprint-baseline.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: fileIndexPath
    path: scripts/check-governance-file-fingerprint-baseline.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: baselinePath
    path: scripts/check-governance-file-fingerprint-baseline.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: impactReportPath
    path: scripts/check-governance-file-fingerprint-baseline.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: sourcePath
    path: scripts/check-governance-file-fingerprint-baseline.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: statusDir
    path: scripts/generate-governance-document-unit-map.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: defaultManifestPath
    path: scripts/generate-governance-document-unit-map.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: outputYamlPath
    path: scripts/generate-governance-document-unit-map.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: outputMarkdownPath
    path: scripts/generate-governance-document-unit-map.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: buildCurrentGovernanceIndexes
    path: scripts/check-governance-changed-files.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: statusDir
    path: scripts/generate-governance-file-component-index.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: fileYamlPath
    path: scripts/generate-governance-file-component-index.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: fileMarkdownPath
    path: scripts/generate-governance-file-component-index.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: componentYamlPath
    path: scripts/generate-governance-file-component-index.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: componentMarkdownPath
    path: scripts/generate-governance-file-component-index.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: componentFileMapYamlPath
    path: scripts/generate-governance-file-component-index.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: componentFileMapMarkdownPath
    path: scripts/generate-governance-file-component-index.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: generatedFileYamlRelativePath
    path: scripts/generate-governance-file-component-index.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: generatedShardDirRelativePath
    path: scripts/generate-governance-file-component-index.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: filterExistingRepositoryFiles
    path: scripts/generate-governance-file-component-index.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: generatedComponentShardDirRelativePath
    path: scripts/generate-governance-file-component-index.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: fingerprintBaselineRelativePath
    path: scripts/generate-governance-file-component-index.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: fingerprintImpactReportRelativePath
    path: scripts/generate-governance-file-component-index.cjs
  - <<: *governanceGeneratedArtifactSymbol
    name: componentFileMapPath
    path: scripts/generate-governance-remediation-queue.cjs
  - name: SystemGovernanceGenerationWorkflowComponent
    path: docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md
    dddOwner: GovernanceGenerationWorkflow
    cqRails:
      - RefreshGovernanceDerivedSurfaces
      - QuerySystemGovernanceGenerationWorkflow
      - ValidateSystemGovernanceGenerationWorkflow
      - ImportGovernanceStateQueryStore
      - QueryGovernanceStateReadModel
      - ValidateGovernanceStateDrift
    fowlerSignals:
      - Generated artifact churn
      - Hidden query model inside governance shards
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A - system governance workflow documentation has no browser workflow.
    unitTests:
      - pnpm docs:feature-mechanization --feature GOV-S3-PLANNING-STATE-QUERY-STORE
      - pnpm docs:feature-mechanization:implementation
```
