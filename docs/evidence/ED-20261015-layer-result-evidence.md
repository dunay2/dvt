---
title: Confirmed layer outcomes before run failure
status: final
date: 2026-10-15
owners:
  - '@dvt/adapter-temporal'
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.layerResults.ts
  - packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow.lifecycle.ts
  - packages/@dvt/adapter-temporal/test/runPlanWorkflow.layerResults.test.ts
  - packages/@dvt/adapter-temporal/test/runPlanWorkflow.failureFallback.test.ts
  - packages/@dvt/adapter-temporal/test/helpers/integration/layerResultEvidenceCases.ts
  - packages/@dvt/adapter-temporal/test/helpers/integration/layerPublicationFailureCases.ts
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
  - packages/@dvt/run-domain/src/applyRunEvent.ts
  - packages/@dvt/run-domain/test/applyRunEvent.failure.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/run-domain test --maxWorkers=1 --no-file-parallelism
    - pnpm --filter @dvt/run-domain typecheck
    - pnpm exec eslint packages/@dvt/run-domain/src packages/@dvt/run-domain/test
    - pnpm traceability:adr0
    - pnpm --filter @dvt/adapter-temporal test --maxWorkers=1 --no-file-parallelism
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm exec eslint packages/@dvt/adapter-temporal/src packages/@dvt/adapter-temporal/test
    - pnpm --filter @dvt/adapter-temporal prepare:integration
    - pnpm --filter @dvt/adapter-temporal run test:integration --maxWorkers=1 --no-file-parallelism
    - pnpm --filter @dvt/adapter-temporal run test:integration:transformation --maxWorkers=1 --no-file-parallelism
    - pnpm arch:deps
    - pnpm lint:determinism
    - node tools/ci/check-determinism.mjs
    - pnpm validate:contracts
    - pnpm golden:validate
    - node scripts/compare-hashes.cjs
---

# Confirmed Layer Outcomes Before Run Failure

## Governed Claim

The existing StartRun rail records every confirmed outcome in a completed layer
before emitting its one global RunFailed event. The first failure in plan order
still supplies the global diagnostic. No later layer runs after that failure.
Successful sibling evidence remains on StepCompleted; a failed Run does not gain
the success-only global materialization field.

If canonical event publication fails, the provider failure propagates without a
substitute RunFailed over an incomplete event history. This is not recovery of
the unacknowledged events or a claim that the canonical Run has completed.

The [preimplementation plan](https://github.com/dunay2/dvt/issues/3207#issuecomment-6194952698)
contains the current/solution diagrams, Fowler rationale, negative cases and
allowed surfaces. Planning DB design `GH-3207-COMPLETE-LAYER-RESULTS-V2` references
StartRun, without creating a parallel command. Its source documents are
ADR-0003, ADR-0004, ADR-0047, ExecutionSemantics.v1, RunEvents.v1 and the
[Temporal component guide](../architecture/components/engine/adapters/temporal/temporal-planref-workflow-boundary.md).
Command/query rail governance and Fowler opportunity planning govern the slice.
The [review amendment](https://github.com/dunay2/dvt/issues/3207#issuecomment-6195943732)
and Planning DB design `GH-3207-EVENT-PUBLICATION-FAILURE` admit the workflow-root
failure case before its RED tests and implementation.
The [projection amendment](https://github.com/dunay2/dvt/issues/3207#issuecomment-6196610762)
and design `GH-3207-FIRST-FAILURE-PROJECTION` admit the shared read-model correction
before its RED tests; the owner is `SYS-RUNTIME-RUN-DOMAIN`, not an API/UI copy.

## Root Cause And Change

The layer executor had already collected the activities' results, but the result
applier returned on the first failure. Later confirmed successes and failures
therefore disappeared from the canonical event log. Recording a step outcome and
settling global failure now happen separately, within the existing applier.

Review found a second path: an outcome append rejection escaped the applier but
the workflow's general catch still attempted RunFailed. The existing lifecycle
failure policy now distinguishes Temporal's typed emitEvent ActivityFailure;
it does not infer failure identity from text or duplicate publication state.

A second review found the shared projection overwrote its failure summary for
each sibling, disagreeing with the terminal event's first-failure diagnostic.
The existing setter now retains that first summary while preserving every step
transition and the existing new-StepStarted reset boundary, including retry.

No new result store, service, scheduler, publication mechanism or aggregate is
introduced. The latest-result field remains a summary, not a collection.
The production diff removes more lines than it adds. Unit cases and the real
Temporal cases have separate, single-concern files; the existing integration
entry point only registers the new cases.

## RED/GREEN And Validation

- Against the original implementation, the focused unit matrix failed six cases
  and passed two. Missing later sibling events and premature global termination
  were reproduced. A fixture setup error was corrected before this RED result.
- After the change, all eight focused cases pass, including append rejection,
  multiple failures, counters, retained gateway facts and empty layers.
- Review RED reproduced a substitute terminal in one unit case and both real
  workflow cases: permanent append rejection and exhaustion of three attempts.
  The complete workflow boundary is exercised, not just the result helper.
  GREEN passes all 11 focused unit cases and both real workflow/replay cases.
- The complete adapter unit suite passes: 30 files, 255 tests. Type checking
  includes production and test TypeScript. Scoped ESLint, architecture dependency
  checks and both determinism checks pass.
- ADR-0000 traceability passes after adding the required baselines, decisions and
  versions to the new test surfaces. Its initial CI rejection is corrected, not
  suppressed or added to a regression baseline.
- Explicit integration preparation passes. The focused real Temporal command
  (`vitest run test/integration.time-skipping.test.ts -t 'confirmed layer evidence'
--maxWorkers=1 --no-file-parallelism`) passes three cases. Each injects a failure
  in a different position, checks persisted sibling events, rejects downstream
  execution and replays the fetched history with Worker.runReplayHistory.
- The separate transformation integration suite passes both success and permanent
  failure cases. These use the existing controlled executor; they do not publish
  real PostgreSQL tables.
- Before the review amendment, the Windows complete integration command passes
  16 tests, but fails the pre-existing
  full-server retained-identity suite before its two assertions: Windows denies
  downloading its ephemeral server executable. This is an environment failure,
  not a passing suite. The time-skipping file passes all 12 cases and the
  retransmission file passes all three cases.
- A disposable Linux Node 22.19.0 container tests the committed code snapshot,
  without a host workspace mount or shared service access. The initial filtered
  dependency installation omitted the test-only DBT plugin's dependencies and
  failed collection. Full `pnpm install --frozen-lockfile` supplies the repository
  test environment without changing its lockfile or installation policy.
- After full installation and canonical preparation, the complete integration
  command passes all three files and 18 tests in Linux, with no skipped tests.
  This includes the two retained-identity assertions blocked on Windows. The
  tested initial code snapshot was `dfe05df0b`.
  The existing time-skipping service's heartbeat-capability warning is not a
  heartbeat-conformance claim.
- With the review amendment, all 14 time-skipping cases and both transformation
  integration cases pass on Windows, including native cancellation, signal
  cancellation, continue-as-new and worker restart. The retained-identity cases
  still require the isolated Linux environment noted above.
- The full Linux integration suite was rerun after updating its snapshot to the
  hook-normalized runtime and tests in `0faee0f06`: all three files and 20 tests
  pass, with zero skipped tests. This fresh run covers the amendment, including
  both rejected-publication histories, retained identity and retransmission.
- Contract fixture validation passes 25 checks. It reports an existing missing
  glossary source, which is not validated. Golden validation matches three
  implemented paths, preserves two deprecated baselines and skips the existing
  unimplemented retry fixture. Both workflow-routed JSON schemas compile using
  the workflow's AJV settings; its existing URI-format warning remains.
- Projection RED reproduces last-failure overwrite in its focused unit case and
  a real Temporal case with two failed siblings. The latter rebuilds actual
  emitted events through the production engine SnapshotProjector, not the test
  store's simplified status projector. A prior over-specific test-name filter
  selected no cases; it is not RED or GREEN evidence.
- The run-domain suite passes 81 tests. Its production typecheck and an explicit
  strict typecheck of the new test pass after correcting the test snapshot's
  required schemaVersion. The four affected engine projection/status/store
  suites pass 71 tests.
- With the projection correction, the real Temporal time-skipping and
  transformation files pass all 17 cases on Windows, including the four
  mixed-outcome histories rebuilt through the production projector and replayed.

The full-diff ARC evaluator selects ARC-2 with evidence/risk and
lint/test/schema-validate/contract-golden requirements. Hook-normalized prepush,
final integration evidence, exact-SHA mechanization and review results belong on
the implementation PR and governing issue; they are not inferred from this file.

## Rollout, Limits And Integrity

Event/activity ordering changes. Deploy only through the existing
[drained cutover runbook](../runbooks/temporal-planref-drained-cutover-20260427.md).
The user explicitly selected a development cutover without old-history
compatibility on 2026-10-15. Replaying newly produced histories does not prove
compatibility with histories produced by the old early-return behavior. This
slice does not deploy a worker,
drain a shared queue, delete history or reset any Run.

The integration uses a real Temporal service, the existing in-memory test event
store and a controlled activity runner. It does not prove PostgreSQL publication,
multi-output authorization, global output collection, explicit Sink execution or
bounded concurrency. Those proposed remediation cuts remain open; #3207 and
the broader runtime acceptance issues are not closed by this prerequisite.

No new debt, production stub, placeholder, hidden compatibility branch, disabled
rule or bypassed hook is introduced. The existing environment failure and skipped
legacy fixtures are explicit above. The rollout risk is recorded separately in
[R-20261015-layer-result-evidence](../risk-register/temporal-layer-result-evidence-20261015.md).
