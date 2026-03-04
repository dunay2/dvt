# ADR-0020 — OpenLineage as Canonical Lineage Output Format

Status: Accepted
Date: 2026-03-02

## Context

DVT+ executes dbt plans via Temporal/Conductor and emits domain events (`RunStarted`, `StepCompleted`, etc.) to an internal append-only state store. Post-execution, lineage data (what ran, what produced what, with what cost) must be surfaced to consumers: engineers, data stewards, cost dashboards, impact analysis tools.

Two options were evaluated:

1. **Build a proprietary lineage model** inside DVT+ (GraphSnapshot, CatalogSnapshot, bundle/artifact pattern).
2. **Adopt OpenLineage as the canonical output format** and emit OL events from the engine's outbox, using Marquez or Snowflake External Lineage as the read-model.

A document was reviewed (see `plans/marquezopen.txt`) that argued OpenLineage + Marquez should _replace_ the DVT+ execution core. That position was rejected — see Consequences. What was accepted: OL as the _output format_ for lineage, not as a replacement for the execution layer.

### Why not build a proprietary lineage model

- OpenLineage is the LF AI & Data Foundation standard, adopted by Snowflake (External Lineage, GA 2026-01), Databricks, dbt Labs, Airflow, Spark. Inventing a competing model would produce an inferior, non-interoperable artifact.
- Marquez is a functioning, tested OL read-model with UI and query API. Building an equivalent would consume engineering capacity that belongs on the execution layer.
- OpenLineage custom facets allow DVT+-specific metadata (`dvt_selector`, `dvt_cost`, `dvt_dbt_details`, `dvt_deps`) without breaking the standard.

### Why the "replace the core with Marquez" position is rejected

Marquez is a lineage catalog and UI. It does not:

- Execute workflows (no Temporal/Conductor integration).
- Manage tenant isolation at storage level.
- Provide a transactional outbox, event sourcing, or crash recovery.
- Enforce `PlanRef.sha256` integrity.
- Support retry policies, step-level backoff, or approval gates.

Critically: **Marquez is a derived read-model, not a source of truth for execution planning.** Using the Marquez graph as input to the DVT+ Planner (as marquezopen.txt proposed in Section 7) would break ADR-0012 (plan integrity). The Planner MUST continue to derive `ExecutionPlan` from immutable, content-addressed artifacts (`PlanRef` with `sha256`), not from a mutable catalog.

## Decision

1. **DVT+ adopts OpenLineage (OL) as the canonical format for lineage output.**
   - Lineage events are emitted _after_ execution events, derived from `RunEventPersisted` + plan context.
   - The OL emission path goes through the existing outbox (`IEventBus`) via a dedicated `OpenLineageEventBus` implementation.

2. **Marquez is the default read-model for lineage visualization** (optional, configurable at deploy time).
   - Snowflake External Lineage is the enterprise alternative endpoint.
   - DVT+ core has no hard dependency on either; they are `ILineageBackend` targets.

3. **The Planner is unchanged.** It continues to read `manifest.json` and produce `ExecutionPlan` → `PlanRef`. It does NOT read from Marquez or any OL store. Marquez is downstream, not upstream.

4. **Four DVT+-specific custom facets are standardized** (see ADR-0021 for full spec):
   - `dvt_selector` (Run facet) — dbt selector used, full/partial scope
   - `dvt_deps` (Job facet) — `package-lock` SHA-256, resolved package versions
   - `dvt_dbt_details` (Job facet) — `unique_id`, materialization, access level, contract enforcement, `compiled_code_ref` (reference only — not raw SQL if sensitive)
   - `dvt_cost` (Run facet) — Snowflake credits used, bytes scanned, execution time (populated post-hoc, not at emission time)

5. **Secrets MUST NOT appear in any OL facet.** Existing invariant INV-SECRETS-01 applies to OL events. `compiled_code` MUST be stored as a reference (`compiled_code_ref: s3://...`) if it may contain secrets or sensitive logic. Raw SQL MUST NOT be embedded in the facet unless classified non-sensitive.

## Consequences

### Positive

- DVT+ lineage is interoperable with Snowflake, Databricks, and any OL-compatible tool.
- No proprietary lineage schema to maintain.
- Marquez provides a free, tested UI for lineage exploration. DVT+ team does not build a lineage UI.
- Custom facets extend the standard without forking it.
- Snowflake External Lineage gives enterprise customers native integration at zero additional cost.

### Negative / Trade-offs

- The `OpenLineageEventBus` requires access to plan context (to resolve `inputs`/`outputs` datasets from `ExecutionPlan.steps`). This means the OL translator is stateful — it must resolve step configurations at translation time, not at event emission time. See ADR-0021 for the resolution.
- `dvt_cost` facet is populated post-hoc (Snowflake `QUERY_HISTORY` has ~45-minute lag). Cost data in OL events is eventually consistent, not real-time. UI must communicate this.
- Marquez does not provide fine-grained RBAC or audit of reads. Multi-tenant deployments MUST deploy a proxy in front of Marquez API/UI that enforces tenant scope. DVT+ does not delegate tenant isolation to Marquez.
- OL event volume is proportional to step count. A 1000-node dbt project produces 2000+ OL events per run. The `OpenLineageEventBus` must handle this volume without blocking the engine's outbox worker.

### Invariants

- **INV-OL-001**: OL events MUST NOT contain secret values (passwords, API keys, tokens). Only secret IDs or references.
- **INV-OL-002**: OL events for a given DVT+ `runId` MUST use the same `runId` as the OL `run.runId`, ensuring correlation.
- **INV-OL-003**: The Planner MUST NOT read from any OL store (Marquez, Snowflake External Lineage, or equivalent) as input to plan generation. OL is output-only from DVT+'s perspective.
- **INV-OL-004**: `compiled_code_ref` in `dvt_dbt_details` MUST point to an immutable, tenant-scoped URI. It MUST NOT be a mutable reference (no `.../latest` paths — consistent with ADR-0017 immutability requirement for PlanRef URIs).

## Related

- ADR-0012 (Plan integrity — adapter owns fetch + SHA-256; planner does not read from Marquez)
- ADR-0017 (ExecutionPlan schema versioning — immutability of plan URIs)
- ADR-0004 (Event sourcing strategy — outbox as delivery mechanism)
- ADR-0009 (Outbox ordering — INV-OUTBOX-001/002 apply to OL event delivery)
- ADR-0021 (OpenLineage translation contract — RunEvent → OL mapping)
