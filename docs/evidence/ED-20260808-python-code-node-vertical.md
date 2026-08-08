---
title: ED-20260808 - Governed Python code-node vertical evidence
status: In progress
date: 2026-08-08
owners:
  - Contracts
  - Temporal Runtime
  - Web
issue: https://github.com/dunay2/dvt/issues/2253
pull_request: https://github.com/dunay2/dvt/pull/2263
---

# Governed Python Code-Node Vertical Evidence

## Claimed Outcome

The branch implements one governed Python slice across the existing DVT rails:

```text
Canvas authoring
  -> WorkspaceGraphAuthoringDraft
  -> GenericGraphSourceV1
  -> immutable persisted plan
  -> generic Temporal plugin dispatch
  -> fresh bounded CPython process
  -> typed bounded execution evidence
```

This evidence document remains **in progress** until all repository gates have
completed against the final branch head. It records implemented proof surfaces
without treating source inspection as a substitute for an executed test.

## Contract Proof

Implemented tests:

- `packages/@dvt/contracts/test/python-code-step.contract.test.ts`
  - accepts one bounded stateless Python request;
  - rejects executable paths, wrong runtime namespaces, wrong protocol, blank or
    oversized source/input, non-JSON input, invalid limits, and unknown fields;
  - registers `EXECUTE_PYTHON_CODE` with capability `executor.python-code`;
  - requires exact immutable plan ownership; and
  - rejects source, input, raw stdout/stderr, unknown fields, and oversized data
    from canonical execution evidence.
- `packages/@dvt/planner/test/unit/python-code-node.integration.test.ts`
  - admits the canonical step into a generic immutable plan;
  - derives the independent Temporal capability;
  - rejects ownership drift; and
  - rejects raw executable paths before plan creation.

## Runtime And Plugin Proof

Implemented tests:

- `packages/@dvt/temporal-python-plugin/test/PythonCodePlugin.test.ts`
  - independent profile owns only `EXECUTE_PYTHON_CODE`;
  - schema admission occurs before provider invocation;
  - explicit input is passed to the runtime port;
  - result maps to bounded typed evidence;
  - scope/runtime binding drift rejects before provider invocation;
  - compiler line/column map to controlled permanent refusal data;
  - unknown provider exceptions map to stable retryable failures;
  - configured output limits are rechecked at the plugin boundary; and
  - cancellation prevents or interrupts provider work.
- `packages/@dvt/temporal-python-plugin/test/pythonPluginBoundary.architecture.test.ts`
  - generic Temporal core contains no Python step branch;
  - the plugin package owns no child-process adapter; and
  - the independently composed profile is the only Python step owner.
- `apps/temporal-worker/test/runtime/EphemeralPythonProcessRuntime.test.ts`
  executes a real CPython binary and proves:
  - input travels through bounded JSON stdin;
  - stdout/stderr content is not returned, only byte counts;
  - `compile(..., 'exec')` runs before any user statement can create an effect;
  - every step starts from fresh interpreter state;
  - timeout terminates the process;
  - stream and non-JSON-result failures expose only stable codes;
  - arbitrary worker environment variables are not inherited;
  - cancellation terminates the active process; and
  - unknown runtime refs fail closed.
- `apps/temporal-worker/test/plugins/python-env.test.ts` and
  `apps/temporal-worker/test/runtime/temporalWorkerPythonProfile.test.ts`
  - profile is disabled by default;
  - enabling requires an explicit isolated-worker acknowledgement;
  - runtime bindings require `python-runtime:*` keys and absolute executable
    paths; and
  - only the Python activity is composed when enabled.

## Canvas And Planning Proof

Implemented tests:

- `apps/web/src/app/views/canvas/pythonCodeAuthoringModel.test.ts`
  - source, JSON input, runtime ref, and all limits survive Inspector apply,
    serialization, and reload unchanged;
  - persisted metadata projects to the canonical step config with authorized
    scope;
  - malformed JSON, arrays, executable paths, blank source, and invalid limits
    fail before Graph Draft apply; and
  - missing execution scope fails closed.
- `apps/web/src/app/views/canvas/canvasPythonExecutionProjection.test.ts`
  - selecting a downstream root closes over upstream Python dependencies;
  - each edge becomes an explicit `dependsOn` relationship;
  - each node retains explicit independent JSON input;
  - graph/signature projection is deterministic;
  - editing source invalidates the draft signature; and
  - empty, unavailable, or unauthorized scope fails closed.
- `apps/web/src/app/plugins/python/pythonContributions.test.ts`
  - plugin, Canvas, and node kind are absent when backend capability is missing
    or unavailable; and
  - one Python Canvas and one governed code-node kind are published when the
    capability is available.
- `apps/web/src/app/views/canvas/canvasPythonAuthoringRun.architecture.test.ts`
  - Web imports no process or authoritative runtime adapter;
  - Python uses a separate backend-gated Canvas/source family;
  - the closed SQL-first projection contains no Python switch;
  - the existing Inspector apply model remains the authoring command seam; and
  - the plan contains no kernel/session/process identifier.

## API Capability Proof

Implemented tests:

- `apps/api/test/plugins/env.test.ts`
- `apps/api/test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts`
- `apps/api/test/entrypoints/http/capabilitiesRoutes.test.ts`

Together they prove that `dvt.python` and `executor.python-code` remain absent by
default and are advertised only when Temporal and the Python profile are
explicitly enabled.

## Negative Data-Leak Proof

The canonical config/evidence and runtime tests assert that the following are
not emitted as run evidence or stable failure messages:

- user source;
- input values;
- raw stdout;
- raw stderr;
- provider exception text;
- executable paths; and
- hidden process/kernel/session identifiers.

The process wrapper sends source through stdin rather than command arguments,
uses one private temporary working directory, removes the directory in a
`finally` block, and launches with a sanitized environment.

## Deployment Boundary

The proof does **not** claim that CPython isolated mode is a sandbox. Application
code proves clean process state, bounded protocol/resource behavior, and stable
failure mapping. Production admission of untrusted code additionally requires a
dedicated worker workload with non-root identity, read-only root filesystem,
dropped capabilities, bounded temporary storage, CPU/memory/PID limits, and
network deny-by-default. That deployment proof remains an operational release
gate, not an application unit-test claim.

## Repository Validation

Final results will be recorded here after the last branch head completes:

- `pnpm --filter @dvt/contracts test`
- `pnpm --filter @dvt/planner test`
- `pnpm --filter @dvt/temporal-python-plugin test`
- `pnpm --filter dvt-temporal-worker test`
- `pnpm --filter @dvt/api test`
- `pnpm --filter @dvt/web test:canvas`
- `pnpm --filter @dvt/web typecheck`
- `pnpm --filter @dvt/web lint`
- `pnpm docs:feature-mechanization:implementation -- --feature PYTHON-CODE-NODE-VERTICAL-20260808`
- `pnpm governance:refresh`
- `pnpm verify:prepush`

## Residual Limitations

- V1 edges represent execution ordering, not result transport.
- Each node carries explicit JSON input; no hidden interpreter state is used.
- Arrow-backed immutable tabular artifacts are a later contract.
- R and SQL are documented adapter seams, not partial implementations.
- Browser WASM and Jupyter are advisory/alternative providers, not production
  workflow authority in this vertical.
