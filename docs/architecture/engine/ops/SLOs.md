# Service Level Objectives (SLOs)

**Audience**: SRE, platform engineers, engineering leads
**Scope**: SLO targets, error budgets, and measurement strategy
**Status**: Phase 1 MVP (informative, evolving)
**Updated**: 2026-02-15
**References**: [observability.md](./observability.md), [severity_matrix.md](./runbooks/severity_matrix.md), [incident_response.md](./runbooks/incident_response.md)

---

## 1) Control-Plane SLOs

These SLOs cover the DVT engine and its internal subsystems. They exclude data-warehouse execution time.

| Subsystem  | Metric                           | Target               | Measurement                               | Notes                        |
| ---------- | -------------------------------- | -------------------- | ----------------------------------------- | ---------------------------- |
| API        | RunRequest → plan persisted      | p99 < 300 ms         | Latency from API call to StateStore write | Excludes data warehouse time |
| API        | State update → UI refresh        | p99 < 1 s            | Projection latency                        | Real-time dashboard          |
| Engine     | PAUSE signal → no new activities | p99 < 1 s            | Temporal-native responsiveness            | Draining semantics           |
| StateStore | Write latency                    | p99 < 10 ms          | Single event write                        | Idempotent upsert            |
| StateStore | Projection lag                   | < 50 events OR < 1 s | Event sourcing catch-up                   | Alert if > 100 events        |
| EventBus   | Outbox delivery                  | p99 < 5 s            | At-least-once guarantee                   | Includes retries             |

### Prometheus queries

```promql
# API: RunRequest → plan persisted (p99)
histogram_quantile(0.99, rate(dvt_run_completion_duration_seconds_bucket[5m]))

# StateStore: write latency (p99)
histogram_quantile(0.99, rate(dvt_statestore_write_duration_ms_bucket[5m]))

# StateStore: projection lag
dvt_projection_lag_events

# Engine: signal processing latency (p99)
histogram_quantile(0.99, rate(dvt_signal_processing_duration_ms_bucket[5m]))
```

---

## 2) Data-Plane SLOs (Informative)

These are **informative**, not contractual. Actual latency depends on the warehouse provider and cluster sizing.

| Step Type   | Small (< 1 K rows) | Medium (1-100 K) | Large (> 100 K) | Notes                         |
| ----------- | ------------------ | ---------------- | --------------- | ----------------------------- |
| dbt         | p99 < 30 s         | p99 < 2 m        | p99 < 10 m      | Warehouse compute, not engine |
| Spark       | p99 < 5 m          | p99 < 20 m       | p99 < 1 h       | Cluster size dependent        |
| Custom task | Varies             | Varies           | Varies          | User-defined timeout          |

> **Note**: Data-plane SLOs are measured but NOT alertable by the engine. The engine tracks `dvt_step_duration_seconds` and delegates timeout enforcement to the adapter.

---

## 3) System-Level SLOs

| Objective                    | Target  | Window  | Alert Threshold     |
| ---------------------------- | ------- | ------- | ------------------- |
| Availability (control plane) | 99.5 %  | 30 d    | < 99 % (4 h window) |
| Error rate (engine)          | < 0.1 % | 30 d    | > 1 % (10 m window) |
| Completion latency (p99)     | 5 s     | 30 d    | 30 s (5 m window)   |
| Pause latency (p99)          | 1 s     | 30 d    | 5 s (5 m window)    |
| Projection gap detection     | 0 gaps  | 30 d    | > 0 (1 m window)    |
| Runs completed/day           | 50,000+ | Phase 1 | —                   |

Phase 3 target: 500,000+ runs/day.

---

## 4) Error Budget Policy

### Budget calculation

```
Availability target: 99.5 %
Monthly minutes:     43,200 (30 days)
Allowed downtime:    216 minutes / month (3 h 36 m)
```

### Rules

1. **Normal operation**: Feature releases proceed as planned.
2. **Budget at 50 %** before mid-period: Raise advisory; reduce risky deployments.
3. **Budget exhausted**: Freeze feature releases. All engineering effort focuses on reliability until budget recovers.
4. **Review cadence**: Monthly in SRE standup; quarterly in engineering all-hands.

### Budget tracking example

```
Q1 2026 (January–March):
  Total budget:     648 minutes (3 months × 216 min)
  [Week 1] Adapter upgrade:          12 minutes
  [Week 3] StateStore write issue:    8 minutes
  Consumed:          20 minutes (3.1 %)
  Remaining:        628 minutes
  Burn rate:         ~2.5 min/week → on track
```

---

## 5) SLO Review Process

### Monthly

- Review actual SLO performance vs targets.
- Update burn-rate calculations.
- Adjust alert thresholds if false-positive rate > 5 %.

### Quarterly

- Compare SLO targets against real workload data.
- Propose target adjustments (tighter or relaxed) based on capacity.
- Update data-plane informative SLOs with new benchmark data.

### On incident

- After every Sev0/Sev1 incident, evaluate whether SLO targets need revision.
- Document findings in postmortem → feed back into this document.

---

## 6) Cost Per Run (Baseline)

| Component | Phase 1 Target | Notes                          |
| --------- | -------------- | ------------------------------ |
| Compute   | < $0.005       | Engine + adapter overhead only |
| Storage   | < $0.003       | Event log + snapshot writes    |
| Network   | < $0.002       | Inter-service communication    |
| **Total** | **< $0.01**    | Excludes warehouse compute     |

> Cost per run is tracked via `dvt_run_cost_estimate` (Phase 2 metric) and will be refined as real production data becomes available.

---

## References

- [observability.md](./observability.md) — Metrics, traces, alerts, dashboards
- [severity_matrix.md](./runbooks/severity_matrix.md) — Severity definitions and escalation
- [incident_response.md](./runbooks/incident_response.md) — Step-by-step incident procedures
- [engine-phases.md](../roadmap/engine-phases.md) — Phase roadmap and success criteria
