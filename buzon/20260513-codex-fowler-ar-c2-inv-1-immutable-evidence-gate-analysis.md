---
title: AR-C2 INV-1 Immutable Evidence Gate Fowler Analysis
status: Accepted
owner: Runtime / SRE / Docs
last_reviewed: 2026-05-13
---

# Fowler architecture analysis - AR-C2 INV-1 immutable evidence gate

## Fowler reading

`AR-C2` already has emitted metrics, canonical SLA mapping, and generated
evidence output. The remaining architectural weakness is hidden authority:
planning status can still be read as closable while dashboard and alert evidence
rows remain `missing_panel` or `missing_alert`.

From a Fowler perspective, the useful refactoring is **Introduce Assertion** at
the operational evidence boundary. The collector should not only render a
status artifact; it should expose a closure gate that fails closed when immutable
dashboard and alert proof is missing.

## Mature-system comparison

Mature SRE systems separate three concerns:

- signal production: runtime metrics are emitted by code;
- observability wiring: dashboards and alert rules bind those metrics to
  operator surfaces;
- closure evidence: release or planning gates prove the wiring exists before a
  system is declared operationally complete.

The current DVT implementation has signal production and a generated evidence
artifact. `AR-C2-INV-1` moves the closure model closer to mature systems by
making the evidence artifact enforceable instead of merely descriptive.

## Improved patterns

- The existing canonical mapping avoids duplicate signal names.
- The collector already normalizes dashboard, alert, and metrics snapshots into
  one generated artifact.
- This slice strengthens the collector as the single operational evidence rail
  for dashboard and alert closure.

## Antipatterns detected

- Hidden authority: task status could imply closure even when generated evidence
  still reports missing panels and alerts.
- Test-only confidence: existing checks can prove docs shape without proving
  closure semantics.
- Documentation drift: manuals say no closure without evidence, but the command
  rail does not yet fail when evidence is absent.

## Repetitions and drift

The docs repeat the same invariant across the runbook, manuals, and closeout.
That repetition is acceptable only if one executable gate owns the decision. The
collector is the right owner because it already owns the generated evidence
artifact.

## Grouping opportunities

The AR-C2 evidence material groups naturally as an engine operations component:
mapping source, collector, generated evidence artifact, closeout gate, and user
stories. Component-level docs should make the public API, invariants,
transitions, and consumers explicit.

## Future teachings

- Operational closure should fail closed on missing evidence, not rely on review
  memory.
- Generated evidence artifacts should have a corresponding assertion mode when
  they become release or planning gates.
- Planning tasks that mention immutable proof should identify the artifact and
  command that own proof semantics before status changes are made.
