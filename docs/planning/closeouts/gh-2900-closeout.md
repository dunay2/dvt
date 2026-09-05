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

## Accepted fixed-source results

Implementation commit: `a2d3c43369d15b8af77d7654edab8e652c659169`.

| Suite                   | Control runs, seconds | Final runs, seconds            | Control mean | Final mean | Reduction     |
| ----------------------- | --------------------- | ------------------------------ | ------------ | ---------- | ------------- |
| unit                    | 435.132 / 460.311     | 253.528 / 253.272              | 447.722      | 253.400    | 43.4%         |
| architecture            | 134.329 / 136.448     | 45.401 / 48.495                | 135.389      | 46.948     | 65.3%         |
| presentation, unchanged | 519.515 / 580.821     | Same configuration and samples | 550.168      | 550.168    | Not optimized |

Standalone measurements time the Vitest CLI. The second final sample observes
the actual Vitest process lifetime during `pnpm test:web:ci` at 100 ms resolution;
its native Vitest summaries were 252.31 / 579.91 / 47.67 seconds. These small
clock-boundary differences are explicit and far below the observed unit and
architecture improvements. Presentation varied by about 12% without configuration
changes, so it is not evidence of a speedup or a regression from this patch.

The real `pnpm test:web:ci` completed successfully in **886.109 s**, versus
1088.976 s summed over the first control's three Vitest invocations. That is
18.6% less elapsed time in this local comparison, despite the slower unchanged
presentation sample. It is not a hosted-runner or install-time claim.

Coverage proof:

- 592 primary files retained: 275 unit, 216 presentation, 101 architecture.
- All original 1602 unit test identities are identical; all 273 original
  architecture identities remain, with 12 additional catalog guards.
- Canonical full run: 1602 + 963 + 285 = **2850 passed tests**, no skipped tests.
- TypeScript token comparison of the 33 annotated unit files found no changed
  executable tokens. The hook normalized formatting in one existing test.
- No package command, changed-file routing rule, workflow, assertion, fixture,
  worker count, old-space limit, or isolation policy was removed or weakened.

Final observed worker RSS peaks were 228.10 MiB (unit), 321.50 MiB
(presentation canonical run), and 168.77 MiB (architecture). The unchanged
presentation control reached 384.80 MiB. All observed workers therefore retain
over 90% headroom to 4096 MiB, exceeding the planned 20% margin. The canonical
aggregate process-tree peak was 904.019 MiB, including pnpm/Node ancestors.

## Integration and delivery status

The branch integrates main at `6db9ba43b946054d8490512a205acd0474a7f006`
through `edf2e967e`. The full canonical command was rerun on this integration:
`docker exec -w /work dvt-gh2900 python3 tmp/gh-2900/canonical.py integration-main`.
It **failed** in unit: 274 files passed, one failed; 1596 cases passed, one failed.
The upstream test counts changed since the fixed-source benchmark. Presentation
and architecture were not reached by this sequential integration command.

The failing case is `canvasDbtModelColumnLineage.test.ts:82`, which expects
three removable dbt lineage edges but receives an empty list. It also fails with
`--environment=jsdom` on the integrated branch. Checking out pristine main at
`6db9ba43b` and running `DVT_CI=1 pnpm exec vitest run --config
vitest.unit.config.ts src/app/views/canvas/canvasDbtModelColumnLineage.test.ts`
from `apps/web` reproduces the same failure. Upstream commit `73614be55`
removed the false dbt column-lineage behavior; the old test still expects it.
This is an existing main integration blocker, not a Node-environment regression.
The test and product semantics remain untouched by #2900. Delivery remains a
**local committed branch**, with the issue open until this discrepancy and required checks are
resolved; the integrated tree is not claimed green.

Normal merge hooks also normalized three upstream files:
`CanvasSettingsDialog.tsx`, `lineageWorkbenchStateModel.ts`, and
`canvasColumnLineageProjection.test.ts`. Formatting the pristine upstream
versions in memory with the repository Prettier configuration reproduces these
files exactly. This bounded formatting scope is recorded in the proposal.

Validation commands on the integration:

- `pnpm --filter @dvt/web lint`: passed.
- `pnpm --filter @dvt/web typecheck`: passed.
- `pnpm docs:status:generate --code-state-only` and `pnpm docs:sync`: passed.
- `pnpm docs:feature-mechanization:implementation -- --feature GH-2900-WEB-VITEST`:
  passed after explicitly admitting the hook-only formatting paths; its initial
  rejection correctly detected those paths.
- `pnpm governance:refresh`: passed, generated surfaces converged in three passes.
- Final committed-tree `pnpm verify:prepush`: **failed** after governance and
  mechanization checks passed. Canvas unit selection passed 13 files / 89 cases;
  Canvas presentation passed 109 files / 455 cases and failed one case in
  `useCanvasControllerReadModel.test.tsx:562`. This same failure reproduces on
  pristine main using `DVT_CI=1 pnpm exec vitest run --config
vitest.presentation.config.ts src/app/views/canvas/useCanvasControllerReadModel.test.tsx`
  (12 passed, one failed). It also expects the removed dbt lineage.
- Independent `DVT_CI=1 pnpm run test:architecture:run` on the integrated branch:
  98 files / 283 cases passed, three failed. The failures are
  `Canvas.architecture.test.tsx`, `dbtProjectFileProjection.architecture.test.ts`,
  and `lineagePanelTokenConvergence.architecture.test.ts`. Running those exact
  three paths with `vitest run --config vitest.architecture.config.ts` on pristine
  main reproduces all three failures (five other cases pass).

There are therefore five independently reproduced upstream failures across the
primary suites. The normal pre-push gate prevents publication. No push or PR was
created, and no hook was bypassed. The final evidence-only commit does not change
the tested code. Raw local logs are retained under `tmp/gh-2900/`.

Governing sources are the inventory, ADR-0000, ADR-0061, command/query rail
rules, GitHub MVP issue workflow, frontend test component, and the governing
proposal linked above. Actual changes are the suite environment policy, catalog
guards, 33 browser declarations, four documentation sources, and the three
hook-only formatting files. No workflow/package command or product logic changed.
No new debt entry, stub, placeholder, disabled rule, suppressed failure, skipped
hook, or test exclusion was introduced. The existing upstream blocker is disclosed
rather than converted into a passing expectation.

## Reproduction

Use a disposable complete Linux clone, Node 22.19.0, pnpm 10.28.0, Python 3
with psutil, two CPUs and 7 GiB memory. Copy the listings below into the ignored
`tmp/gh-2900/` directory. Install with `pnpm install --frozen-lockfile
--prefer-offline` and explicitly build the web dependency closure. The observer
adds no assertion filters, retries, timeouts, or production commands.

At admission commit `05115fbb8` (unchanged test/configuration control), run:

```sh
python3 tmp/gh-2900/measure.py control 1
python3 tmp/gh-2900/measure.py node 1
python3 tmp/gh-2900/measure.py batch 1
python3 tmp/gh-2900/measure.py control 2 unit architecture
```

At implementation commit `a2d3c4336`, with the same dependency outputs, run:

```sh
python3 tmp/gh-2900/measure.py final 1 unit architecture
python3 tmp/gh-2900/canonical.py
```

The latter executes the real `pnpm test:web:ci` command and retains its complete
console log. Unit and architecture repeat on the final code; the unchanged
presentation configuration supplies a second presentation control. Never overlap
benchmark processes or compare the Windows sample with the Linux samples.

Each invocation writes a console log, JSON test report when the JSON reporter
is selected, per-process observations, and aggregate process-tree peak. Test
identity comparison uses sorted `(relative file path, full test name)` pairs;
failed runs are retained as failed evidence. The final observer also records
lifecycle metadata to attribute processes in the canonical package command to
unit, presentation or architecture. This metadata does not change execution.

### measure.py

```python
import json, os, pathlib, subprocess, sys, time, platform
import psutil

ROOT = pathlib.Path(__file__).resolve().parents[2]
WEB = ROOT / 'apps/web'
OUT = pathlib.Path(__file__).resolve().parent
NODE = 'node'
VITEST = str(ROOT / 'node_modules/vitest/vitest.mjs')

def run(label, args, env=None):
    log = OUT / (label + '.log')
    rss_dir = OUT / (label + '.rss')
    rss_dir.mkdir(exist_ok=True)
    processes = {}
    peak_tree = 0
    start = time.monotonic()
    with log.open('w', encoding='utf8') as stream:
        child = subprocess.Popen([NODE, VITEST, *args], cwd=WEB,
                                 env={**os.environ, 'DVT_CI':'1', 'NODE_OPTIONS':f'--max-old-space-size=4096 --require={OUT / "rss.cjs"}', 'GH_2900_RSS_DIRECTORY':str(rss_dir), **(env or {})},
                                 stdout=stream, stderr=subprocess.STDOUT)
        parent = psutil.Process(child.pid)
        while child.poll() is None:
            total = 0
            try:
                descendants = [parent, *parent.children(recursive=True)]
            except psutil.Error:
                descendants = []
            for proc in descendants:
                try:
                    mem = proc.memory_info()
                    total += mem.rss
                    key = str(proc.pid)
                    prior = processes.get(key, {})
                    processes[key] = {'pid':proc.pid, 'parent':proc.ppid(),
                        'peakRssBytes':max(prior.get('peakRssBytes',0), getattr(mem,'peak_wset',mem.rss)),
                        'command':proc.cmdline(), 'createdAt':proc.create_time(), 'lastObservedAt':time.time(),
                        'lifecycle':prior.get('lifecycle') or proc.environ().get('npm_lifecycle_event','')}
                except psutil.Error:
                    pass
            peak_tree = max(peak_tree, total)
            time.sleep(.1)
    result = {'label':label, 'exitCode':child.returncode, 'wallSeconds':round(time.monotonic()-start,3),
              'sampledPeakTreeRssBytes':peak_tree, 'processes':list(processes.values()),
              'command':[NODE,VITEST,*args], 'platform':platform.platform(), 'sampleIntervalSeconds':.1,
              'exitResourceUsage':[json.loads(p.read_text()) for p in rss_dir.glob('*.json')]}
    (OUT/(label+'.metrics.json')).write_text(json.dumps(result,indent=2), encoding='utf8')
    print(json.dumps({k:v for k,v in result.items() if k not in ('processes','command','exitResourceUsage')}),flush=True)
    return result

if __name__ == '__main__':
    mode = sys.argv[1]
    repetition = sys.argv[2] if len(sys.argv)>2 else '1'
    suites = sys.argv[3:] or (['unit','architecture'] if mode == 'node' else ['unit','presentation','architecture'])
    results = []
    for suite in suites:
        label = f'{mode}-{repetition}-{suite}'
        report = str(OUT/(label+'.tests.json'))
        if mode in ('control','node','final'):
            args = ['run','--config',f'vitest.{suite}.config.ts','--reporter=json','--outputFile',report]
            if mode == 'node' and suite != 'presentation':
                args += ['--environment=node']
            results.append(run(label,args))
        elif mode == 'batch':
            baseline = json.loads((OUT/f'control-1-{suite}.tests.json').read_text(encoding='utf8'))
            files = sorted(entry['name'] for entry in baseline['testResults'])
            for offset in range(0,len(files),10):
                batch_label = label+f'-{offset//10:03}'
                results.append(run(batch_label,['run','--config',str(OUT/'batch.config.ts'),
                    '--reporter=json','--outputFile',str(OUT/(batch_label+'.tests.json'))],
                    {'GH_2900_SUITE':suite,'GH_2900_FILES':json.dumps([os.path.relpath(f,WEB).replace('\\','/') for f in files[offset:offset+10]])}))
    sys.exit(1 if any(result['exitCode'] for result in results) else 0)
```

### rss.cjs

```javascript
const fs = require('node:fs');
const path = require('node:path');
const output = process.env.GH_2900_RSS_DIRECTORY;
const command = [...process.execArgv, ...process.argv];
if (output)
  process.on('exit', () => {
    fs.writeFileSync(
      path.join(output, `${process.pid}.json`),
      JSON.stringify({
        pid: process.pid,
        parent: process.ppid,
        peakRssBytes: process.resourceUsage().maxRSS * 1024,
        command,
      })
    );
  });
```

### batch.config.ts

```typescript
import { createWebVitestConfig, type WebVitestSuiteName } from '../../apps/web/vitest.suites';
const config = createWebVitestConfig(process.env.GH_2900_SUITE as WebVitestSuiteName);
config.test!.include = JSON.parse(process.env.GH_2900_FILES!);
config.test!.poolOptions!.forks!.singleFork = true;
config.test!.poolOptions!.forks!.isolate = false;
export default config;
```

### canonical.py

```python
import shutil
import sys
import measure

measure.WEB = measure.ROOT
measure.VITEST = shutil.which('pnpm')
result = measure.run(sys.argv[1] if len(sys.argv)>1 else 'canonical-1',['test:web:ci'])
sys.exit(result['exitCode'])
```
