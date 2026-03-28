# Severity Matrix

**Audience**: On-call SRE, engineering leads, incident commanders
**Scope**: Severity definitions, alert mapping, escalation policy
**Status**: Phase 1 MVP (informative, evolving)
**Updated**: 2026-02-15
**References**: [SLOs.md](../SLOs.md), [observability.md](../observability.md), [incident_response.md](./incident_response.md)

---

## 1) Severity Definitions

| Severity | Description                           | Response Time | Impact                                     |
| -------- | ------------------------------------- | ------------- | ------------------------------------------ |
| **Sev0** | Total outage, no workaround           | 15 min        | All users affected, data at risk           |
| **Sev1** | Major degradation, partial workaround | 1 hour        | Significant user impact, SLO breach likely |
| **Sev2** | Minor degradation, workaround exists  | 4 hours       | Limited user impact, within SLO budget     |
| **Sev3** | Cosmetic issue, no user impact        | 2 days        | No functional impact                       |

---

## 2) Severity Examples

### Sev0 — Total Outage

- API down (health check fails for all endpoints)
- Database unavailable (StateStore unreachable)
- All runs failing (100 % error rate)
- Data corruption detected (snapshot hash mismatch)

**Owner**: On-call SRE + Engineering lead (joint command)

### Sev1 — Major Degradation

- Single adapter down (e.g. Temporal offline, but Conductor available)
- Projection lag > 5 minutes (stale dashboard data)
- Error rate > 1 % sustained
- Signal processing latency > 5 s (PAUSE/CANCEL delayed)
- Outbox delivery failure (events not reaching consumers)

**Owner**: On-call SRE

### Sev2 — Minor Degradation

- Single worker pod down (auto-recovery expected)
- Error rate between 0.1 % and 1 %
- Latency spike (p99 > 2x SLO for < 10 m)
- Disk space below 20 %
- Plugin sandbox memory pressure (single tenant)

**Owner**: SRE during business hours

### Sev3 — Cosmetic / Non-Functional

- Dashboard metric missing or stale
- Log noise (excessive debug output)
- Flaky test (fails > 10 % of runs)
- Documentation out of date

**Owner**: Engineering team (next sprint)

---

## 3) Alert → Severity Mapping

| Alert                    | Severity | Trigger Condition                              | Runbook                                                    |
| ------------------------ | -------- | ---------------------------------------------- | ---------------------------------------------------------- |
| `APIDown`                | Sev0     | API health check fails 3x in 1 min             | [incident_response.md](./incident_response.md)             |
| `StateStoreUnavailable`  | Sev0     | StateStore write failures for > 2 min          | [incident_response.md](./incident_response.md)             |
| `DataCorruption`         | Sev0     | Snapshot hash mismatch detected                | [incident_response.md](./incident_response.md)             |
| `AdapterHeartbeatLost`   | Sev1     | Adapter unhealthy > 5 min                      | [incident_response.md](./incident_response.md) (Section 1) |
| `ProjectionGapDetected`  | Sev1     | Lag > 100 events OR > 5 min                    | [incident_response.md](./incident_response.md) (Section 2) |
| `OutboxDeliveryFailure`  | Sev1     | Outbox delivery latency > 30 s sustained 5 min | [incident_response.md](./incident_response.md) (Section 3) |
| `HighErrorRate`          | Sev2     | > 0.1 % error rate sustained 10 min            | [incident_response.md](./incident_response.md) (Section 4) |
| `LatencySpike`           | Sev2     | p99 > 2x SLO for 5 min                         | [incident_response.md](./incident_response.md) (Section 5) |
| `DiskSpaceLow`           | Sev2     | < 20 % free space on any node                  | Ops: expand volume or clean up                             |
| `WorkerPodDown`          | Sev2     | Worker pod not ready > 5 min                   | Ops: `kubectl describe pod`, check node health             |
| `PluginSandboxMemory`    | Sev2     | Plugin memory > 80 % of sandbox limit          | Ops: identify tenant, check plugin logs                    |
| `TestFlaky`              | Sev3     | Test fails > 10 % of CI runs                   | Engineering: stabilize or quarantine test                  |
| `DashboardMetricMissing` | Sev3     | Grafana panel shows no data > 1 h              | Ops: check Prometheus target, scrape config                |
| `LogNoise`               | Sev3     | Log volume > 5x baseline for 30 min            | Engineering: adjust log level or filter                    |

---

## 4) Escalation Policy

### Notification channels

| Severity | Channel           | Timing                                       |
| -------- | ----------------- | -------------------------------------------- |
| **Sev0** | PagerDuty page    | Immediate (24/7)                             |
| **Sev1** | PagerDuty + Slack | Business hours; page if unacknowledged > 2 h |
| **Sev2** | Slack #ops-alerts | Business hours; ticket created automatically |
| **Sev3** | Jira backlog      | Next sprint grooming                         |

### Escalation timeline

```
Sev0:
  T+0 min   → Page on-call SRE
  T+15 min  → Page engineering lead (if not acknowledged)
  T+30 min  → Page VP Engineering
  T+60 min  → Executive notification

Sev1:
  T+0 min   → Slack alert + PagerDuty (business hours)
  T+2 hours → Page on-call SRE (if unacknowledged)
  T+4 hours → Page engineering lead

Sev2:
  T+0 min   → Slack alert + Jira ticket
  T+4 hours → Assign to SRE on-call (if unresolved)
  T+24 hours → Escalate to engineering lead

Sev3:
  T+0       → Jira ticket created
  Next sprint grooming → Prioritize and assign
```

---

## 5) Incident Lifecycle

```
Detection → Triage → Severity Assignment → Response → Mitigation → Resolution → Postmortem
```

### Triage checklist

1. **Identify scope**: How many users/tenants affected?
2. **Check SLO impact**: Is the error budget being consumed?
3. **Assign severity**: Use the matrix in Section 1.
4. **Notify**: Follow escalation policy (Section 4).
5. **Start runbook**: Follow the linked runbook from Section 3.

### Postmortem requirements

| Severity | Postmortem Required | Timeline    | Audience                   |
| -------- | ------------------- | ----------- | -------------------------- |
| Sev0     | Yes (mandatory)     | Within 48 h | Engineering all-hands      |
| Sev1     | Yes (mandatory)     | Within 5 d  | SRE team + affected squads |
| Sev2     | Optional            | Within 10 d | SRE team                   |
| Sev3     | No                  | —           | —                          |

---

## 6) SLO ↔ Severity Relationship

Severity levels are directly tied to [SLO targets](../SLOs.md):

| SLO Breach                          | Severity | Rationale                          |
| ----------------------------------- | -------- | ---------------------------------- |
| Availability < 99 % (4 h window)    | Sev0     | Control plane effectively down     |
| Completion latency p99 > 30 s (5 m) | Sev1     | Major degradation, runs stalling   |
| Error rate > 1 % (10 m window)      | Sev1     | Significant user-facing failures   |
| Projection lag > 100 events (5 m)   | Sev1     | Stale data for dashboards and APIs |
| Error rate 0.1-1 % (10 m window)    | Sev2     | Within budget but needs attention  |
| Pause latency p99 > 5 s (5 m)       | Sev2     | Signal processing degraded         |

---

## References

- [SLOs.md](../SLOs.md) — Service level objectives and error budgets
- [observability.md](../observability.md) — Metrics, traces, alerts, dashboards
- [incident_response.md](./incident_response.md) — Step-by-step incident procedures
- [engine-phases.md](../../roadmap/engine-phases.md) — Phase roadmap and success criteria
