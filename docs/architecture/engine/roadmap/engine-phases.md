# Engine Roadmap: Phases & Milestones

**Audience**: Executive stakeholders, product, engineering leadership  
**Purpose**: Phase breakdown, milestones, success criteria  
**Status**: Phase 1 (MVP) in progress  
**Last Updated**: 2026-02-11

---

## Executive Summary

**Vision**: Multi-adapter data orchestration engine (Temporal → Conductor → custom platforms).

**Timeline**:

- **Phase 1 (MVP)**: Temporal-only, core engine semantics, determinism gating (Q1 2026 - Target: March 31).
- **Phase 1.5 (Hardening)**: Load testing, operational correctness, security baseline (April-May 2026).
- **Phase 2**: Conductor adapter, parity matrix, multi-language SDKs (Q2-Q3 2026).
- **Phase 3**: Cost attribution, observability automation, custom plugins (Q3-Q4 2026).
- **Phase 4**: Enterprise features (RBAC, audit compliance, disaster recovery) (2027).

---

## Phase 1: MVP (Temporal Only) — Target: March 31, 2026

**Scope**: Temporal-powered engine with determinism guarantees.

### 1.1 Normative Contracts

**Deliverables**:

- ✅ IWorkflowEngine.v1.md (interface + signal catalog)
- ✅ ExecutionSemantics.v1.md (StateStore model, dual attempts, snapshots)
- ✅ TemporalAdapter.spec.md (interpreter, namespace, workers, determinism)
- ✅ RunStateUpdate.v1.md (event schema, envelope, versioning, consumer compatibility)
- ✅ Idempotency.v1.md (key spec: eventType+runId+stepId+attemptId, upsert semantics)
- ✅ PlanRef versioning & schema evolution
- ✅ Capability matrix (executable JSON schemas)

**Success Criteria**:

- [ ] All contracts reviewed + signed off by engineering leads
- [ ] Contract tests: golden JSON fixtures + schema validation + backward compatibility tests in CI
- [ ] Temporal 1.0+ compatibility verified

### 1.2 Core Engine Implementation

**Deliverables**:

- [ ] IWorkflowEngine interface (startRun, cancelRun, getRunStatus [debug-only], signal)
- [ ] RunStateStore impl (PostgreSQL, append-only events, idempotent writes)
- [ ] SnapshotProjector (event replay, state derivation, immutable artifacts)
- [ ] Signal handler (PAUSE, RESUME, RETRY_STEP, CANCEL, custom signals)
- [ ] PlanFetcher + validator (schema versioning, capability checks)
- [ ] Authorization enforcement (API-boundary RBAC; engine consumes pre-authorized commands; emits auditable SignalDecisionRecord to StateStore)
- [ ] StateStore retention baseline (event archival after 90 days to cold storage; latest-status denormalized index for queries)
- [ ] Plugin permission schema (capabilities + scopes; design in Phase 1, implement Phase 3)
- [ ] Plugin sandbox strategy decision (isolated-vm / gVisor / separate process boundary)
- [ ] Audit events schema for plugin invocations

**Success Criteria**:

- [ ] E2E test: run deterministic plan from start to completion
- [ ] E2E test: pause + resume workflow mid-execution
- [ ] E2E test: retry failed step, same artifacts produced
- [ ] E2E test: cancel run gracefully, in-flight tasks timeout
- [ ] All StateStore writes idempotent under at-least-once delivery (upsert semantics verified)
- [ ] StateStore write latency p99 < 10ms (constraints: single-region, SSD storage, connection pool ≥50, batched writes where possible)
- [ ] Projection lag p99 < 1s (time-based SLO); backpressure triggers at 100 events behind
- [ ] getRunStatus used for debugging only; StateStore remains primary truth

### 1.3 Temporal Interpreter Workflow

**Deliverables**:

- [ ] DAG walker (step scheduling, dependency order)
- [ ] Activity dispatch (correct task queue routing, retries)
- [ ] Determinism enforcement (Temporal getVersion gates)
- [ ] continueAsNew logic (50 steps OR 1MB history threshold)
- [ ] Pause signal handler (cancel in-flight activities, StateStore sync)
- [ ] StateStore retention + archival baseline policy (archive after 90 days to cold storage; index strategy for latest-status queries)

**Success Criteria**:

- [ ] Large plan (200+ steps): completes without continueAsNew OR continues correctly
- [ ] Pause signal latency p99 < 1s (engine responsiveness)
- [ ] Activity retries increment engineAttemptId correctly
- [ ] Determinism verified (replay produces identical snapshots)
- [ ] Archive/query strategy documented and tested

### 1.4 Observability & Monitoring

**Deliverables**:

- ✅ Metrics definition (runs, steps, StateStore, signals, adapters)
- ✅ Prometheus scrape config
- ✅ Grafana dashboards (executive, SRE, developer)
- ✅ Alert rules (P1: adapter down, projection gap; P2: error rate, lag)
- ✅ Jaeger trace instrumentation
- ✅ ELK log aggregation
- ✅ Incident response runbooks

**Success Criteria**:

- [ ] Dashboard shows: runs/min, completion latency, error rate, projection lag
- [ ] Alert "ProjectionGapDetected" fires correctly
- [ ] MTTR drill: 3 game-days completed; p50 time-to-identify culprit component < 5 min

### 1.5 Determinism Tooling & CI Gating

**Deliverables**:

- ✅ ESLint determinism rules
- ✅ Replay test framework
- ✅ Pre-commit hooks
- ✅ GitHub Actions CI gate
- ✅ Developer debugging tools (replay, trace divergence)

**Success Criteria**:

- [ ] All new plans pass determinism gate
- [ ] PR comment auto-generated with replay test results
- [ ] Zero non-deterministic plans reach production

### 1.6 MVP Release

**Deliverables**:

- [ ] Public contracts (versioned, tagged)
- [ ] SDK (TypeScript reference impl + interface)
- [ ] Getting started guide
- [ ] 3-step tutorial (hello-world → dbt → complex branching)
- [ ] Production runbooks

**Success Criteria**:

- [ ] External beta users can deploy engine in < 1 hour
- [ ] First 10 plans completed successfully (> 99% completion rate)
- [ ] Zero unplanned incidents (P0)

**Target Date**: March 31, 2026

---

## Phase 1.5: Hardening & Operational Readiness — Target: May 31, 2026

**Scope**: Load testing, operational correctness validation, security baseline.

**Rationale**: March 31 MVP gate + immediate Phase 2 (Conductor) creates slip risk. Dedicate 8 weeks to hardening before multi-adapter complexity.

### 1.7 Load Testing

**Deliverables**:

- [ ] Steady-state benchmarks: 1000 runs/min, 10K steps/min
- [ ] Stress tests: signal storms (100 PAUSE signals/sec), worker failure scenarios
- [ ] Chaos engineering: DB failover, network partition, adapter restart
- [ ] Resource saturation: connection pool exhaustion, disk I/O limits

**Success Criteria**:

- [ ] Sustained 1000 runs/min for 4 hours without degradation
- [ ] Zero data corruption during DB failover
- [ ] Recovery from worker loss < 30s (new worker picks up tasks)

### 1.8 Operational Correctness Suite

**Deliverables**:

- [ ] Idempotency torture test: duplicate events, out-of-order delivery, retry storms
- [ ] Projector rebuild from zero: time-to-rebuild < 10 min for 100K events
- [ ] State consistency verification: snapshot checksum matches event log replay

**Success Criteria**:

- [ ] 1M duplicate events processed without state corruption
- [ ] Projector rebuild completes in < 10 min (100K events)
- [ ] Zero divergence between projector and manual replay

### 1.9 Security Baseline

**Deliverables**:

- [ ] Authn/z enforcement at API boundary (even if RBAC is stubbed)
- [ ] Audit trail retention: 90 days hot, 7 years cold (policy + automation)
- [ ] PII scrubbing policy: credentials, tokens never appear in logs
- [ ] Threat model document (finalizing #13 from backlog)

**Success Criteria**:

- [ ] Penetration test: no API bypass, no SQL injection
- [ ] Audit log tamper-proof (append-only, cryptographic signatures)
- [ ] PII regex scan: zero credentials in logs (automated check)

**Target Date**: May 31, 2026

---

## Phase 2: Conductor Adapter & Multi-Language SDKs — Target: September 30, 2026

**Scope**: Conductor support (Phase 2 DRAFT), Python/Go SDKs, plan schema v1.2.

### 2.1 Conductor Adapter Implementation

**Deliverables**:

- ✅ ConductorAdapter.spec.md (limitations, emulation strategy)
- [ ] **Determinism parity definition** (anchored decision - see Anchor Decision A below):
  - *Guarantee*: For a given ExecutionPlan vN, the allowed state transitions and final snapshot are deterministic (same inputs/artifacts → same outcome), regardless of adapter
  - *Non-goal*: Identical replay semantics across engines (Temporal replay ≠ Conductor runtime)
  - *Mechanism*: StateStore + immutable artifacts are canonical replay surface; adapter behavior validated against it
- [ ] Determinism parity test suite: cross-adapter validation (10+ plans, verified identical state transitions)
- [ ] Workflow DSL generator (plan → Conductor JSON)
- [ ] Event listener (async status callbacks)
- [ ] Pause/cancel emulation (WAIT_FOR_EXTERNAL_EVENT)

**Success Criteria**:

- [ ] 10 end-to-end Conductor workflows (simple → complex)
- [ ] Pause latency p99 < 5s (eventual, not native Temporal-speed)
- [ ] Capability matrix validated (6 supported, 4 emulated, 2 degraded)
- [ ] Determinism parity definition approved by engineering leads
- [ ] POC integration tests passing

### 2.2 Multi-Language SDKs

**Deliverables**:

- [ ] Python SDK (task workers, plan builder, client)
- [ ] Go SDK (task workers, observability)
- [ ] Java SDK (Spring Boot integration)
- [ ] SDK documentation + examples

**Success Criteria**:

- [ ] Python task worker can execute 5 step types
- [ ] All SDKs pass compatibility matrix tests

### 2.3 Plan Schema v1.2

**Deliverables**:

- [ ] Schema evolution (v1.0 → v1.1 → v1.2 migration path)
- [ ] Backward compatibility verified
- [ ] New features: custom signals, plugin policies, cost hints

**Success Criteria**:

- [ ] Existing v1.0 plans run on v1.2 without changes
- [ ] v1.2 → v1.0 downgrade path documented

### 2.4 Roadmap Outcomes

**Phase 1 + Phase 2 = Multi-Adapter Parity**:

- 2 production adapters (Temporal + Conductor)
- 3+ language SDKs
- Standardized capability fallback (reject, emulate, degrade)
- Cost model (compute per task, data per artifact)

**Target Date**: September 30, 2026

---

## Phase 3: Advanced Observability & Plugin Marketplace — Target: March 31, 2027

**Scope**: Cost attribution, ML anomaly detection, custom plugins, SSO.

### 3.1 Cost Attribution

**Deliverables**:

- [ ] Per-tenant billing model (compute units/min, GB artifacts)
- [ ] Chargeback dashboard (cost vs. run count)
- [ ] Budget alerts (per-tenant spend cap)

**Success Criteria**:

- [ ] Can answer "How much did tenant-X spend last month?"
- [ ] Tenant sees cost per plan, per run

### 3.2 ML Observability

**Deliverables**:

- [ ] Anomaly detection (unusual latencies, error patterns, data volumes)
- [ ] Auto-remediation (scale workers, reject runs, alert)
- [ ] Predictive alerts (forecast resource exhaustion)

**Success Criteria**:

- [ ] Detects 80% of anomalies 10 minutes before SLA breach
- [ ] False positive rate < 5%

### 3.3 Plugin Marketplace

**Deliverables**:

- [ ] Plugin registry (vetted, published, versioned)
- [ ] Plugin sandbox (resource limits, timeout enforcement)
- [ ] Plugin marketplace UI (discover, rate, review plugins)

**Success Criteria**:

- [ ] 20+ community plugins published
- [ ] 10k plugin invocations/week
- [ ] Zero sandbox escapes (security audit)

### 3.4 Target Date

March 31, 2027

---

## Phase 4: Enterprise Features & Beyond — 2027+

**Scope**: RBAC, compliance (SOC2, HIPAA), disaster recovery, global replication.

### 4.1 RBAC & Audit

**Deliverables**:

- [ ] Fine-grained RBAC (plan author, operator, auditor roles)
- [ ] 7-year audit trail (SignalDecisionRecord + all state mutations)
- [ ] Compliance exports (SOC2, HIPAA, GDPR)

### 4.2 Disaster Recovery

**Deliverables**:

- [ ] Cross-region failover (Temporal cluster + StateStore)
- [ ] Backup/restore procedures
- [ ] PITR (Point-in-Time Recovery)

### 4.3 Global Replication

**Deliverables**:

- [ ] Multi-region deployments
- [ ] Geo-distributed StateStore (with consistency model)
- [ ] Regional adapter selection (run plans in home region)

---

## Risk Registry & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **Temporal scalability** | Medium | High | Load test @ 1000 runs/min early; pre-allocate hardware |
| **Determinism bugs** | Low | High | Extensive replay tests (Phase 1); find gaps in CI |
| **Storage bottleneck** | Low | High | Archive events yearly; tune index design |
| **Conductor phase slip** | Medium | Medium | Start POC in Phase 1 funding; hire contractor if needed |
| **Security: plugin sandbox** | Medium | High | Red-team plugin isolation (pre-Phase 3); pen-test report |
| **Regulatory: GDPR compliance** | Low | High | Legal review of audit trail design; pre-emptive deletion policy |

---

## Success Metrics (Overall)

By end of 2026 (Phases 1 + 2):

| Metric | Target | Notes |
|--------|--------|-------|
| **Control-plane latency** | | |
| RunRequest → plan persisted | p99 < 300ms | API validation + planner + StateStore |
| State update → UI refresh | p99 < 1s | Projection latency |
| **Engine responsiveness** | | |
| PAUSE signal → no new activities scheduled | p99 < 1s | Temporal-native, immediate |
| State mutation → projector updates StateStore | p99 < 10ms | Write latency |
| **Data-plane (step execution)** | Varies by step type | Measured per warehouse size |
| dbt step (small model: <1K rows) | p99 < 30s | Data warehouse, not engine |
| dbt step (medium model: 1-100K rows) | p99 < 2m | Warehouse-dependent |
| Spark job execution | p99 < 5m | Cluster size, not engine |
| **System-level SLOs** | | |
| Availability (control plane) | 99.5% | Excludes data warehouse |
| Error rate (engine) | < 0.1% | Excludes user-code errors in tasks |
| Cost per run | < $0.01 | Compute + storage, TBD |
| Runs completed / day | 50,000+ | Phase 1 baseline |
| Tenant count | 50+ | Beta phase |

By end of 2027 (Phases 1 + 2 + 3):

| Metric | Target |
|--------|--------|
| Runs completed / day | 500,000+ |
| Tenant count | 500+ |
| Plugins in registry | 100+ |
| Multi-region deployments | 3+ |
| Control-plane SLA compliance | 99.5% availability |

---

## Dependencies & Blockers

### Phase 1 (MVP)

- ✅ Temporal cluster (staging + prod): **GO** (infrastructure ready)
- ✅ PostgreSQL (StateStore): **GO** (provisioned)
- ✅ Observability stack (Prometheus, Grafana, Jaeger): **GO** (deployed)
- 🔶 Legal approval for audit trail: **IN PROGRESS** (expected Feb 20)

### Phase 2

- 🔶 Conductor cluster setup: **BLOCKED on vendor onboarding** (expected March 15)
- 🟢 Python/Go SDK design: **READY** (design doc approved)

### Phase 3

- 🟢 ML/observability vendor (DataDog or Splunk): **READY to integrate**
- 🔶 Plugin security audit: **SCHEDULED Q2 2026**

---

## Staffing & Budget

| Phase | Engineers | SREs | PM | Timeline | Budget |
|-------|-----------|------|-----|----------|--------|
| Phase 1 | 5 | 2 | 1 | 8 weeks | $1.5M |
| Phase 2 | 4 | 1 | 1 | 16 weeks | $2.0M |
| Phase 3 | 3 | 2 | 1 | 20 weeks | $2.5M |
| Phase 4 | 2-3 | 2 | 1 | Ongoing | $1.5M/quarter |

---

## Decision Gates (Red/Yellow/Green)

### Phase 1 → Phase 1.5 Gate (March 31, 2026)

**Green Criteria** (ALL required):

- [ ] Zero P1 incidents in production (2-week window)
- [ ] 95%+ test pass rate
- [ ] SLA targets verified via synthetic benchmarks:
  - Control-plane latency (RunRequest → plan persisted) p99 < 300ms ✅
  - State update → UI update p99 < 1s ✅
  - PAUSE signal latency p99 < 1s ✅
- [ ] External beta users report positive feedback (survey NPS > 50)

**Yellow Criteria** (assess):

- [ ] 1 P1 incident in 2-week window → post-mortem required
- [ ] 85-94% test pass rate → root cause analysis
- [ ] Any control-plane SLA target exceeded → optimization plan required

**Red Criteria** (BLOCK):

- [ ] > 1 P1 incident / week
- [ ] < 85% test pass rate
- [ ] Control-plane latency targets missed by >50% → root cause investigation required
- [ ] Any security vulnerability (audit trail, idempotency, plugin sandbox)

**Decision Maker**: VP Engineering + Product Lead

### Phase 1.5 → Phase 2 Gate (May 31, 2026)

**Green Criteria** (ALL required):

- [ ] Load test targets met: 1000 runs/min sustained for 4 hours
- [ ] Idempotency torture test passed: 1M duplicate events, zero corruption
- [ ] Projector rebuild < 10 min for 100K events
- [ ] Security baseline: penetration test passed, PII scan clean
- [ ] Operational readiness: 3 game-days completed, MTTR p50 < 5 min

**Yellow Criteria** (assess):

- [ ] 1 P1 incident in 2-week window → post-mortem required
- [ ] 85-94% test pass rate → root cause analysis
- [ ] Any control-plane SLA target exceeded → optimization plan required

**Red Criteria** (BLOCK):

- [ ] > 1 P1 incident / week
- [ ] < 85% test pass rate
- [ ] Control-plane latency targets missed by >50% → root cause investigation required
- [ ] Any security vulnerability (audit trail, idempotency, plugin sandbox)

**Decision Maker**: VP Engineering + Product Lead

### Phase 2 → Phase 3 Gate (Sept 30, 2026)

Same criteria as Phase 1 → Phase 2 gate, PLUS:

- [ ] Conductor adapter passes POC validation (parity definition honored)
- [ ] Multi-language SDK (≥2 languages) mature and tested
- [ ] Cost model approved by finance
- [ ] Determinism parity implemented and verified across adapters

---

## Key Milestones (Quarterly)

```
Q1 2026 (Phase 1)
  Week 1-2:  Contracts finalized; engine core impl starts
  Week 3-4:  Interpreter workflow; observability baseline
  Week 5-6:  Determinism tooling + CI gating
  Week 7-8:  MVP release; 5 beta customers
  
Q2 2026 (Phase 1.5 + Phase 2 start)
  Week 1-4:  Load testing; operational correctness suite
  Week 5-8:  Security baseline; hardening complete
  Week 9-12: Conductor POC + DSL generator; determinism parity test suite
  
Q3 2026 (Phase 2 finish, Phase 3 start)
  Week 1-4:  Phase 2 release candidate
  Week 5-8:  Cost attribution MVP
  Week 9-12: ML observability POC
  
Q4 2026 / Early 2027 (Phase 3)
  Plugin marketplace launch
  RBAC implementation
  Disaster recovery planning
```

---

## Anchor Decisions

### Anchor Decision A: Conductor Determinism Parity (NORMATIVE)

**Decision Date**: 2026-02-11

**Guarantee**: For a given `ExecutionPlan vN`, the allowed state transitions and final snapshot are deterministic (given the same inputs/artifacts), regardless of adapter.

**Non-goal**: Identical replay semantics across engines (Temporal replay ≠ Conductor runtime).

**Mechanism**: StateStore + immutable artifacts are the canonical replay surface; adapter behavior must be validated against it.

**Validation**:
- Cross-adapter test suite: same plan executed on Temporal and Conductor must produce identical state transitions (event log comparison).
- Test coverage: 10+ golden paths (minimal, parallel, cancel-resume, retry, branching).
- Acceptance: Zero divergence in final snapshot checksums.

**References**:
- DVT Product Definition: "engine executes, store is truth"
- Engine boundary: https://github.com/dunay2/dvt/blob/main/docs/architecture/engine/design_principles.md

### Anchor Decision B: StateStore Indexing & Retention (OPERATIONAL CONTRACT)

**Decision Date**: 2026-02-11

**Hot vs Cold Storage**:
- **Hot (PostgreSQL)**: Latest status index (runId → latestStatus, updatedAt); 90 days retention; optimized for queries: "show run status", "list active runs".
- **Cold (S3/GCS)**: Append-only event log; 7 years retention; optimized for compliance + disaster recovery.

**Projector Rebuild Path**:
- Rebuild mechanism: replay all events from cold storage + recompute snapshots.
- Time budget: 10 min for 100K events (Phase 1.5 load test target).
- Triggers: data corruption, schema migration, disaster recovery.

**Retention Enforcement**:
- Automated archival: events older than 90 days moved to cold storage (daily cron job).
- Hot storage indexes: runId (primary key), tenantId+createdAt (tenant queries), status+updatedAt (active runs dashboard).
- Cold storage format: partitioned Parquet files (year/month/day), compressed.

**Query Patterns (Hot)**:
- "Get run status": SELECT latestStatus FROM runs WHERE runId = ?
- "List active runs for tenant": SELECT * FROM runs WHERE tenantId = ? AND status IN ('RUNNING', 'PAUSED') ORDER BY updatedAt DESC
- "Count runs by status": SELECT status, COUNT(*) FROM runs WHERE tenantId = ? GROUP BY status

**Query Patterns (Cold)**:
- "Audit log for run": SELECT * FROM events WHERE runId = ? ORDER BY timestamp (S3 Select or Athena)
- "Compliance export": SELECT * FROM events WHERE tenantId = ? AND timestamp BETWEEN ? AND ?

**Constraints**:
- Single-region deployment (Phase 1); cross-region replication deferred to Phase 4.
- SSD storage class (PostgreSQL); connection pool ≥50 (avoid saturation at 1000 runs/min).
- Batched writes where possible (projector buffers 10 events before commit).

**References**:
- Temporal history limits: https://docs.temporal.io/encyclopedia/temporal-platform-limits
- OpenTelemetry for traces: https://opentelemetry.io/

---

## References

- [IWorkflowEngine Contract](../contracts/engine/IWorkflowEngine.v1.md)
- [ExecutionSemantics Contract](../contracts/engine/ExecutionSemantics.v1.md)
- [TemporalAdapter Spec](../adapters/temporal/TemporalAdapter.spec.md)
- [Observability Guide](../ops/observability.md)
- [Incident Response Runbook](../ops/runbooks/incident_response.md)
- [Temporal Platform Limits](https://docs.temporal.io/encyclopedia/temporal-platform-limits)
- [Conductor (Netflix/Orkes)](https://conductor.netflix.com/)
- [OpenTelemetry](https://opentelemetry.io/)
