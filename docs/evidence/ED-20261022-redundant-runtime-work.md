---
title: Bounded execution index reuse and final SQL serialization
status: draft
date: 2026-10-22
owners:
  - '@dvt/adapter-temporal'
  - '@dvt/postgres-projection'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/activities/activityFactory.ts
  - packages/@dvt/adapter-temporal/src/activities/executionSegmentIndexCache.ts
  - packages/@dvt/adapter-temporal/src/workflows/executionSegmentResolver.ts
  - packages/@dvt/adapter-temporal/test/activities.executionSegmentIndex.test.ts
  - packages/@dvt/postgres-projection/src/relationalSql/project.ts
  - packages/@dvt/postgres-projection/src/relationalSql/producerGraph.ts
  - packages/@dvt/postgres-projection/src/relationalSql/producerRead.ts
  - packages/@dvt/postgres-projection/test/producerGraph.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/activities.executionSegmentIndex.test.ts
    - pnpm exec vitest run packages/@dvt/postgres-projection/test/producerGraph.test.ts
    - pnpm --filter dvt-api test:unit test/application/services/previewCanvasProducerRows.test.ts
    - pnpm --filter @dvt/adapter-temporal prepare:integration
    - pnpm --filter @dvt/adapter-temporal test:integration -t "re-resolves K across continuation with no duplicated or abandoned work"
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm validate:contracts
    - pnpm exec ajv compile --spec=draft2020 --strict=false -s docs/contracts/shared/AdminRebuildSnapshotAccess.v1.schema.json
    - pnpm exec ajv compile --spec=draft2020 --strict=false -s docs/contracts/traceability/facets/openlineage/SqlJobFacet.1-0-0.schema.json
    - pnpm arch:deps
---

# Bounded Execution Index Reuse And Final SQL Serialization

## Authority And Change

[#3705](https://github.com/dunay2/dvt/issues/3705) owns the two independent cuts.
Its admission records the current/target diagram, Fowler Split Phase rationale,
allowed surfaces, authority invariants, and negative tests before implementation.
Planning DB designs and mechanization `GH-3705-VERIFIED-SEGMENT-INDEX` and
`GH-3705-AST-ONLY-COMPOSITION` reference the existing `StartRun` and
`PreviewCanvasTransformRows` rails. They introduce no parallel product intent.

Governing sources are `AGENTS.md`, the governance document inventory, AI work
protocol, command/query rail governance, Fowler governance, ADR-0001/0003/0046/0052,
the [Temporal component guide](../architecture/components/engine/adapters/temporal/temporal-planref-workflow-boundary.md),
the [Canvas catalog](../architecture/components/web/graph/canvas-workbench-command-query-catalog.md),
and `.arc-policy.yaml`. Existing SQL consumers include `PreviewPlan`, `CompilePlan`,
and `StartRun`; their public result shape remains unchanged.

`ExecutionSegmentIndexCache` retains one digest-and-scope index per activity
factory. Every request still parses its input, fetches the artifact, validates
expiry, bytes, plan identity and ownership, and only then consults that index.
The retained values are layer step positions, completed-prefix counts and scalar
concurrency/executor metadata. Fresh verified plan steps and independent result
arrays prevent a prior returned segment from becoming the next request's plan
authority. Eviction rebuilds the index through the same preparation function.
The canonical `resolveExecutionSegmentFromPlan` serves both ordinary callers and
the activity cache. Workflow payloads, cursor, activity sequence, and event order
are unchanged.

PostgreSQL projection separates AST construction from rendering. Producer
bindings contain AST and projection metadata; they do not contain optional or
placeholder SQL. The requested target is rendered once through the existing
PostgreSQL renderer, and the public async result still contains `ast`, `sql`,
`orderBy`, and `projection`. Existing closure memoization, protected dependency
admission, source scope, and selected-relation semantics remain in place.

## Validation Evidence

### RED And GREEN

- Temporal RED used `pnpm --filter @dvt/adapter-temporal exec vitest run
test/activities.executionSegmentIndex.test.ts`: 11 cases, five failing work-count
  assertions and six passing negative cases. The 24-layer chain prepared all
  layers 24 times instead of once; artifact reads remained 24 in both versions.
  Before this valid RED, a harness error returned a Mock from `beforeEach`, so
  Vitest invoked it as cleanup without arguments. The harness was corrected
  before the valid RED and before production changes; that initial error is not
  product-failure evidence.
- SQL RED used `pnpm exec vitest run
packages/@dvt/postgres-projection/test/producerGraph.test.ts`: three cases,
  one failed render-count assertion and two passes, in 3.19 seconds. The chain
  rendered three times instead of the expected once. The first invocation lost
  execution metadata and supplied no result; absence of a live process was
  checked before repeating only that file. The missing result is not a pass.
- GREEN retained the same work-count assertions and semantic/negative checks.
  SQL passed seven producer cases plus 37 focused regressions. Temporal passed
  39 focused cases. Overlapping verification reruns are not counted again.

The focused package checks passed 44 SQL cases and 39 Temporal cases. The
existing API preview consumer passed 10 cases. The single native Temporal
continuation case passed once. These are **94 distinct cases**, without adding
overlapping reruns to the total.

The real-reader activity proof checks repeated verification, resident preparation
count, A/B/A eviction, separate activity factories, fresh step/array identity,
gateway metadata, empty and invalid layers, and warm-entry denial for changed
bytes, missing artifacts, expiry and wrong tenant/project/environment. SQL proof
uses the real renderer to check one serialization, AST/SQL/metadata equality,
ordered chains with large bigint bounds, shared producers, selected relations,
input immutability, and explicit renderer/closure failures. The API consumer
retains the existing authorized preview boundary.

Canonical `pnpm --filter @dvt/adapter-temporal typecheck` passes production and
test types. `pnpm arch:deps` passes. `pnpm validate:contracts` passes 24 checks
across three fixtures; it reports the absent glossary source and optional
`golden-paths-run.json`. That result is not execution of golden paths.

Both workflow-routed JSON schemas compile with their declared drafts using the
two AJV commands above and `--strict=false`. The existing unknown `uri` format
warning remains visible. No schema or validation rule was weakened by this
slice.

### Native Continuation Proof

Canonical preparation passed for 10 packages, with nine cached. The command
selecting `re-resolves K across continuation with no duplicated or abandoned
work` passed 1/1; 31 other cases were excluded by the explicit `-t` selection.
The scenario exercised two parallel layers with K=2, continuation, no duplicated
or abandoned work, and replay of both actual histories. The case took about
42 seconds and the command about 66 seconds. These durations describe the proof
execution, not a performance comparison.

The SDK reported that the time-skipping server did not advertise
`activity_failure_include_heartbeat`. This warning accompanied a passing proof;
it is retained here and is not described as a product failure or a resolved
server capability.

### Remaining Acceptance

The full committed diff from
`bb1f47757d3b665c36e6d9a849c617080bd334dd` to
`25268ed7b30c2736ce60a87df05df79a7502990b` was classified by
`GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs` as ARC-2.
Evidence and risk are required; rollout notes and a compatibility matrix are not.
The evaluator retains lint, test, schema validation, and contract golden checks.

Remaining closeout controls, including contract golden validation, the final
exact-base/head Planning DB acceptance, and `pnpm verify:prepush` are pending at
this record's creation. The prepush plan and changed-file dry run select only
governance, formatting and lint, with no browser or test suites; the full selected
prepush gate will still need to execute. Required CI and
merge checks remain mandatory. Earlier focused passes do not establish those
results, and this draft is not an integration-ready declaration. The governing
issue and implementation PR record the final exact commit, commands and outcomes,
including the user's bounded local validation limit; this evidence snapshot does
not require rewriting itself to name its own eventual commit.

## Measured Improvement And Limits

- Layer preparation is reused while a verified identity remains resident. One
  entry per factory can be evicted by another identity; workers and new factories
  have independent indexes. There is no cross-worker once-per-run guarantee.
- Artifact reads, parsing, hashing, expiry and ownership checks persist on every
  request. No authorization result or full plan is cached.
- Initial DAG construction still performs its existing scans. Segment projection
  still scans future steps for retained gateway dependencies, and gateway
  downstream analysis remains. Total execution is not claimed to become linear.
- SQL producer composition eliminates discarded intermediate serializations;
  AST construction and the final real rendering remain. No wall-clock speedup,
  throughput gain, or Chromium reliability improvement has been measured.

The [associated risk record](../risk-register/redundant-runtime-work-20261022.md)
tracks incorrect reuse and semantic parity until final acceptance. No dependency
update, new debt, stub, placeholder, validation downgrade, hook bypass, automatic
retry, deployment, or shared-data reset is introduced by these two cuts.
