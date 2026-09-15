# PLN2 C0 laboratory protocol v1

Owner: [#3205](https://github.com/dunay2/dvt/issues/3205), epic #3204.
This is an isolated research branch, not an accepted change to DVT.

## Fixed comparison

Reuse the 12 diagnostic fixtures and 40 random DAGs (24 tasks, seeds 1–40)
from the first C0 experiment. The generator must reproduce compact-JSON SHA-256
`556f9aa2acd44da5c0f1f11bdcb3148e3a1346e2b2c9b452cbc7645462758658`.
Do not change a fixture after observing a result; a changed corpus requires a
new protocol/version. Names `structural-win/loss` are hypotheses, not labels
assigned after measuring. No native multi-output DVT fixture is claimed here.

Baseline: local reproduction of Kahn + binary identifier comparison, not an
invocation of the production Planner. Reference source baseline is
`9c60b7126597211704c9dfaf69a6d1845b37fe34`. The branch starts at
`88b7922f7246386959700da5866e330076f8dd97`; no production source is changed.

## Strategies and information budgets

1. `lexical`: deterministic topological baseline.
2. `downstream`: own weight 1 plus distinct transitive descendants. Formula
   referenced from Airflow; NOT execution of Airflow.
3. `bottom-level`: longest remaining path in node count, no duration evidence.
4. `duration-level`: longest remaining path using known synthetic durations.
   Diagnostic with privileged information, not a fair structural replacement.
5. `explicit-priority`: user priority first among currently ready tasks that
   fit capacity; identifier breaks ties. Dependencies always take precedence.
6. `dask`: genuine pinned `dask.order`, no copied/emulated upstream. Probe hash
   seeds 0/1/17/42 and insertion permutations 0/1/2/3 in separate processes.
   Report variants; never turn objective equality into identity determinism.
7. `highs`: genuine native HiGHS through SciPy, not highs-js/WASM. Only the 12
   diagnostics, exact durations, integer time-indexed model, makespan objective.
   Business priority is NOT in that objective. Record solver status/bound/gap.

Use the same non-preemptive ready-task simulator and capacities for ranking
comparisons. A bounded layer-barrier control separates dispatch policy from
ranking. It is NOT DVT's current Promise.all runtime. Solver schedules are
validated independently and compared only on their common subset of fixtures.
Do not infer that a static start time should be used as a production timer.

## Measures

Primary: simulated makespan. Secondary: first/mean terminal-output completion,
mean/max ready-to-start wait, actual dispatch order, per-resource utilization
and peak occupancy. Preserve full start/end traces and losing cases.

Overhead: rank p50/p95/max from 21 repetitions after 3 warmups at 100/1000 tasks;
record all samples and hardware/Node version. Excludes simulation/validation
and I/O. Process-wide peak RSS is diagnostic, not per-strategy memory usage.
Solver: model dimensions, build/solve time, objective, bound, relative gap and
valid incumbent. Probe/process overhead is NOT included in native solve time.

Exploratory gate retained from the initial protocol: aggregate makespan
improvement >=5%, no diagnostic case >10% worse, no hard violations, ranking
p95 <=250 ms at 1000 tasks. This is not a production SLA, adoption decision,
SQL speedup or scale certification. Explicit priorities have a separate
behavioral criterion; they are not required to minimize makespan.

Hard checks: exact coverage, precedence, capacity, input immutability,
permutation invariance, invalid-graph/ranking/duration/demand rejection.
Missing duration permits structural ranking but rejects informed scheduling.
Each run writes to a NEW output directory and records protocol/source/corpus
hashes. A failed assertion exits nonzero; partial files do not imply success.

## Optional software and exit states

No network access or package installation occurs in the runner. Optional
probes emit EXECUTED, UNAVAILABLE or ERROR and use exit 0, 2 or 1 respectively.
Missing software is never replaced by another algorithm. EXACT package pins
are experimental reproducibility pins, not a claim of latest upstream.
OR-Tools, highs-js/WASM and Timefold remain explicitly deferred candidates;
this branch contains no fake adapters for them.

## Boundaries

No SQL/Temporal/browser/DVT product test is performed here. No production
imports, dependencies, contracts, workflows or Planning DB records are changed.
Planning DB reconciliation, repository hooks/lint/typecheck/prepush and C0
acceptance remain separate gates. Do not merge this lab as a product feature.
