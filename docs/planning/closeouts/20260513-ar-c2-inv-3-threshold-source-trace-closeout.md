---
title: AR-C2 INV-3 Threshold Source Trace Closeout
status: Accepted
owner: Runtime / SRE / Docs
last_reviewed: 2026-05-13
planning_type: closeout
---

# AR-C2 INV-3 Threshold Source Trace Closeout

`AR-C2-INV-3` closes the threshold-source traceability gap in the AR-C2
observability rail. Before this slice, AR-C2 alert evidence could name a
threshold key without proving which SLA/runbook text owned the numeric threshold
and alert window.

## Governing Sources

- `docs/runbooks/api-runtime-sla-canonical-20260404.md`
- `docs/runbooks/read-your-writes-freshness-slo-20260330.md`
- `docs/runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md`
- `docs/runbooks/ar-c2-dashboard-alert-wiring-evidence-20260404.md`
- `docs/guides/ar-c2-observability-technical-manual-20260404.md`
- `docs/planning/state/agent-lane-c.yaml`

## Work Performed

- Added explicit canonical alert threshold keys to the AR-C2 signal mapping.
- Added a canonical SLA/runbook source reference for every threshold-backed
  AR-C2 alert.
- Aligned the manual alert evidence matrix with the generated threshold-key
  format (`ar-c2.<panel-key>.<severity>`).
- Extended `tools/ops/ar-c2-evidence-collector.mjs` so generated evidence
  repeats the source reference next to each threshold.
- Added a fail-closed test for missing threshold source references.

## Result

Every AR-C2 alert threshold now traces to one canonical source:

- API/runtime and delivery latency thresholds:
  `docs/runbooks/api-runtime-sla-canonical-20260404.md#current-observability-baseline`
- read-your-writes freshness thresholds:
  `docs/runbooks/read-your-writes-freshness-slo-20260330.md#contract`

No dashboard or alert wiring evidence was fabricated. The dashboard and alert
matrices still show pending rows until immutable monitor evidence exists.

## Validation

- `node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs`
- `pnpm ops:ar-c2:evidence`
- `pnpm ops:ar-c2:evidence -- --require-dashboard-alert-evidence` remains
  non-zero by design until `AR-C2-T2` and `AR-C2-T3` provide immutable monitor
  evidence. The failure now reports canonical threshold keys with their
  traceable SLA/runbook sources.

## No-Debt Evidence

- No hook was bypassed.
- No lint, type, test, or quality rule was relaxed.
- No stub, placeholder, fake monitor evidence, or fake success path was added.
- Remaining AR-C2 closure work stays owned by `AR-C2-T2`, `AR-C2-T3`,
  `AR-C2-INV-4`, and `AR-C2-INV-5`.
