# ADR-0021 — OpenLineage Translation Contract

Status: Accepted
Date: 2026-03-02

## Context

ADR-0020 establishes that DVT+ adopts OpenLineage (OL) as canonical lineage output format and emits OL events via the outbox `IEventBus`. This ADR defines the normative mapping between DVT+ domain events (`RunEventPersisted`) and OL events, resolves the plan-context dependency required for dataset resolution, and specifies the custom facets.

### The translation problem

DVT+ domain events carry lifecycle state (`StepCompleted`, `RunFailed`, etc.) but do not carry dataset semantics. An OL event requires `inputs` and `outputs` (datasets) to represent lineage. These come from `ExecutionPlan.steps[].stepTypeConfig` — the step's dbt node configuration (source tables, output relation name, materialization).

The `OutboxWorker` delivers `RunEventPersisted` to `IEventBus.publish()`. The `OpenLineageEventBus` implementation of `IEventBus` must therefore have access to a plan context resolver to look up step dataset information at translation time.

```
OutboxWorker
    ↓
IEventBus.publish(events: RunEventPersisted[])
    ↓ (implementation)
OpenLineageEventBus
    ├── translates: RunEventPersisted → OLEvent
    ├── resolves: stepId → {inputs, outputs} via IPlanContextResolver
    └── emits: HTTP POST to configured ILineageBackend (Marquez / Snowflake / noop)
```

## Decision

### 1) Component: `OpenLineageEventBus`

```typescript
interface IPlanContextResolver {
  resolveStep(tenantId: string, runId: string, stepId: string): Promise<StepLineageContext | null>;
}

interface StepLineageContext {
  inputs: OLDataset[]; // source relations / ref() dependencies
  outputs: OLDataset[]; // output relation_name
  dbtDetails: {
    uniqueId: string;
    materialization: string;
    access?: string;
    contractEnforced?: boolean;
    modelVersion?: string;
    compiledCodeRef?: string; // URI to blob store — NOT raw SQL
  };
}

interface ILineageBackend {
  emit(events: OLEvent[]): Promise<void>;
}
```

`OpenLineageEventBus` implements `IEventBus`. It is registered alongside (not instead of) any internal event bus. The engine emits to both: domain events go to the state store; OL events go to the lineage backend.

### 2) Normative DVT+ RunEvent → OL event mapping

| DVT+ Event           | OL `eventType` | OL `job`                                           | OL `run`            | Notes                                                            |
| -------------------- | -------------- | -------------------------------------------------- | ------------------- | ---------------------------------------------------------------- |
| `RunQueued`          | —              | —                                                  | —                   | Not emitted to OL. Internal queuing has no OL equivalent.        |
| `RunStarted`         | `START`        | `{namespace: tenantNamespace, name: planId}`       | `{runId: dvtRunId}` | Represents the dbt invocation as a whole.                        |
| `StepStarted`        | `START`        | `{namespace: tenantNamespace, name: stepUniqueId}` | `{runId: dvtRunId}` | One OL job per dbt node. `runId` shared with parent run.         |
| `StepCompleted`      | `COMPLETE`     | same as StepStarted                                | same                | Include `inputs`, `outputs`, facets.                             |
| `StepFailed`         | `FAIL`         | same as StepStarted                                | same                | Include `errorMessage` in run facet.                             |
| `StepSkipped`        | `OTHER`        | same as StepStarted                                | same                | OL has no native SKIP; use `OTHER` with `dvt_skip_reason` facet. |
| `RunCompleted`       | `COMPLETE`     | run-level job                                      | same                | Emit after all step events.                                      |
| `RunFailed`          | `FAIL`         | run-level job                                      | same                |                                                                  |
| `RunCancelled`       | `ABORT`        | run-level job                                      | same                |                                                                  |
| `RunPaused`          | —              | —                                                  | —                   | Not emitted. No OL equivalent for paused-awaiting-approval.      |
| `RunResumed`         | —              | —                                                  | —                   | Not emitted.                                                     |
| `RunCancelRequested` | —              | —                                                  | —                   | Not emitted. Engine intent only; no OL equivalent.               |

**Invariant**: `OLEvent.run.runId` MUST equal `RunEventPersisted.runId` (INV-OL-002).

### 3) Namespace convention

OL `job.namespace` MUST be structured as:

```
dvt://{tenantId}/{environmentId}
```

Example: `dvt://acme-corp/production`

This provides tenant isolation at the OL namespace level. Marquez isolates namespaces via its API; a proxy MUST enforce that tenant A cannot query namespace of tenant B.

For branch/PR environments:

```
dvt://{tenantId}/pr-{prNumber}
```

Branch namespaces are isolated from production namespaces automatically.

### 4) Custom facets (normative)

All custom facets MUST include `_producer` and `_schemaURL` per OL spec. Schema files MUST be versioned and published at a stable URI.

#### `dvt_selector` (Run facet)

Emitted on `RunStarted`.

```json
{
  "_producer": "https://dvt.example.com/openlineage/producer/v1",
  "_schemaURL": "https://dvt.example.com/openlineage/facets/dvt_selector/v1.json",
  "selector": "--select tag:nightly",
  "exclude": null,
  "scope": "partial"
}
```

`scope`: `"full"` (no selector) | `"partial"` (selector applied).

#### `dvt_deps` (Job facet)

Emitted on `StepStarted` / `RunStarted` for the run-level job.

```json
{
  "_producer": "...",
  "_schemaURL": "...",
  "packageLockSha256": "sha256:abc123...",
  "packages": {
    "dbt_utils": "1.2.0",
    "dbt_date": "0.9.0"
  }
}
```

Enables Marquez to create a new job version when packages change even if model SQL is unchanged.

#### `dvt_dbt_details` (Job facet)

Emitted on `StepStarted`.

```json
{
  "_producer": "...",
  "_schemaURL": "...",
  "uniqueId": "model.my_project.dim_customers",
  "materialization": "table",
  "access": "protected",
  "contractEnforced": true,
  "modelVersion": "v1",
  "compiledCodeRef": "s3://dvt-artifacts/tenantId/plans/sha256abc/steps/dim_customers.sql"
}
```

`compiledCodeRef` MUST be a URI to an immutable blob store. Raw SQL MUST NOT be embedded if the model may contain secrets or PII-adjacent logic. The URI MUST be immutable (content-addressed by SHA-256 of the compiled SQL — consistent with ADR-0017).

#### `dvt_cost` (Run facet)

Emitted in a **separate follow-up OL event** after Snowflake `QUERY_HISTORY` data is available (~45 minutes post-execution). This is an `OTHER` event type on the step-level job, not a second `COMPLETE`.

```json
{
  "_producer": "...",
  "_schemaURL": "...",
  "creditsUsed": 0.0023,
  "bytesScanned": 10485760,
  "executionTimeMs": 3412,
  "warehouseName": "TRANSFORM_WH",
  "snowflakeQueryId": "01abc123-...",
  "attributedAt": "2026-03-02T14:30:00Z",
  "dataLagMs": 2700000
}
```

`dataLagMs` is mandatory — it communicates to UI consumers that this data reflects Snowflake telemetry with a lag, not real-time cost. UI MUST display cost as "as of {attributedAt}" not as live data.

### 5) `StepSkipped` handling

OL has no `SKIP` event type. DVT+ MUST emit `OTHER` with a `dvt_skip_reason` run facet:

```json
{
  "_producer": "...",
  "_schemaURL": "...",
  "reason": "UPSTREAM_FAILED" | "SELECTOR_EXCLUDED" | "APPROVAL_DENIED"
}
```

UI consumers that understand `dvt_skip_reason` can render the skip appropriately. OL consumers that do not understand it see an `OTHER` event, which is semantically correct.

### 6) `IPlanContextResolver` implementation

Phase 1: `IPlanContextResolver` resolves step dataset context from `IRunStateStore` (the `RunMetadata` record contains `planId` + `planVersion` which identifies the plan). The resolver fetches the plan from the immutable plan store (same URI as `PlanRef.uri`) and parses it.

This means the `OpenLineageEventBus` requires:

- `IRunStateStore` (to resolve `runId → planRef`)
- Plan fetch capability (read-only, via `@dvt/plan-verifier` or equivalent)
- `IPlanContextResolver` as injected dependency

The plan fetch in the OL emission path MUST be read-only and MUST NOT trigger any state mutation or bootstrap operation.

### 7) Delivery guarantees

The `OpenLineageEventBus` operates via the outbox. OL events inherit the outbox's at-least-once, per-runId ordered delivery guarantees (ADR-0009: INV-OUTBOX-001/002). The `ILineageBackend.emit()` MUST be idempotent — Marquez natively handles duplicate OL events by runId.

If the lineage backend is unavailable, the outbox DLQ policy (ADR-0009 §4) applies. OL delivery failure MUST NOT block domain event delivery for the same run — the outbox MUST be capable of routing domain events and OL events to separate buses with independent failure domains, or OL events MUST be in a separate outbox table.

**Decision**: OL events go to a **separate outbox table** (`outbox_lineage`) with independent worker. This ensures Marquez unavailability does not block domain state store delivery. The `appendAndEnqueueTx` for domain events is unaffected.

## Consequences

### Positive

- Normative mapping prevents ad-hoc translation decisions by individual implementors.
- Branch isolation via namespace convention is built into the contract.
- `dvt_cost` as post-hoc event correctly models Snowflake's latency reality — no false "real-time cost" guarantee.
- Separate outbox table for OL events eliminates blast radius from Marquez failures.

### Negative / Trade-offs

- `IPlanContextResolver` adds a dependency on the plan store to the OL emission path. Plan fetches must be cached (keyed by `PlanRef.sha256`) to avoid repeated S3/GCS reads for multi-step runs.
- A 1000-node dbt run produces ~2000 OL events in the `outbox_lineage` table. Storage and worker throughput for this table must be sized accordingly.
- `dvt_cost` follow-up events require a separate scheduled job (cost attributor) that runs post-execution, queries Snowflake, and emits additional OL events. This job is outside the engine boundary — it reads from `IRunStateStore` and writes to `ILineageBackend` directly, bypassing the outbox. This is acceptable because cost events are best-effort, not domain-critical.

### Invariants

- **INV-OL-001** (from ADR-0020): No secrets in OL facets.
- **INV-OL-002** (from ADR-0020): `OLEvent.run.runId` == DVT+ `runId`.
- **INV-OL-003** (from ADR-0020): Planner does not read from OL stores.
- **INV-OL-004** (from ADR-0020): `compiledCodeRef` URIs are immutable.
- **INV-OL-005** (this ADR): OL events MUST use the namespace convention `dvt://{tenantId}/{environmentId}`. Cross-namespace queries by tenant are forbidden at the proxy layer.
- **INV-OL-006** (this ADR): OL events are in a separate outbox table (`outbox_lineage`). Failure of OL delivery MUST NOT affect `run_events` / domain outbox delivery.
- **INV-OL-007** (this ADR): `dvt_cost` events MUST include `dataLagMs`. Cost data MUST NOT be presented as real-time.

## Related

- ADR-0020 (OpenLineage as canonical lineage output — parent decision)
- ADR-0004 (Event sourcing strategy — outbox)
- ADR-0009 (Outbox ordering — invariants apply to `outbox_lineage` table)
- ADR-0012 (Plan integrity — `IPlanContextResolver` MUST NOT bypass SHA-256 verification)
- ADR-0017 (URI immutability — applies to `compiledCodeRef`)
