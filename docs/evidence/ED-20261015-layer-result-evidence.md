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
  - packages/@dvt/adapter-temporal/test/runPlanWorkflow.layerResults.test.ts
  - packages/@dvt/adapter-temporal/test/helpers/integration/layerResultEvidenceCases.ts
  - packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
evidence:
  tests:
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

The [preimplementation plan](https://github.com/dunay2/dvt/issues/3207#issuecomment-6194952698)
contains the current/solution diagrams, Fowler rationale, negative cases and
allowed surfaces. Planning DB design `GH-3207-COMPLETE-LAYER-RESULTS` references
StartRun, without creating a parallel command. Its source documents are
ADR-0003, ADR-0004, ADR-0047, ExecutionSemantics.v1, RunEvents.v1 and the
[Temporal component guide](../architecture/components/engine/adapters/temporal/temporal-planref-workflow-boundary.md).
Command/query rail governance and Fowler opportunity planning govern the slice.

## Root Cause And Change

The layer executor had already collected the activities' results, but the result
applier returned on the first failure. Later confirmed successes and failures
therefore disappeared from the canonical event log. Recording a step outcome and
settling global failure now happen separately, within the existing applier.

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
- The complete adapter unit suite passes: 29 files, 252 tests. Type checking
  includes production and test TypeScript. Scoped ESLint, architecture dependency
  checks and both determinism checks pass.
- Explicit integration preparation passes. The focused real Temporal command
  (`vitest run test/integration.time-skipping.test.ts -t 'confirmed layer evidence'
--maxWorkers=1 --no-file-parallelism`) passes three cases. Each injects a failure
  in a different position, checks persisted sibling events, rejects downstream
  execution and replays the fetched history with Worker.runReplayHistory.
- The separate transformation integration suite passes both success and permanent
  failure cases. These use the existing controlled executor; they do not publish
  real PostgreSQL tables.
- On Windows the complete integration command passes 16 tests, but fails the pre-existing
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
  tested code snapshot is `dfe05df0b`; subsequent changes are evidence and indexes.
  The existing time-skipping service's heartbeat-capability warning is not a
  heartbeat-conformance claim.
- Contract fixture validation passes 25 checks. It reports an existing missing
  glossary source, which is not validated. Golden validation matches three
  implemented paths, preserves two deprecated baselines and skips the existing
  unimplemented retry fixture. Both workflow-routed JSON schemas compile using
  the workflow's AJV settings; its existing URI-format warning remains.

The full-diff ARC evaluator selects ARC-2 with evidence/risk and
lint/test/schema-validate/contract-golden requirements. Hook-normalized prepush,
final integration evidence, exact-SHA mechanization and review results belong on
the implementation PR and governing issue; they are not inferred from this file.

## Rollout, Limits And Integrity

Event/activity ordering changes. Deploy only through the existing
[drained cutover runbook](../runbooks/temporal-planref-drained-cutover-20260427.md).
Replaying newly produced histories does not prove compatibility with histories
produced by the old early-return behavior. This slice does not deploy a worker,
drain a shared queue, delete history or reset any Run.

The integration uses a real Temporal service, the existing in-memory test event
store and a controlled activity runner. It does not prove PostgreSQL publication,
multi-output authorization, global output collection, explicit Sink execution or
bounded concurrency. Those proposed remediation cuts remain open; #3207 and
the broader runtime acceptance issues are not closed by this prerequisite.

No new debt, production stub, placeholder, hidden compatibility branch, disabled
rule or bypassed hook is introduced. The existing environment failure and skipped
legacy fixtures are explicit above. The rollout risk is recorded separately in
[R-20261015-layer-result-evidence](../risk-register/R-20261015-layer-result-evidence.md).
