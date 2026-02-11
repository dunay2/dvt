# Engine Roadmap: Phases & Milestones

**Audience**: Executive stakeholders, product, engineering leadership  
**Purpose**: Phase breakdown, milestones, success criteria  
**Status**: Phase 1 (MVP) in progress  
**Last Updated**: 2026-02-11

---

## Executive Summary

**Vision**: Multi-adapter data orchestration engine (Temporal → Conductor → custom platforms).

**Timeline**:
- **Phase 1 (MVP)**: Temporal-only, core engine semantics, determinism gating (Q1 2026).
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
- ✅ PlanRef versioning & schema evolution
- ✅ Capability matrix (executable JSON schemas)

**Success Criteria**:
- [ ] All 3 contracts reviewed + signed off by engineering leads
- [ ] Zero ambiguity in event models, dual attempt semantics
- [ ] Temporal 1.0+ compatibility verified

### 1.2 Core Engine Implementation

**Deliverables**:
- [ ] IWorkflowEngine interface (startRun, cancelRun, getRunStatus, signal)
- [ ] RunStateStore impl (PostgreSQL + append-only events)
- [ ] SnapshotProjector (event replay, state derivation)
- [ ] Signal handler (PAUSE, RESUME, RETRY_STEP, CANCEL, custom signals)
- [ ] PlanFetcher + validator (schema versioning, capability checks)
- [ ] AuthorizationEngine (RBAC + SignalDecisionRecord audit)

**Success Criteria**:
- [ ] E2E test: run deterministic plan from start to completion
- [ ] E2E test: pause + resume workflow mid-execution
- [ ] E2E test: retry failed step, same artifacts produced
- [ ] E2E test: cancel run gracefully, in-flight tasks timeout
- [ ] StateStore write latency p99 < 10ms
- [ ] Projection lag < 50 events (SLA < 1s)

### 1.3 Temporal Interpreter Workflow

**Deliverables**:
- [ ] DAG walker (step scheduling, dependency order)
- [ ] Activity dispatch (correct task queue routing, retries)
- [ ] Determinism enforcement (Temporal getVersion gates)
- [ ] continueAsNew logic (50 steps OR 1MB history threshold)
- [ ] Pause signal handler (cancel in-flight activities, StateStore sync)

**Success Criteria**:
- [ ] Large plan (200+ steps): completes without continueAsNew OR continues correctly
- [ ] Pause signal latency p99 < 1s
- [ ] Activity retries increment engineAttemptId correctly
- [ ] Determinism verified (replay produces identical snapshots)

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
- [ ] SRE can find root cause of any P2 issue within 5 minutes

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

## Phase 2: Conductor Adapter & Multi-Language SDKs — Target: September 30, 2026

**Scope**: Conductor support (Phase 2 DRAFT), Python/Go SDKs, plan schema v1.2.

### 2.1 Conductor Adapter Implementation

**Deliverables**:
- ✅ ConductorAdapter.spec.md (limitations, emulation strategy)
- [ ] Workflow DSL generator (plan → Conductor JSON)
- [ ] Event listener (async status callbacks)
- [ ] Pause/cancel emulation (WAIT_FOR_EXTERNAL_EVENT)
- [ ] Determinism strategy decision (Option A/B/C)

**Success Criteria**:
- [ ] 10 end-to-end Conductor workflows (simple → complex)
- [ ] Pause latency p99 < 5s (eventual, not native)
- [ ] Capability matrix validated (6 supported, 4 emulated, 2 degraded)
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

| Metric | Target | Current (Feb 2026) |
|--------|--------|-------------------|
| Runs completed / day | 50,000+ | 0 (pre-MVP) |
| Tenant count | 50+ | 0 |
| Error rate | < 0.1% | N/A |
| Completion SLA p99 | < 5s | N/A |
| Availability | 99.5% | N/A |
| Cost per run | < $0.01 | TBD |

By end of 2027 (Phases 1 + 2 + 3):

| Metric | Target | Current |
|--------|--------|---------|
| Runs completed / day | 500,000+ | 0 (pre-MVP) |
| Tenant count | 500+ | 0 |
| Plugins in registry | 100+ | 0 |
| Multi-region deployments | 3+ | 0 |

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

### Phase 1 → Phase 2 Gate (March 31, 2026)

**Green Criteria** (ALL required):
- [ ] Zero P1 incidents in production (2-week window)
- [ ] 95%+ test pass rate
- [ ] SLA p99 completion latency < 5s (verified via synthetic benchmarks)
- [ ] External beta users report positive feedback (survey NPS > 50)

**Yellow Criteria** (assess):
- [ ] 1 P1 incident in 2-week window → post-mortem required
- [ ] 85-94% test pass rate → root cause analysis
- [ ] p99 latency 5-10s → optimization plan required

**Red Criteria** (BLOCK):
- [ ] > 1 P1 incident / week
- [ ] < 85% test pass rate
- [ ] p99 latency > 10s
- [ ] Any security vulnerability (audit trail, plugin sandbox)

**Decision Maker**: VP Engineering + Product Lead

### Phase 2 → Phase 3 Gate (Sept 30, 2026)

Same criteria as Phase 1, PLUS:
- [ ] Conductor adapter passes POC validation
- [ ] Multi-language SDK (≥2 languages) mature
- [ ] Cost model approved by finance

---

## Key Milestones (Quarterly)

```
Q1 2026 (Phase 1)
  Week 1-2:  Contracts finalized; engine core impl starts
  Week 3-4:  Interpreter workflow; observability baseline
  Week 5-6:  Determinism tooling + CI gating
  Week 7-8:  MVP release; 5 beta customers
  
Q2 2026 (Phase 2 start)
  Week 1-4:  Conductor POC + DSL generator
  Week 5-8:  Multi-language SDK (Python, Go)
  Week 9-12: Integration tests; parity matrix validated
  
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

## References

- [IWorkflowEngine Contract](../contracts/engine/IWorkflowEngine.v1.md)
- [ExecutionSemantics Contract](../contracts/engine/ExecutionSemantics.v1.md)
- [TemporalAdapter Spec](../adapters/temporal/TemporalAdapter.spec.md)
- [Observability Guide](../ops/observability.md)
- [Incident Response Runbook](../ops/runbooks/incident_response.md)

