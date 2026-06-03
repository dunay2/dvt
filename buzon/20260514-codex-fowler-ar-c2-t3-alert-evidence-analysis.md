---
title: Fowler analysis - AR-C2-T3 alert evidence
status: Active
owner: Runtime / SRE / Docs
last_reviewed: 2026-05-14
---

# Fowler analysis - AR-C2-T3 alert evidence

## Task

`AR-C2-T3` asks for alert wiring evidence for AR-C2 SLA thresholds and routing
posture. The target is not metric emission and not threshold text. The target is
proof that every mapped AR-C2 threshold has an active alert rule, severity, and
routing target backed by immutable monitor configuration evidence.

## Root opportunity

The repository has canonical AR-C2 threshold keys and PromQL starter queries,
but no immutable alert snapshot or monitor-config-as-code source is available
for AR-C2 alert rules. Treating SLA text as alert wiring would create hidden
authority: a document would become the apparent alert source without proving any
deployed rule.

Fowler opportunity classification:

| Signal                                                                | Classification       | Response                                                                                 |
| --------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| SLA runbook defines thresholds but no alert rule artifact is attached | Documentation drift  | Keep the threshold mapping as target truth and record alert evidence as missing.         |
| A reviewer could hand-fill alert rows from runbook text               | Hidden authority     | Require `AR_C2_ALERT_SNAPSHOT_FILE` or immutable config reference through the collector. |
| Metric and dashboard evidence could be mistaken for alertability      | Test-only confidence | Keep `--require-dashboard-alert-evidence` fail-closed until alert rules are complete.    |
| Alert naming can diverge from canonical threshold keys                | Duplicate semantics  | Preserve `ar-c2.<panel-key>.<severity>` as the only accepted alert identity.             |

## Mature-system comparison

Mature Prometheus/Alertmanager or Grafana-managed alert systems keep alert rules
as versioned config, immutable exports, or API snapshots. A threshold is not
operationally enforceable until the evidence includes:

- alert rule id,
- exact expression,
- duration window,
- severity,
- routing target,
- config source or immutable export,
- capture timestamp,
- reviewer.

The existing `ops:ar-c2:evidence` rail already models this correctly through
`AR_C2_ALERT_SNAPSHOT_FILE` and `rules[]` metadata.

## Planning matrix

| Scenario                                                                  | Opportunity                           | Fowler pattern                | DDD owner                    | Command/query rail                     | Implementation surfaces                                                                     | Unit or package test      | Architecture test                                                      | User-flow test                             | Out of scope                                   |
| ------------------------------------------------------------------------- | ------------------------------------- | ----------------------------- | ---------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| Operator needs proof that every AR-C2 threshold pages or routes correctly | Documentation drift, hidden authority | Gateway + Published Interface | Runtime/SRE evidence gateway | existing `ops:ar-c2:evidence` command  | `docs/runbooks/ar-c2-dashboard-alert-wiring-evidence-20260404.md`, generated AR-C2 evidence | none; no runtime behavior | `node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs` | none; external alerting system not present | creating fake Alertmanager/Grafana rule IDs    |
| Planning needs honest task posture after alert evidence check             | Test-only confidence                  | Explicit status model         | Planning DB task lifecycle   | `pnpm planning:db:operate task update` | planning DB local overlay and closeout docs                                                 | planning DB query check   | `pnpm planning:db:query task-trace AR-C2-T3`                           | none                                       | marking `AR-C2-T3` done without alert snapshot |

## Current execution result

Command:

```bash
pnpm ops:ar-c2:evidence -- --require-dashboard-alert-evidence
```

Result:

- failed with `AR-C2_IMMUTABLE_EVIDENCE_MISSING`
- missing dashboard panels: `9`
- missing alert rules: `11`
- alert incomplete: `none`

The alert result means the required alert rules are absent, not partially
entered. The correct status is blocked until a real alert snapshot or immutable
monitor configuration reference is attached.

## Decision

Do not mark `AR-C2-T3` complete in this slice. Record that alert evidence is
blocked on an external immutable alert snapshot and keep the collector gate as
the authority for closure.
