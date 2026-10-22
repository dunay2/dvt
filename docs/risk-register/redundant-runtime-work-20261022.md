---
id: R-20261022-REDUNDANT-RUNTIME-WORK
title: Derived execution reuse and SQL composition must preserve authority
status: Mitigating
date: 2026-10-22
owners:
  - adapter-temporal
  - postgres-projection
severity: High
probability: Low
---

# Derived Execution Reuse And SQL Composition Must Preserve Authority

## Risk

Reusing execution structure before authoritative verification, across an
incorrect identity, or with mutable cached steps could execute stale or
cross-scope plan material. An unbounded cache could retain plans for the lifetime
of a worker. Removing intermediate SQL serialization could change the final AST,
output ordering, selected producer result, or error propagation if composition
still depended on those discarded strings.

These are design risks for [#3705](https://github.com/dunay2/dvt/issues/3705), not
newly accepted debt or observed production regressions. Existing command/query
ownership remains `StartRun` and `PreviewCanvasTransformRows`.

## Mitigation

- Fetch and validate every artifact before index lookup, including expiry, hash,
  plan identity, and tenant/project/environment ownership. Warm state never
  grants authority or suppresses a reader failure.
- Retain exactly one index per activity factory, keyed by verified digest and
  explicit scope. Keep step positions and derived scalars, not full plans,
  mutable returned steps, or authorization decisions. Use freshly verified plan
  objects and independent output arrays for every segment.
- Preserve the existing resolver, activity payloads, layer ordering, gateway
  metadata, concurrency limit, completed-prefix count and continuation cursor.
  Eviction and another worker cause recomputation rather than a changed result.
- Compose producer AST and metadata through the existing authorized closure;
  render the final requested target exactly once. Keep the public async
  projection contract and propagate renderer errors without partial success.
- Prove negative authority paths with the real integrity validator and scoped
  reader; compare actual SQL/AST/metadata and exercise shared and selected
  producers, ordering, bigint bounds, mutation isolation, and rendering failure.
- Retain native K=2 continuation and replay evidence for both histories, plus
  the existing authorized API preview consumer. Keep mandatory acceptance checks
  and enabled hooks.

## Evidence And Residual Limits

[ED-20261022-redundant-runtime-work](../evidence/ED-20261022-redundant-runtime-work.md)
records 83 focused package cases, 10 API cases, and one native Temporal case:
94 distinct passing cases. The native command deliberately excluded 31 cases;
it does not establish a full native-suite pass. Its SDK capability warning is
recorded without being reclassified as a product defect.

The index can thrash when different plans share a worker. Reads and verification
remain per request; initial DAG scans, future-step scans and gateway downstream
analysis persist. The change therefore promises reduced deterministic work at
the measured boundaries, not linear total execution or a measured latency gain.
No cache capacity increase, retries or skipped authority checks compensate for
those remaining costs.

Final additional controls, exact-base/head Planning DB acceptance, prepush and
required CI are pending at creation of this record. The risk remains mitigating
until the governing issue records that acceptance. Code integration alone does
not authorize worker restart, deployment or shared-data cleanup.
