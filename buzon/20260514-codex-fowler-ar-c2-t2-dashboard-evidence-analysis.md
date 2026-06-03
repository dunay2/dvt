---
title: Fowler analysis - AR-C2-T2 dashboard evidence
status: Active
owner: Runtime / SRE / Docs
last_reviewed: 2026-05-14
---

# Fowler analysis - AR-C2-T2 dashboard evidence

## Task

`AR-C2-T2` asks for dashboard wiring evidence for every mapped AR-C2 signal.
The active task target is: each mapped AR-C2 signal is represented by a
dashboard panel with evidence reference and owner attribution.

## Root opportunity

The problem is not missing metric emission. The hard-cut Prometheus slice
already aligned emitted names around `_seconds` metrics. The remaining gap is
operational proof: DVT has a canonical metric-to-panel mapping, but no immutable
dashboard snapshot is available in the repository or local environment.

Fowler opportunity classification:

| Signal                                                                                  | Classification       | Response                                                                             |
| --------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------ |
| Docs name expected panels while no panel artifact is attached                           | Documentation drift  | Keep the mapping as target truth, but mark execution evidence missing.               |
| A human could mark rows complete by hand                                                | Hidden authority     | Require immutable dashboard metadata through the collector.                          |
| Passing metric tests could be mistaken for dashboard proof                              | Test-only confidence | Keep `ops:ar-c2:evidence -- --require-dashboard-alert-evidence` as the closure gate. |
| Metric names changed from `_ms` to `_seconds` while a collector test still used old IDs | Duplicate semantics  | Align the test snapshot with canonical mapping-owned metric IDs.                     |

## Mature-system comparison

Mature Prometheus/Grafana operations treat dashboards as versioned operational
assets or immutable exports. The dashboard evidence owner is not the code module
that emits metrics; it is the operations evidence gateway that can prove panel
presence, query expression, capture timestamp, reviewer, environment, and
immutable reference.

The repository already has the right gateway shape:

- `AR_C2_DASHBOARD_SNAPSHOT_FILE` supplies dashboard metadata.
- `AR_C2_ALERT_SNAPSHOT_FILE` supplies alert metadata.
- `pnpm ops:ar-c2:evidence -- --require-dashboard-alert-evidence` fails closed
  until every mapped panel and alert rule has complete immutable metadata.

## Planning matrix

| Scenario                                                               | Opportunity                           | Fowler pattern                            | DDD owner                    | Command/query rail                     | Implementation surfaces                                                                     | Unit or package test      | Architecture test                                                      | User-flow test                              | Out of scope                                      |
| ---------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------- | ---------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------- |
| Operator needs proof that every AR-C2 signal is visible in a dashboard | Documentation drift, hidden authority | Gateway + Published Interface             | Runtime/SRE evidence gateway | existing `ops:ar-c2:evidence` command  | `docs/runbooks/ar-c2-dashboard-alert-wiring-evidence-20260404.md`, generated AR-C2 evidence | none; no runtime behavior | `node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs` | none; external dashboard system not present | creating fake dashboard URLs or Grafana config    |
| Collector sustained-window test still used old `_ms` metric IDs        | Duplicate semantics                   | Replace local synonym with canonical name | AR-C2 mapping source         | existing `ops:ar-c2:evidence` command  | `tools/ops/ar-c2-evidence-collector.architecture.test.mjs`                                  | red/green collector test  | same collector architecture test                                       | none                                        | changing runtime telemetry                        |
| Planning needs honest task posture after the evidence run              | Test-only confidence                  | Explicit status model                     | Planning DB task lifecycle   | `pnpm planning:db:operate task update` | planning DB local overlay and closeout docs                                                 | planning DB query check   | `pnpm planning:db:query task-trace AR-C2-T2`                           | none                                        | marking `AR-C2-T2` done without external snapshot |

## Current execution result

Command:

```bash
pnpm ops:ar-c2:evidence -- --require-dashboard-alert-evidence
```

Result:

- generated `docs/runbooks/ar-c2-evidence-generated-latest.md`
- failed with `AR-C2_IMMUTABLE_EVIDENCE_MISSING`
- missing dashboard panels: `9`
- missing alert rules: `11`

This result is correct. It proves the gate is enforcing operational evidence
instead of accepting documentation-only claims.

## Decision

Do not mark `AR-C2-T2` complete in this slice. Record that dashboard evidence is
blocked on an external immutable dashboard snapshot and keep the collector gate
as the authority for closure.
