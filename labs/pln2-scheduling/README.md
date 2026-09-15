# PLN2 — Scheduling strategy laboratory

Branch: `lab/3205-pln2-scheduling-strategies`.
Owner: [#3205 / C0](https://github.com/dunay2/dvt/issues/3205), epic
[#3204](https://github.com/dunay2/dvt/issues/3204).

Isolated experiment, outside the production workspaces. No Planner, Engine,
Temporal, database, public API, root dependency or CI workflow changes.
The first study remains in the issue; this directory is the executable lab,
not another architecture authority. C0 is NOT accepted by creating this branch.

## Run the reference policies (Node 22)

From the repository root; no package installation needed:

```sh
node --test labs/pln2-scheduling/test/lab.test.mjs
node labs/pln2-scheduling/src/run.mjs --out labs/pln2-scheduling/.runs/reference-01
```

Each output directory must be new. Outputs: `corpus.json`, `summary.json`,
`traces.json` and `metrics.csv`. JSON includes raw timings, strategy/fixture
outcomes, environment, protocol/source/corpus hashes. CSV is for comparison;
traces preserve dependencies, start/end times and resource observations.

| Strategy | Implementation in this branch | Information supplied |
| --- | --- | --- |
| lexical | Baseline reproduction, not production DVT | DAG and IDs |
| downstream | Local implementation of Airflow's unit-weight formula | DAG |
| bottom-level | Structural longest-remaining-path policy | DAG |
| duration-level | Informed diagnostic, not a structural default | DAG + known durations |
| explicit-priority | Separate user priority, applied among ready/feasible tasks | DAG + priorities |
| dask-real | Optional genuine pinned `dask.order` subprocess | DAG |
| highs-native | Optional genuine HiGHS via SciPy | Durations + precedences + capacities |

The ready-queue and layer-barrier controls share the same capacities. Neither
is the production Temporal runtime. A numerical score is not a SQL estimate.
See [PROTOCOL.md](PROTOCOL.md) for metrics, corpus and pre-registered criteria.

## Run the external component probes

Use an isolated Python environment, not the repository's production dependency
set. Dependency installation is explicit and requires a working package network.
Top-level pins are provided; these are not transitive dependency lockfiles.

```sh
python -m venv labs/pln2-scheduling/.venv
# Linux/macOS; use .venv/Scripts/python.exe on Windows PowerShell.
labs/pln2-scheduling/.venv/bin/python -m pip install -r labs/pln2-scheduling/requirements-dask.txt -r labs/pln2-scheduling/requirements-highs.txt
```

With that environment activated, use `python` below (or its full path):

```sh
python labs/pln2-scheduling/src/probe.py --backend dask --corpus labs/pln2-scheduling/.runs/reference-01/corpus.json --out labs/pln2-scheduling/.runs/dask-01.json
python labs/pln2-scheduling/src/probe.py --backend highs --corpus labs/pln2-scheduling/.runs/reference-01/corpus.json --out labs/pln2-scheduling/.runs/highs-01.json
node labs/pln2-scheduling/src/run.mjs --out labs/pln2-scheduling/.runs/comparison-01 --external labs/pln2-scheduling/.runs/dask-01.json --external labs/pln2-scheduling/.runs/highs-01.json
```

Exit codes for probes: **0 executed, 2 unavailable, 1 error**. Status is also
written to JSON. No dependency is silently installed or replaced. A missing
optional component may be recorded in a comparison but never counts as tested.
Dask runs multiple hash seeds/permutations; a variation is reported, not hidden.
HiGHS status/feasible incumbent/optimality gap are separate from validation.

`dask-real` uses one explicitly identified probe run for common-simulator
metrics; all identity variations remain in the source probe report. HiGHS uses
only the 12 diagnostic fixtures; aggregate numbers from different fixture
counts are NOT directly comparable. Compare with the matching baseline subset.

## Measures and interpretation

Makespan, first/mean output completion, mean/max waiting after dependencies,
start order, resource utilization/peak, rank p50/p95/max, model dimensions,
solver build/solve time, objective/bound/gap, input-permutation behavior,
coverage and hard-constraint validation. Process-wide RSS is not a per-policy
memory benchmark. Known durations are laboratory truth, not estimated seconds.

[Measured evidence](evidence/verification.json) records the local run performed
for this branch. Full runs are regenerated under ignored `.runs/`; historical
outputs are not overwritten. No SQL speedup or product acceptance is claimed.

## Next experiments, not adapters hidden behind stubs

OR-Tools CP-SAT and highs-js/WASM remain the next external-component comparison;
Timefold is deferred. Their repository references are in `sources.json`.
They are NOT implemented or executed by the runners above. There is no fake
adapter, second workflow engine or change to production `ExecutionPlan`.

Before any production adoption: resolve Planning DB architecture consultation,
run the repository's commit helper/hooks, lint/typecheck and `verify:prepush`,
and complete C0 review. This connector-hosted lab was not published through
local repository hooks (pnpm/full checkout unavailable); it is not merge-ready.
