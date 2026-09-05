---
title: GH-2900 Web Vitest Benchmark Evidence
status: Review
owner: Web / CI
last_reviewed: 2026-09-05
planning_type: closeout
---

# GH-2900 Web Vitest Benchmark Evidence

## Think-first analysis

The pre-implementation analysis, current/candidate diagram, invariants, options,
Fowler matrix and validation plan are in the
[governing proposal](../proposals/mandatory/governance-and-docs/gh-2900-web-vitest-isolation-benchmark.md).
This report starts before implementation. Issue #2900 remains open until its
measurements and acceptance criteria have been reconciled here and in GitHub.

## Measurement environment

- Source: `3695f07c9ba3c66ab51f88a2dabe18e18556a244`, with documentation-only
  admission commit `05115fbb8`; no product/configuration changes in the control.
- Linux comparison: `node:22.19.0-bookworm`, image digest
  `sha256:afff6d8c97964a438d2e6a9c96509367e45d8bf93f790ad561a1eaea926303d9`,
  two CPUs, 7 GiB container memory, complete checkout on Linux filesystem.
- Node 22.19.0, pnpm 10.28.0, Vitest 3.2.4; frozen 27-workspace install;
  explicit `node scripts/run-turbo-workspace-task.cjs build --filter=@dvt/web^...`.
- One isolated fork at a time and `--max-old-space-size=4096` for the control.
  RSS is sampled every 100 ms for the parent/descendant process tree. Per-worker
  peaks are observed RSS, not a claim that 100 ms sampling captures every
  instantaneous allocation. Node exit resource usage is also retained when
  processes exit normally; terminated forks need the external sampler.
- All repetitions share the warmed dependency/build state. These are local
  measurements, not hosted GitHub runner times or an SLA.

## Completed control observations

| Environment       | Suite        | Files | Passed tests | Wall seconds | Observed worker peak MiB | Observed tree peak MiB |
| ----------------- | ------------ | ----- | ------------ | ------------ | ------------------------ | ---------------------- |
| Windows           | unit         | 275   | 1602         | 811.281      | 240.68                   | 349.05                 |
| Linux, first run  | unit         | 275   | 1602         | 435.132      | 279.33                   | 493.12                 |
| Linux, first run  | presentation | 216   | 963          | 519.515      | 384.80                   | 643.79                 |
| Linux, first run  | architecture | 101   | 273          | 134.329      | 220.22                   | 415.72                 |
| Linux, second run | unit         | 275   | 1602         | 460.311      | 246.35                   | 442.10                 |
| Linux, second run | architecture | 101   | 273          | 136.448      | 219.70                   | 414.79                 |

The rest of the Windows run was deliberately stopped when moving the comparison
to Linux. It is not counted as a completed full-suite validation. The successful
Linux install reproduced existing `dvt-trace` bin and ignored-build-script
warnings; no install policy was relaxed. #2934 owns that independent concern.

## Rejected alternatives and corrections

| Candidate                                    | Suite        | Files / tests        | Wall seconds | Observed worker peak MiB | Result                                                                      |
| -------------------------------------------- | ------------ | -------------------- | ------------ | ------------------------ | --------------------------------------------------------------------------- |
| Node without additional browser declarations | unit         | 275 / 1595 collected | 200.220      | 225.76                   | Rejected: 36 failures and one collection failure; seven tests not collected |
| Node                                         | architecture | 101 / 273            | 40.897       | 166.77                   | Passed; identical test identities                                           |
| Ten-file shared forks                        | unit         | 275 / 1602           | 129.782      | 313.56                   | Passed                                                                      |
| Ten-file shared forks                        | presentation | 216 / 963            | 206.244      | 538.39                   | Rejected: 57 failed tests across eight batches                              |
| Ten-file shared forks                        | architecture | 101 / 273            | 37.485       | 220.88                   | Passed                                                                      |

The first presentation batch was repeated and failed again (two failures among
37 cases in 11.901 s). The initial run of that batch failed thirteen cases.
The differing failure set reinforces the shared-state/order sensitivity: these
same tests pass with isolated forks. Batch timings sum the actual individual
Vitest invocations, including their startup costs. No failing batch is presented
as a successful speedup.

The selected policy retains per-file isolation and Node only for primary unit
and architecture defaults. Shared batching is not adopted for a subset of suites:
the additional execution topology and weaker isolation are unnecessary to obtain
the measured environment improvement. Browser-dependent unit files explicitly
retain jsdom. The normal-console unit validation also exposed indirect persisted
workspace-scope harness dependencies; those require the same browser declaration,
not warning suppression or replacement storage mocks.

A second control attempt was discarded after detecting an overlapping residual
Vitest process from a replaced waiting shell. Both owned experiment process trees
were terminated, incomplete artifacts were marked `aborted-overlap`, and the
control restarted with one active experiment. No contaminated duration contributes
to the comparison.

The first normal-console Windows unit run after switching defaults collected all
1602 cases but failed 45 assertions in 16 files because Node inherited the host's
Spanish locale. This did not appear in the Linux probe. `LANG`/`LC_ALL` changes
did not change Node's Windows locale. Tests depending on browser-localized copy
retain jsdom explicitly; no host locale or Node global is overridden. A further
eleven tests use the persisted workspace-scope harness indirectly and also need
jsdom to avoid new storage warnings. In total, 33 existing unit files gain only
an environment directive. Their 229 tests passed together on Windows after the
correction, without stderr/storage warnings.

## Regression evidence

- Environment-policy guard: two expected failures before changing the catalog,
  then 17 passing cases.
- Persistent-harness guard: one expected failure before declaring indirect
  browser dependencies, then 18 passing catalog cases.
- Browser regression: 33 files / 229 tests pass, with existing assertions and
  fixtures unchanged.
- Suite ownership/routing guards: nine files / 43 tests passed before adding
  the persistent-harness guard.
- `pnpm --filter @dvt/web lint` and `pnpm --filter @dvt/web typecheck` passed
  on the initial configuration patch; final hook/prepush validation still owns
  the completed, formatted tree.
