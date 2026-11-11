---
title: Dependency maintenance compatibility evidence
status: final
date: 2026-11-11
owners:
  - Engineering / CI
  - Web / Canvas
  - Observability
  - adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - .github/workflows/codeql.yml
  - package.json
  - pnpm-lock.yaml
  - apps/web/package.json
  - packages/@dvt/observability-otel/package.json
  - packages/@dvt/adapter-temporal/package.json
  - apps/temporal-worker/package.json
evidence:
  tests:
    - node --test tools/ci/workflow-pattern-parity.test.mjs
    - pnpm lint
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/observability-otel test
    - pnpm --filter @dvt/observability-otel typecheck
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter dvt-temporal-worker test
    - pnpm --filter dvt-temporal-worker typecheck
    - pnpm test:adapter-temporal:integration
    - pnpm test:adapter-temporal:integration:transformation
---

# Dependency maintenance compatibility evidence

## Scope and authority

[#3842](https://github.com/dunay2/dvt/issues/3842) owns the consolidation of
dependency updates from #3830, #3800, #3832, #3831, #3833 and #3802. Five precise
implementation commits retain their version pins and coherent manifests/lockfile.
A single final maintenance gate avoids repeating the global suite for each
dependency; package-specific evidence remains required. Squash merge makes the
combined candidate one rollback unit, including the CodeQL action update.

The CI execution change in #3840 remains separate to exercise its new ordinary-PR
six-group path on GitHub. This dependency/lockfile candidate selects the existing
five-group full path. Two candidates therefore validate both execution paths;
combining everything would fail to exercise the new one. No scope flags or
workflow inputs are altered to manufacture that evidence.

The governing sources are `AGENTS.md`, the governance inventory, the PR
preflight guide, ADR-0001, command/query rail governance and `.arc-policy.yaml`.
Existing runtime, Canvas and observability owners retain their contracts. There
is no new domain object, backend migration, command implementation or application
service. Dependency maintenance does not transfer observability ownership to
Engine or CI.

The evaluator on base `0cad3d819ed7686ee426fa3d6ad414ab7cad23bf` and implementation
head `e143f31e7e0ed33a12d788006e61ff28752bccc1` returned ARC-2: evidence, risk,
lint, tests, schemas and contract goldens are required. Rollout notes and a
compatibility matrix are not required. Final classification and acceptance must
use the eventual complete candidate, including this evidence and the risk update.

## Installed versions and focused proof

CodeQL's two action references move from 4.39.1 to 4.39.3, pinned to
`33d7b85da1a04171e211befe2c739303b9a4c066`. The official tag identity was checked;
all 20 `node --test tools/ci/workflow-pattern-parity.test.mjs` cases pass.
No permissions, language selection or
security routing change. Hosted analysis on the complete candidate remains
required in addition to this focused contract proof.

| Cut                   | Version change                                                                                         | Observed proof                                                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Developer tooling     | Node typings 26.6.5 to 26.6.6; ESLint 10.13 to 10.14; TypeScript ESLint parser/plugin 8.72.0 to 8.72.1 | Full repository lint passes with `NODE_OPTIONS=--max-old-space-size=12288`; the initial default-heap invocation exhausted 4 GiB and is not a pass.                                               |
| Canvas dependency     | React Flow 12.10.2 to 12.12.1                                                                          | 53 unit and 87 presentation cases pass; Web typecheck passes. These mocked/component tests do not replace native browser proof.                                                                  |
| Observability adapter | Context manager 2.10.0 to 3.1.0                                                                        | All nine observability tests and package typecheck pass with the existing API 1.9.1 and tracing SDK 2.10.0.                                                                                      |
| Temporal runtime      | All eight direct SDK uses aligned at 1.25.0                                                            | Adapter: 314 tests and source/test types pass. Worker: 81 tests and source/test types pass; five existing provider/platform cases are excluded on Windows. Native Linux proof is recorded below. |

React Flow focused commands use `vitest.unit.config.ts` for
`canvasViewportInteraction.test.ts` and `CanvasViewport.keyboardNodeEntry.test.ts`,
then `vitest.presentation.config.ts` for `CanvasViewport`,
`CanvasNodePortHandle.test.tsx` and `GraphNodeCardView.test.tsx`. The normal
`test:deps` preparation ran first. The selected cases preserve click/double-click,
keyboard context menus, node identity, port semantics and graph presentation.

Native Chrome exercises dragging, connection ports, layout persistence, column
lineage and inspector ordering. The initial five-spec command passed 26 cases
but failed because the mixed viewport spec requires a real provider; its missing
API configuration also skipped one dependent case. That command is not a pass.
With the declared LIVE runner, both React Flow versions reproduced an identical
preexisting Fit synchronization failure (7/8 cases passed). The [audited test
repair](https://github.com/dunay2/dvt/issues/3840#issuecomment-6784787728) observes
rendered graph centering before measuring pan, preserving all gesture assertions.

On the rebased 12.12.1 candidate, the complete LIVE viewport spec then passes
**8/8**, with **5/5** real PostgreSQL provider cases and no pending or skipped
cases. The command is:

```text
DVT_SELECTED_CLOSURE_CYPRESS_RUNTIME=native
DVT_SELECTED_CLOSURE_TEMPORAL_WORKER_RUNTIME=available
pnpm --filter @dvt/web test:e2e:selected-closure:live --spec apps/web/cypress/e2e/canvas/canvas-relational-workbench-viewport.cy.ts
```

Existing real dbt/analyzer and native Temporal server paths were supplied through
their declared environment variables. The final whole-candidate gate below
remains required; individual passing spec results do not turn the failed initial
command into acceptance.

The observability tests exercise nested asynchronous span parentage, context after
`await`, export, bounded attributes and exporter-error isolation. Only the context
manager changes major version. Its [published peer contract](https://github.com/open-telemetry/opentelemetry-js/blob/v3.1.0/packages/opentelemetry-context-async-hooks/package.json)
accepts API 1.9.1; its Node minimum is satisfied by the repository's 22.23.3.
This does not claim migration of the remaining tracing SDK to version 3.
After the normal API runtime dependency build, `pnpm --filter dvt-api
proof:start-run-otel` also passes all three cases. This verifies API-to-Engine-to-
Temporal span parentage, bounded attributes and rejection paths with a controlled
Temporal client; it is not evidence of a native Temporal server execution.

The lockfile retains pnpm's compatible transitive resolutions, including
TypeScript ESLint internal ranges and Vitest peer-qualified snapshots. No
unrelated runtime upgrade is manually introduced. Frozen installation succeeds
in the clean Linux snapshot; Node is 22.23.3 and pnpm is 10.28.0.
Temporal's new `long ^5.3.2` and `protobufjs ^8.7.1` peers consistently resolve
to 5.3.2 and 8.8.0. The installer still reports the preexisting
`eslint-plugin-import 2.32.0` peer-range warning for ESLint 10; that range also
excluded the previous 10.13 release. The full lint pass does not erase that
existing declaration mismatch.

## Native Temporal proof

The exact committed implementation snapshot
`e143f31e7e0ed33a12d788006e61ff28752bccc1` was exported with `git archive` and
executed in Node 22.23.3 Bookworm with a private PostgreSQL 16 container. No host
workspace, Windows `node_modules`, application database, `.env` or Docker socket
was mounted. Only the immutable source archive was mounted read-only. The owned
containers and network were removed after successful execution.

The sequence retained ADR-0001 build ownership:

```text
pnpm install --frozen-lockfile
node scripts/build-workspace-runtime-deps.cjs dvt-temporal-worker
pnpm test:adapter-temporal:integration
pnpm test:adapter-temporal:integration:transformation
```

The integration wrapper passed **32/32** cases across three files in 189.59 s,
including start identity, retransmission, cancellation and bounded concurrency.
Transformation passed **2/2** in 13.20 s. The same installation then ran:

```text
DVT_PG_INTEGRATION=1 DVT_PG_URL=<owned disposable database>
pnpm --filter dvt-temporal-worker exec vitest run --config vitest.config.ts test/host/runTemporalWorkerHost.test.ts -t 'runTemporalWorkerHost signal canary' --pool=forks --maxWorkers=1 --minWorkers=1 --no-file-parallelism
```

Both signal cases executed and passed: graceful SIGTERM drain in 8.266 s and
forced shutdown in 5.359 s. The Vitest run took 18.18 s; 17 unrelated cases were
outside that selector. The tests retain the actual SDK run outcome, readiness
withdrawal and ordered resource cleanup. Their held activity fixture is not a
successful dbt workload. Current-SDK replay is not proof of replaying a retained
1.24 history under 1.25.

The SDK update changes worker completion draining, making those native
assertions pertinent to the [1.25 release](https://github.com/temporalio/sdk-typescript/releases/tag/v1.25.0).
Existing load/network and direct concurrent adapter-start limitations remain in
the [Temporal operational risk](../risk-register/adapters/r-20260308-temporal-operational-hardening-residuals.md).

## Acceptance boundary

This record establishes the focused receipts above. The final repository prepush,
required hosted checks, fresh exact-base/head
Planning DB acceptance and merge disposition are recorded on #3842 and its
replacement PR before integration. None is inferred from a focused pass or a
routed skip.

The initial native implementation gate rejected the observability manifest's
missing allowed-surface admission. The [audited native admission](https://github.com/dunay2/dvt/issues/3842#issuecomment-6784385669)
now references the existing StartRun rail and retains `SYS-OBSERVABILITY-ROOT`
ownership, allowing only the adapter manifest. The corrected implementation gate
passes all 782 DB manifests; it does not replace fresh final-SHA acceptance.
No validator or product contract changed to resolve this governance failure.
The original dependency PRs remain open until the replacement is integrated.
No hook is bypassed, quality rule relaxed, new debt entry, production stub or fake
success path is introduced.
