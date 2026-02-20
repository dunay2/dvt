# Backlog V2 — Epics & User Stories

> Objective: Turn this proposal into an operational base for GitHub milestones/issues and verify alignment with the current state of the repository.

## Recommended GitHub Convention

- 1 milestone per epic (`EPIC-1 Foundation & Core Contracts`, etc.).
- 1 issue per user story (`US-1.1 ...`, `US-1.2 ...`).
- Suggested labels: `epic`, `story`, `contracts`, `engine`, `runner`, `plugin`, `ui`, `security`, `testing`.

## Alignment Status (Summary)

- High partial alignment in engine contracts, versioning, and base security.
- Medium alignment in execution planning and plugin architecture.
- Low alignment in dbt ingestion, isolated dbt runner, UI workspace, and operational multi-tenancy.

## EPIC 1 — Foundation & Core Contracts

### US-1.1 — Define Base Domain Contracts

As an architect, I want stable domain contracts to avoid churn.

**Deliverables**

- JSON Schema: `LogicalGraph (GCM)`, `CanvasState`, `ProvenanceEvent`
- Shared Zod ↔ JSON Schema package
- Versioning (`schemaVersion`)

**Current Alignment:** 🟡 Partial

### US-1.2 — dbt Artifacts Ingestion

As a system, I want to convert dbt artifacts into a stable semantic graph.

**Includes**

- Parser `manifest.json` → GCM
- Parser `catalog.json` → metadata
- Parser `run_results.json` → run node stats
- Golden tests with `jaffle_shop`

**Current Alignment:** 🔴 Low

### US-1.3 — Graph Snapshot (CQRS)

As a backend, I want snapshots for fast reads.

**Includes**

- `graph_snapshot` table
- `node_index` table (search)
- `impact_index` table
- Incremental rebuild

**Current Alignment:** 🟡 Partial

## EPIC 2 — Execution Planning (no execution)

### US-2.1 — ExecutionPlan V2 Contract

As a user, I want to see exactly what will be executed and why.

**Includes**

- JSON Schema `ExecutionPlan`
- Actions `RUN` / `SKIP` / `PARTIAL`
- Mandatory explainability

**Current Alignment:** 🟡 Partial

### US-2.2 — Selection Translator

As a system, I must translate the plan to real dbt.

**Includes**

- `ExecutionPlan` → dbt selectors
- Support for `state:modified`
- `--defer`, `--state` if applicable

**Current Alignment:** 🔴 Low

### US-2.3 — Policy Engine Plugin-based

As a platform, I want extensible and deterministic policies.

**Includes**

- Interface `Policy.evaluate(context)`
- Priorities/weights
- Conflict resolution
- Plugin registration

**Current Alignment:** 🟡 Partial

## EPIC 3 — Runner & Execution

### US-3.1 — Isolated dbt Core Runner

**Current Alignment:** 🔴 Low

### US-3.2 — QUERY_TAG + Snowflake Correlation

**Current Alignment:** 🔴 Low

### US-3.3 — dbt Cloud API v2 Integration

**Current Alignment:** 🔴 Low

## EPIC 4 — Cost & Guardrails (plugin)

### US-4.1 — Cost Provider Interface

**Current Alignment:** 🔴 Low

### US-4.2 — Cost Guardrails Plugin

**Current Alignment:** 🔴 Low

## EPIC 5 — E2E Observability

### US-5.1 — OpenTelemetry Tracing

**Current Alignment:** 🟡 Partial

### US-5.2 — Logs Streaming + Redaction

**Current Alignment:** 🟡 Partial

## EPIC 6 — Plugin Runtime (critical)

### US-6.1 — Plugin Manifest + apiVersion

**Current Alignment:** 🟡 Partial

### US-6.2 — Backend Plugin Execution

**Current Alignment:** 🟡 Partial

## EPIC 7 — UI Shell & Graph Workspace

### US-7.1 — Graph Read-only Workspace

**Current Alignment:** 🔴 Low

### US-7.2 — Execution Plan UI

**Current Alignment:** 🔴 Low

## EPIC 8 — Security & Multi-Tenant

### US-8.1 — Tenant/org/project/env Model

**Current Alignment:** 🟡 Partial

### US-8.2 — RBAC with Casbin

**Current Alignment:** 🟡 Partial

### US-8.3 — Secrets + Immutable Audit

**Current Alignment:** 🟡 Partial

## EPIC 9 — Controlled Roundtrip

### US-9.1 — Drafts + Optimistic Locking

**Current Alignment:** 🔴 Low

### US-9.2 — Managed Assets (Level 1)

**Current Alignment:** 🔴 Low

### US-9.3 — Explicit Ownership (Level 2)

**Current Alignment:** 🔴 Low

## EPIC 10 — Testing & Quality Gates

### US-10.1 — Golden dbt Tests

**Current Alignment:** 🟡 Partial

### US-10.2 — Roundtrip Tests

**Current Alignment:** 🔴 Low

### US-10.3 — Performance Tests (50k nodes)

**Current Alignment:** 🔴 Low

## Recommended Implementation Order

1. Epic 1
2. Epic 2
3. Epics 6 and 3 in controlled parallel
4. Epics 4, 5, 8
5. Epics 7 and 9
6. Epic 10 as transversal quality gate

## Definition of Ready (DoR) per Story

- Contract/versioning identified.
- Verifiable acceptance criteria.
- Declared security/tenancy risks.
- Minimum observability metrics defined.

## Definition of Done (DoD) per Story

- Contract and docs updated.
- Associated automated tests.
- Evidence of architecture ↔ implementation alignment.
- Issue linked to milestone/epic and updated status.
