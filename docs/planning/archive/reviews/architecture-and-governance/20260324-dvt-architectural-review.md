---
title: 20260324 Dvt Architectural Review
status: Historical
owner: docs
last_reviewed: 2026-03-24
planning_type: review
---

# 20260324 Dvt Architectural Review

DVT+ — Principal Architect Review
Codebase commit basis: G1–G10 closed, Phase 2 slices S01–S11 partially open. Review is against actual source — not documentation claims.

1. Conceptual Soundness
   What Is Solid
   The core tri-partite separation holds at the contract level. The Planner produces an immutable, content-addressable ExecutionPlan (SHA-256 over JCS). The engine dispatches via IProviderAdapter and persists via IRunStateStore. State is the append-only event log — IRunStateStore.appendAndEnqueueTx has no UPDATE/DELETE path. The claim "the planner does not persist state" is structurally enforced: Planner.ts has no storage dependency.

Event sourcing discipline is real. run_events(idempotency_key UNIQUE) at the database level is the correct enforcement point. AppendResult tracking { appended, deduped } makes idempotency explicit and observable. rebuildSnapshot() replaying from event log means snapshot loss is never a data loss event.

Tenant isolation at adapter boundary is enforced. All IRunStateStore operations take tenantId. The discriminated EngineRunRef embeds tenantId in the provider ref. This is structurally sound, not just convention.

Deterministic plan identity is correctly implemented. JCS (RFC 8785) + SHA-256 gives a stable planId independent of serializer quirks. The invariant sha256(JCS(planCore)) === planId is verifiable by any caller.

What Is Fragile
IRunStateStore violates SRP — actively. The interface currently owns: event persistence, outbox management, snapshot materialization, run metadata, archive management, backpressure snapshots, and purge state tracking — seven distinct responsibilities behind one interface. S02 (split) is open but unblocked. Every test against IRunStateStore is testing a god object. This is the most immediate structural debt in the system. The "hexagonal port hardening" ADR-0039 documents intent to fix it without delivering the fix.

compiledCodeRef transport is a type-system leak. ADR-0032 places the compiled code reference inside stepTypeConfig: Record<string, unknown> — an opaque blob. At execution time, stepActivities.ts must cast this map to extract the ref. If the planner version and the adapter version disagree on the internal shape (e.g., planner emits compiledCodeRef, adapter reads compiled_code_ref), this fails silently — no type error, no schema validation at the transport boundary. The ADR acknowledges this as tech debt but defers promotion to a typed field indefinitely. This is a correctness gap masquerading as a pragmatic decision.

payload: Record<string, unknown> with no payloadVersion is a time bomb. S05 is open. Every EventInput carries an unversioned, unschema'd payload. The lineage worker, projector, and outbox worker all consume these payloads. A change to StepStarted.payload shape is invisible at the type level to any consumer. This is standard event sourcing failure mode — skip it at your own risk. The fact that it's acknowledged in S05 does not reduce the severity; it just means the team sees it coming.

SUPPORTED_EXECUTION_PLAN_VERSIONS = ['2.3'] is a single-element array. The version registry has a governance process (ADR-0036), but the runtime matrix enforces exactly one version. During a rolling deploy where the planner emits 2.4 before all engines are updated, engines running 2.3 will reject plans. The version compatibility matrix exists in documentation but is not enforced programmatically as a range check.

Multi-graph-source ambiguity is not enforced at the type level. ExecutionPlan.v2.ts defines four graph source fields (manifestRef, graphSource, manifest, nodes). One-active-source validation is in PlannerFacade.ts — the application layer. Callers constructing ExecutionPlan directly (e.g., in tests, in downstream integrations) can violate this invariant without a compile-time error. A discriminated union at the type level would eliminate this class of bug entirely.

ResolvedPolicies is Temporal-shaped despite "runtime-neutral" naming. The fields stepTimeoutMs, retries.maxAttempts, retries.backoffMs, concurrency.maxInFlight map 1:1 to Temporal's ActivityOptions. This is not an abstraction — it is Temporal's API with renamed fields. Adding a second production provider will expose this impedance mismatch. The AdapterPolicyMapper interface is the correct pattern; the ResolvedPolicies shape should be the minimal canonical vocabulary, not a Temporal alias.

What Is Missing
payloadVersion on EventInput — critical, S05 open.

Rollback / compensating transaction model — nowhere defined. If 400 of 1000 steps execute and the run fails, Snowflake tables are partially populated. There is no documented cleanup path.

Read-your-writes guarantee definition — a startRun() call emits events, but getRunStatus() reads from a snapshot that may lag. The staleness window is undefined in any contract or ADR.

Retry ownership specification was open in the 2026-03-24 baseline and is now
closed by `ADR-0040`. At review time the unresolved question was: does DVT
count retries, or does Temporal count retries? `engineAttemptId` vs
`logicalAttemptId` suggested both were tracked, but the authoritative counter
for "has this step exhausted its retry budget" was not specified.

1. Architectural Risk Map
   Risk Severity Likelihood Why Mitigation
   IRunStateStore god-interface (S02) High Certain — already exists 7 responsibilities behind one interface. Mock in tests tests everything or nothing. Any schema change touches all consumers. Execute S02 now — it is unblocked.
   Unversioned event payloads (S05) High High payload: Record<string,unknown> — shape changes are invisible to lineage worker, projector, outbox worker. Silent deserialization drift across deployments. S05 payloadVersion is the minimum. AJV schema per eventType is the correct target.
   compiledCodeRef in opaque stepTypeConfig High High Silent cast at activity boundary. Version skew between planner and adapter produces no error — just missing lineage or wrong SQL. Promote to typed field in ExecutionStepV2. Tech debt acknowledged but unscheduled.
   Snapshot projector falling behind at scale High High at 1000 concurrent runs ProjectorWorkerRuntime polls listStaleSnapshotRuns() — a full-table join under load. No push from event emission to projector. Snapshots lag = UI shows wrong state, admission control reads stale data. Event-driven invalidation: write to a snapshot-work-queue on event append.
   Single PostgreSQL instance as event log High Medium No read replica, no partitioning by tenant or time. At 1000 tenants × millions of events, run_events becomes a single-table scan target. listPending() for outbox polls the full table. Partition run_events by (tenant_id, run_id) or time range. Add read replica for query path.
   Archive restore absent (G5-PR2) High Medium Archive export is implemented. Restore model is not. If a compliance request requires event replay from archive, no path exists. The archive feature is operationally incomplete. G5-PR2 is the unlock.
   Two-phase startRun consistency window Medium Medium Between adapter.startRun() and bootstrapRunTx() crash → orphaned Temporal workflow. RunMaintenanceService reconciliation is periodic — window is minutes. Reduce reconciliation interval. Add health endpoint that reports orphan count.
   Plan version compatibility during rolling deploys Medium High SUPPORTED_EXECUTION_PLAN_VERSIONS = ['2.3']. Planner emitting 2.4 + old engine on 2.3 = 100% plan rejection. No multi-version window. Implement version range support. During deploy: support [N-1, N] concurrently.
   Retry ownership split (historical S09 gap, now closed by ADR-0040) Medium High engineAttemptId vs logicalAttemptId — two counters. If Temporal retries silently and DVT emits a new StepStarted, event count diverges from Temporal's retry count. Which counter is authoritative for "exhausted budget"? This review recorded the question before ADR-0040 defined the authority boundary.
   DbtStepTypeConfig in @dvt/contracts (shared kernel) Medium Certain dbt-specific schema in the shared kernel means every package that imports @dvt/contracts pulls in dbt knowledge. Violates bounded context rule. Move to @dvt/planner or a dedicated @dvt/contracts-dbt package.
   Lineage dead-letter unbounded accumulation Medium High No automated DLQ replay. On sustained ILineageSink failure, lineage_dead_letter grows without bound. No size alert defined. Add DLQ size metric + alert. Implement automated replay with circuit breaker.
   Outbox claim timeout = double-delivery window Medium Medium If outbox worker crashes mid-batch, shard must wait outboxClaimTimeoutMs before another worker claims. During that window, downstream consumers see no events. Double delivery on recovery if consumers aren't idempotent. Document consumer idempotency requirement as a hard contract, not a guideline.
   Conductor adapter as ghost type Low Low EngineRunRef supports conductor provider. No implementation exists. Type complexity without functionality. Remove from union until implementation exists. Dead types mislead.
   CustomPolicyNamespaceRegistry with no consumers Low Low Sophisticated namespace validation with denied-field scanning, size limits, Zod schemas — for zero documented use cases. Do not add more complexity. Remove or mark explicitly experimental.
1. Engine Abstraction Critique
   Is IWorkflowEngine Minimal and Correct?
   The interface surface (startRun, signal, getRunStatus, cancelRun) is the correct minimal API for an orchestration engine façade. The run-driven model (engine calls adapter, adapter does not call back) is correctly enforced by the absence of callback registration in IProviderAdapter.

What is wrong: IWorkflowEngine is not a clean single interface — it's re-exported across multiple paths, with the actual implementation spread across WorkflowEngine.ts, StartRunUseCase, and RunMaintenanceService. The boundary between "engine" and "application use case" is blurred. StartRunUseCase in apps/api orchestrates intent creation, adapter invocation, and state bootstrap — this is engine logic, not HTTP handler logic. It belongs in the engine package.

Is Temporal-First Wise?
Yes, as long as it stays explicit. The mistake would be treating the abstractions as provider-neutral when they are not. TemporalPolicyMapper is correct precisely because it is named Temporal-specific. The abstractions fail when Temporal semantics bleed into the neutral layer — e.g., RunSubstatus.CONTINUE_AS_NEW is a Temporal implementation detail exposed as a canonical state. CONTINUE_AS_NEW has no meaning in Conductor or any other provider. It belongs in the adapter layer, not the shared event model.

Is the Event Model Robust?
No, on one critical dimension. The event type catalog (RunEvents.v2.ts) is typed at the EventType level, but payload is Record<string, unknown> at the EventInput level. The contract between event emitter and event consumer is a string-keyed map with no schema. For a system claiming event sourcing as its persistence model, this is structurally incomplete.

The idempotency model (UNIQUE(idempotency_key)) is correctly implemented. AppendResult.deduped tracking is correct.

engineAttemptId vs logicalAttemptId are semantically underspecified. From the code, both are integers on EventInput. The distinction between engine-level retries (Temporal retrying an activity) and logical retries (DVT deciding to retry a step) is not formalized. In a failure investigation, an engineer cannot determine from an event whether attempt 3 is Temporal's 3rd retry or DVT's 3rd logical attempt.

Where Determinism Assumptions Could Fail
dbt manifest node ordering is not guaranteed stable across invocations. If manifest.nodes is a JSON object, key iteration order in Node.js is insertion-order, which may vary across dbt versions. PlanAssembler uses JCS (RFC 8785) which sorts keys — this mitigates JSON object instability. But if the input array of nodes has non-deterministic ordering before JCS, two logically identical plans will produce different planId values.

compiledCodeRef.sha256 determinism depends on dbt SQL generation stability. If dbt templates include run_started_at, invocation_id, or other non-deterministic values in compiled SQL, two executions of the same model produce different SHA-256 values. The content-addressability claim fails for non-deterministic dbt templates. This is not handled.

shouldAbort() during plan build is checked at application layer. A Planner abort mid-DAG-construction could theoretically yield a partial plan if the pipeline doesn't abort early enough. The pipeline delegates to GraphBuilder → NodeSelector → PlanAssembler sequentially — if abort fires between GraphBuilder and PlanAssembler, the returned error is correct. Verified this is safe.

Temporal's determinism requirements are invisible in IProviderAdapter. The workflow definition in RunPlanWorkflow.ts must obey Temporal's determinism rules (no Date.now(), no Math.random(), no non-deterministic I/O in workflow code). An implementer of a new activity who doesn't know this will break the workflow replay guarantee. This constraint is not surfaced in any contract or interface annotation.

1. Execution Planning Layer Analysis
   DAG Analyzer
   GraphBuilder + TopoSort is correctly implemented for the stated problem. Cycle detection is present. Stability in toposort is important — without it, the same logical graph produces different planId values across invocations, breaking plan caching.

Missing: Fan-in node handling under scale. A dbt project where a single dim_date model is depended on by 800 downstream models creates a node with 800 outgoing edges. The graph builder creates this correctly, but the NodeSelector upstream/downstream resolution — which walks the graph — could produce O(V²) traversal for highly connected graphs.

Partial Execution Guarantees
There are none — by design. A failed run at step 400/1000 cannot be resumed from step 401. The retry model operates at the step level (Temporal activity retry) or at the full run level (run retry signal). Mid-run partial re-planning is not supported. This is a reasonable initial constraint, but it needs explicit documentation as a known limitation — because for a 1000-node dbt DAG, a network partition failure at step 999 forces a full re-run.

Retry/Backoff Policy Ownership
At the time of this review, S09 was open and this mattered. It is now closed by
ADR-0040. The historical ambiguity was:

RetryPolicy is declared in PlannerPolicyVocabulary.v2.ts (at-most-once, at-most-N)
TemporalPolicyMapper.mapRetry() converts to Temporal's ActivityOptions.retry
Temporal internally tracks retry count per activity execution
DVT emits StepStarted events — but does it emit one per Temporal retry attempt, or one per logical retry?
If DVT emits one StepStarted per Temporal retry, then engineAttemptId increments with Temporal. If it emits one per logical attempt, Temporal retries are invisible to DVT's event log. Either interpretation is defensible — but neither is specified. For compliance and cost attribution (billing by attempt), this ambiguity is unacceptable.

Cost Estimator Realism
There is no cost estimator in the codebase. The system tracks ConcurrencyPolicy, TimeoutPolicy, and RetryPolicy per step — these are the inputs to a cost model, but the model itself does not exist. For a "cost-aware" platform, cost attribution requires at minimum:

Per-step execution duration (measurable from StepStarted → StepCompleted timestamps)
Per-warehouse-size cost coefficient (Snowflake warehouse × seconds = credits)
Per-run aggregation
Per-tenant billing period rollup
None of this exists. The platform bills no one and tracks nothing. If cost awareness is a product requirement, this is not a "later" feature — it requires event schema design decisions now (otherwise adding cost metadata to events is a breaking change).

Plan Versioning Strategy
CURRENT_EXECUTION_PLAN_VERSION = '2.3' with SUPPORTED_EXECUTION_PLAN_VERSIONS = ['2.3'] is a governance structure with a single supported version at runtime. This works until the first version bump. The moment 2.4 is released:

Old plans stored in run_metadata are at 2.3
If the engine is upgraded first, it accepts 2.4 but old plans fail validation
If the planner is upgraded first, it emits 2.4 to an engine expecting 2.3
This requires zero-downtime deploy coordination. The ADR-0036 process exists but no runtime multi-version window is implemented. The single-version array is the structural gap.

Is the planning layer over-engineered? Partially. The CustomPolicyNamespaceRegistry with Zod schema validation, denied-field scanning, and per-namespace payload byte limits — for zero documented consumers — is over-engineered. The rest of the planning layer (DAG, policy resolution, plan assembly, step factory) is appropriately complex for the problem.

Is it under-specified? Yes on retry ownership, partial execution, and cost attribution.

Does it introduce hidden Snowflake coupling? Partially. DbtStepTypeConfig in @dvt/contracts is dbt-specific. compiledCodeRef stores Snowflake-dialect compiled SQL as a content-addressable artifact. The ExecutionPlan abstraction implies portability — a plan built for Snowflake cannot execute against BigQuery. This portability gap is not documented in the plan contract.

1. State & Metadata Layer Review
   Artifact Immutability
   run_events: immutable by construction (UNIQUE + no DELETE). Correct.
   run_snapshots: NOT immutable — upserted by projector on rebuild. This is correct for a derived read model, but it means a snapshot can silently diverge from the event log if the projector has a bug.
   run_archive.archive_bytes: immutable once written. Correct.
   compiledCodeRef blobs in S3: immutable by construction (content-addressed). Correct.
   Write Amplification Risk
   For each step event (StepStarted, StepCompleted, StepFailed), the system writes:

run_events row (always)
outbox row (always, via appendAndEnqueueTx)
lineage_outbox row (for step events, via LineageOutboxObserver)
run_snapshots upsert (if projector is co-located)
That is 3–4 writes per step event. For a 1000-node DAG with max 3 retries: up to 4000 step events × 4 writes = 16,000 writes per run lifecycle. At 1000 concurrent runs: 16 million writes per full fleet execution cycle. This is not modeled anywhere. PostgreSQL write throughput is finite. Without WAL tuning, connection pooling configuration, and index maintenance, this will be the first operational wall.

Event Sourcing vs Mutable State Tradeoffs
The model is correct: event log as source of truth, snapshots as derived read models. The risk is:

Projector lag becomes invisible. If ProjectorWorkerRuntime is behind by 10,000 events, GET /runs/:runId returns stale state. There is no staleness indicator in the API response. A caller cannot distinguish "run is idle" from "snapshot is 10 minutes stale."

Full event replay at scale. rebuildSnapshot() replays all events from run_events for a given run_id. For a long-running run with 5000 events, this is a full table scan filtered by run_id. With proper indexing ((run_id, run_seq)) this is efficient — but the query plan must be verified under load.

Snapshot rebuild race condition. Two projector workers can claim the same stale run_id concurrently. Both will replay the same events and upsert the same snapshot row. The UPSERT is idempotent only if both replays produce identical results — which they will if the event log is immutable. But the double-work is wasted. No distributed lock on snapshot rebuild is visible.

1. What Is Overbuilt?
   CustomPolicyNamespaceRegistry: Zod-schema validation, denied-field scanning, per-namespace byte limits — for a feature with zero production consumers. This is framework-building ahead of requirements.

EngineRunRef Conductor provider type: The discriminated union includes conductor with conductorUrl. No Conductor implementation exists. Dead type branches in a discriminated union are a maintenance liability and signal over-planning.

ObservedTemporalAdapter + temporalObservability + LineageOutboxObserver observability layering: Three separate abstraction layers for what is fundamentally "emit a span/event when an operation occurs." The composition is reasonable, but the naming and layering complexity is disproportionate to the observability value delivered.

IExecutionBindingVerifier per-step SHA-256 verification: Verifying that a blob at storageUri still matches expectedSha256 at every step start adds a network call to S3 per step execution. For a 1000-node DAG, this is 1000 S3 calls per run for a verification that is near-certain to pass (content-addressed storage). The verification should run once at plan dispatch, not per step.

Outbox sharding (ADR-0033) complexity: At current scale, outbox sharding with per-shard claim isolation and distributed fencing adds operational complexity before the simpler single-worker model has been shown to be insufficient. Premature.

1. What Is Underbuilt?
   Event payload versioning (S05): Critical. Without payloadVersion, any payload shape change is a silent breaking change across the lineage worker, projector, and outbox consumer. Must be resolved before any payload schema change.

Retry ownership model (historical S09 gap, now closed by ADR-0040): Without
specifying whether DVT or Temporal is authoritative for retry count, cost
attribution and compliance reporting are impossible. `engineAttemptId` vs
`logicalAttemptId` were unresolved semantic duplicates at review time.

Read-your-writes contract: After startRun(), the caller has no guarantee that getRunStatus() returns the new run. Snapshot lag is unbounded. The API does not indicate snapshot age. This is standard eventual consistency, but it needs a documented and contractual staleness bound.

Rollback / compensating transactions: No definition exists. A partial run failure leaves Snowflake in an indeterminate state. For a data platform, this is a product-critical gap — "the run failed at step 847" tells an operator that 846 models were materialized. They cannot tell which ones cleanly.

Schema migration rollback: PostgresSchemaManager runs forward-only migrations with no rollback path. A failed migration on a production database leaves schema in an inconsistent state. A down-migration path or transactional migration approach (DDL within a transaction, where possible) is required.

Run event log retention: run_events has no TTL, no partition expiry, no automated archival trigger. The table grows unboundedly. Archive export (PostgresRunArchiveStore) exists but requires explicit invocation. Without automated retention, the table becomes the operational problem in 12–18 months.

RBAC at operation level: G8 implemented OIDC auth + tenant policy. But who can CANCEL vs PAUSE vs RETRY within a tenant? Signal types carry different risk profiles. No role-based operation authorization is visible.

Distributed consistency specification: The two-phase protocol (intent → adapter.startRun → bootstrapRunTx) is mitigated by RunMaintenanceService reconciliation. But the consistency model — what state the system is guaranteed to be in at any point — is not formally specified. An operator cannot reason about system state during a partial failure without reading source code.

Backpressure from Temporal to API: StartRunAdmissionGuard guards against database saturation. But if the Temporal task queue is saturated (workers at capacity), new runs are accepted by the API, bootstrapped into the event log, and queued in Temporal. Temporal will start them when workers free up. This is correct behavior — but there is no flow control path from Temporal queue depth to API admission. The system will over-accept under Temporal worker saturation.

Cost attribution: Stated as a product requirement in the system context. Not implemented. Not designed into the event schema. Adding it later requires a breaking event schema change — which, without payloadVersion, is undetectable by consumers.

1. Scalability Outlook (3-Year Horizon)
   1000+ Tenants
   Row-level tenant isolation in a shared PostgreSQL schema is viable at this tenant count only with proper index design. The critical queries:

run_events WHERE tenant_id = ? AND run_id = ? — requires (tenant_id, run_id, run_seq) composite index
run_metadata WHERE tenant_id = ? ORDER BY created_at DESC — requires (tenant_id, created_at) index
outbox WHERE shard_id = ? AND status = 'PENDING' — requires (shard_id, status, next_attempt_at) index
Index bloat with 1000 tenants × millions of rows per tenant will require regular REINDEX operations or BRIN index strategies. This is operational work not currently documented.

Cross-tenant query protection is enforcement-by-convention in the adapter layer. A single bug in adapter code that omits tenantId from a query returns cross-tenant data. There is no database-level row security policy (PostgreSQL RLS) as a backstop.

Thousands of Concurrent Runs
The outbox polling model (listPending() → deliver → markDelivered) is a polling loop against a shared table. With 5000 concurrent runs each producing events at 10 events/minute = 50,000 outbox rows being inserted per minute. The polling worker must scan, claim, deliver, and mark at this rate. Without aggressive indexing and claim timestamp optimization, this becomes a hot table.

Snapshot rebuild (listStaleSnapshotRuns()) is a join across run_snapshots and run_events — expensive at scale without materialized stale-indicator flags.

The PostgresBackpressureSnapshotReader reads a snapshot to make admission decisions. Under 5000 concurrent runs, this reader is called on every startRun request. Its cache (low-TTL) amortizes the cost, but cache misses hit Postgres directly.

1000+ Node dbt Projects
Plan computation is CPU-bound, not I/O-bound. A 1000-node, 10,000-edge DAG:

JCS serialization: O(N log N) for key sorting × 1000 nodes → fast
SHA-256 over ~500KB canonical JSON → fast
Toposort: O(V+E) = O(11,000) → trivial
Plan storage is the concern. canonicalPlanJson at 500KB × 10,000 stored plans = 5GB. Fine for Postgres JSONB. But querying plan metadata at this volume requires that planId be indexed, and plan content not be scanned routinely.

The real risk: if each plan build involves resolving a manifestRef (S3/GCS fetch of the dbt manifest artifact), and the manifest for a 1000-node project is 10–50MB, then concurrent planners running at 100 requests/second each fetching 50MB manifests = 5GB/s of S3 egress. At scale, manifest fetching becomes the bottleneck, not DAG computation.

Heavy Cost Dashboards
There is nothing to dashboard. Cost attribution does not exist. Building cost dashboards on a system with no cost data requires adding cost data to events — which requires S05 payloadVersion to be in place first to avoid breaking existing consumers.

Bottlenecks and SPOFs
Bottleneck Type Horizon
Single PostgreSQL instance SPOF 12–18 months
run_events table unbounded growth Growth 18–24 months
Outbox polling hot table Performance 6–12 months at 1000 concurrent runs
listStaleSnapshotRuns() join Performance 6–12 months
Manifest S3 fetch at plan build Performance Depends on plan concurrency
Temporal task queue saturation Backpressure Depends on worker fleet size 10. Architectural Scorecard
Dimension Score Justification
Conceptual clarity 7/10 The Planner/Engine/State separation is genuinely clean at the contract level. Deducted for IRunStateStore god interface, unversioned event payloads, and compiledCodeRef transport opacity.
Separation of concerns 5/10 S02 unexecuted means the state store is a 7-responsibility object. DbtStepTypeConfig in shared contracts bleeds dbt knowledge into the kernel. StartRunUseCase in apps/api owns engine logic. SRP violations are documented but not resolved.
Replaceability of engine 6/10 IProviderAdapter is the correct extension point. But RunSubstatus.CONTINUE_AS_NEW is Temporal-specific in shared contracts. ResolvedPolicies is Temporal-shaped. A Conductor adapter would require changing shared contracts, not just adding an adapter.
Determinism 6/10 Plan identity hashing via JCS + SHA-256 is correct. But dbt manifest node ordering is not guaranteed stable. compiledCodeRef SHA-256 breaks for non-deterministic dbt templates. Temporal's determinism requirements are invisible in adapter contracts.
Extensibility 7/10 StepTypeRegistry for new step kinds is well-designed. IProviderAdapter is the correct engine extension point. CustomPolicyNamespaceRegistry is over-engineered. EngineRunRef ghost types for unimplemented providers pollute the extension surface.
Operational realism 4/10 No SLO definitions. No automated DLQ replay. No schema rollback. No run retention automation. No RBAC at operation level. Archive restore missing. Projector staleness invisible to API callers. This system has not been validated for production operations.
Long-term maintainability 5/10 ADR process is exemplary. Contract versioning
exists. At review time, S05 (event payloads) and S09 (retry ownership) were
fundamental ambiguities that would compound with every feature added. S09 is
now closed by ADR-0040, but the god IRunStateStore still makes every change
expensive until S02 ships.
Aggregate: 40/70 = 57%. Architectural skeleton is sound; operational and structural debt is real and growing.

1. Strategic Recommendations
   3 Structural Changes to Make Now
1. Execute S02 (IRunStateStore split) — immediately.
   Split into: IRunEventStore, IRunMetadataStore, IRunSnapshotStore, IOutboxStore. The current god interface means a mock for any unit test must implement all seven concerns. Every change to the state layer touches all consumers. This is unblocked and documented. There is no excuse for continued deferral. The longer it waits, the more adapters accumulate against the monolithic interface.
1. Add payloadVersion to EventInput and define per-eventType payload schemas (S05).
   This is not optional. Every consumer of the event log (projector, lineage worker, outbox worker, archive restore) deserves a typed payload. Without this, the first payload schema change after a 12-month backlog of events produces an undetectable deserialization error in every consumer. Implement S05 with AJV validation per eventType at the adapter write boundary.
1. Promote compiledCodeRef to a typed field in ExecutionStepV2.
   Remove it from stepTypeConfig: Record<string,unknown>. The "tech debt, defer" classification for ADR-0032 is wrong — this is a type-safety gap in the critical path between planner and execution. The field is already defined as CompiledCodeRef interface. Putting it in the typed contract costs one field addition and eliminates the silent cast at activity boundary.

3 Clarifications Required Now

1. Retry ownership boundary - now answered by ADR-0040.
   The historical S09 question was whether `engineAttemptId` was the Temporal
   activity-attempt counter or a DVT-managed counter. ADR-0040 now defines that
   authority boundary and the adapter-enforcement expectation.
1. Snapshot staleness contract — what is the maximum acceptable lag?
   The API returns snapshot data without indicating age. Define a maximum acceptable staleness bound (e.g., 30 seconds) and surface it in the API response (x-snapshot-age-ms header or snapshotAge in the response body). Without this, callers cannot distinguish stale data from correct idle state.
1. dbt manifest node ordering stability — is it guaranteed?
   Before the content-addressable plan system can be trusted for large-scale production use, verify that dbt guarantees stable manifest.nodes key ordering across equivalent invocations. If it does not, the planId for the same logical plan may vary — breaking plan deduplication and caching.

3 Things to Freeze Immediately

1. Freeze CustomPolicyNamespaceRegistry feature additions.
   It has no consumers. Every additional capability (new schema validators, additional namespace entries, new denied-field rules) adds complexity for zero delivered value. Freeze until a concrete consumer with documented requirements exists.
1. Freeze EngineRunRef.conductor type branch.
   No Conductor implementation. No documented plan. The ghost type pollutes every switch/match on EngineRunRef. Remove it from the union. Re-add when an implementation exists.
1. Freeze IExecutionBindingVerifier per-step invocation.
   Move SHA-256 artifact verification to plan dispatch time, not step execution time. Per-step S3 verification at 1000 nodes per run is 1000 S3 calls per run lifecycle — latency overhead with near-zero detection value for content-addressed storage. Run it once at bootstrapRunTx, not at every activity.

3 Things to Delay

1. Delay outbox worker sharding scale-out.
   The current single-shard model has not been demonstrated insufficient. Sharding adds claim-timeout complexity, per-shard dead-letter management, and worker coordination overhead. Until benchmark data shows single-worker throughput is the bottleneck, sharding is premature optimization.
1. Delay cross-environment diff implementation.
   This requires a bi-temporal data model (plan state at time T in environment E). Nothing in the current event model supports this. Adding it before the core event schema is stable (S05 not complete) would require immediate rework. Defer until event payload versioning is in place.
1. Delay cost dashboard and attribution.
   Not because it's unimportant — because it requires event schema changes (cost data in StepCompleted payloads), which requires S05 first. Building a cost dashboard against unversioned payloads and then changing the payload schema is waste. Block cost work on S05 completion.

Bottom line: The architectural skeleton is principled and the contract governance process is one of the strongest aspects of the system. The immediate threats are operational: an unversioned event payload, a god-interface state store, and a missing retry ownership model. These three gaps will compound with every subsequent feature. Fix them before adding any new capability.
