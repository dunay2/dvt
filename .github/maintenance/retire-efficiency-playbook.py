"""Isolated input for #3004; copied outside the product checkout before use."""
from pathlib import Path
import hashlib
import json
import os
import subprocess

BASE = '1b07acde33300a19d97914eb719b262b44e79182'
TARGET = 'docs/planning/reviews/ci-and-delivery/20260328-lane-c-ai-efficiency-and-cost-review.md'
NAME = Path(TARGET).name
URL = f'https://github.com/dunay2/dvt/blob/{BASE}/{TARGET}'
TEST = 'tools/ci/docs-disposition-canon.test.mjs'
OUT = Path(os.environ['RUNNER_TEMP']) / 'playbook3004'
OUT.mkdir(exist_ok=True)
EXPECTED = {
 'AGENTS.md': 'ca084a450363d53665ce311adfca558aa674fc6c',
 'docs/guides/ai-work-protocol.md': 'bb70dbbea0cd0eb6b8d253f210f7cca5906bd2f3',
 'docs/guides/pr-preflight-and-ci-triage.md': '0f413949af0c168e836e5e59fb7dd6d75ee5b230',
 'docs/planning/closeouts/20260402-rc-c2-operational-friction-intake-closeout.md': '4a395b952755da259f5cd1759a06ecb59080a386',
 'docs/planning/closeouts/20260418-local-build-hook-warm-cache-p0-closeout.md': '49df6a4611153bebe7334abda0d0d35b644cea58',
 'docs/planning/closeouts/20260601-ai-targeted-governance-report-tests-closeout.md': '0e44adae4f3404dc0844e052dd2c6be2275dcd0c',
 'docs/planning/closeouts/20260601-planning-db-migration-suite-routing-closeout.md': '027e32dc89cdf1636a70a7c4bbb28dd1e4783c8f',
 'docs/planning/proposals/mandatory/governance-and-docs/web-vitest-changed-shallow-ci-plan-20260603.md': 'c07e6cb5dc72c72ed1fff23cd51ebefc3d694955',
 'docs/planning/proposals/mandatory/runtime-and-contracts/rc-c2-shared-preflight-and-ci-log-first-triage-plan-20260401.md': '418b3f484af0086f439a742336bf4f98ec8da56a',
 'docs/planning/reviews/20260806-cux1-wux1-novice-fowler-qa-review.md': 'aef01a3a59cca2d55eb5c61f719f349afc2d5c1b',
 TARGET: '864ac1094535b32f398d94d4e62a66a37617f631',
 'docs/planning/reviews/ci-and-delivery/20260402-rc-c2-operational-friction-intake-review.md': 'b2efcf5d26d305da3cb8f2157c4d3400e4c0499a',
 'docs/planning/reviews/ci-and-delivery/20260422-environment-configuration-audit-review.md': '4f1bee1d6a37107d69627ecc8f7dfb0f79563964',
 'docs/planning/reviews/review-status-board.md': 'f7b14a36ee45d76f72cad37b7a4439bce0af151f',
 'docs/planning/reviews/sprints/sprint-2026-04a/board-003-rc-c2-cycle-closure.md': '16f1e4bf2cf60e74733d2be1d8d2d08b279564b7',
 'docs/planning/status/ai-efficiency-adoption-log.yaml': 'f1040a768296488c74599fcda4814709bef00c08',
 'docs/planning/status/ai-efficiency-adoption-status.md': '2078cdb5d527931b47169df8aeaea76b0d6c8a24',
 TEST: '739dbfcb4b20b6610388a4afbc93377cfe32d07e',
}

def blob(data):
 return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()

assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip() == BASE
original = {p: Path(p).read_bytes() for p in EXPECTED}
for p, data in original.items():
 assert blob(data) == EXPECTED[p], ('source changed', p, blob(data))
contents = {p: b.decode('utf-8') for p, b in original.items()}
changes = []

def replace(p, old, new, count=1):
 assert contents[p].count(old) == count, (p, old, contents[p].count(old))
 contents[p] = contents[p].replace(old, new)
 changes.append({'path': p, 'old': old, 'new': new, 'count': count})

replace('AGENTS.md', f'- `{TARGET}` -\n  historical efficiency and cost-reduction review; use only the still-valid\n  techniques, not its dated lane state as current authority.\n', '- `docs/guides/pr-preflight-and-ci-triage.md` - current preflight, branch\n  hygiene, conflict resolution, and failed-check diagnosis.\n')
replace('docs/guides/pr-preflight-and-ci-triage.md', f'- `{TARGET}`\n', '')
replace('docs/guides/pr-preflight-and-ci-triage.md', 'last_reviewed: 2026-09-10', 'last_reviewed: 2026-09-17')
replace('docs/guides/pr-preflight-and-ci-triage.md', '## First-Red Triage Rule\n', '''## Conflict Triage And Cleanup Safety

Classify each conflicted file by its current owner and intended change before
choosing either side or resolving it manually. Do not apply a bulk side selection
without checking what it discards. After resolution, scan for conflict markers,
run the affected tests, and follow the commit and validation sequence in
`AGENTS.md` before push.

Branch diagnostics do not authorize deletion. Destructive cleanup remains an
explicit opt-in operation with the confirmation supported by `scripts/hygiene.ps1`;
never infer permission from a branch being reported as superseded.

## First-Red Triage Rule
''')
replace('docs/guides/ai-work-protocol.md', '''Archived proposals, reviews, closeouts, and historical evidence may describe
retired workflows. Preserve them when they truthfully record their baseline, but
do not route active work through them and do not treat their obsolete links or
terminology as current governance.
''', '''Apply the [Historical Material Rule](../planning/status/governance-document-rule-inventory.md#historical-material-rule)
from the governance inventory. Do not route active work through historical
reviews. Retire obsolete documents after reconciling their consumers and current
obligations; retain required provenance through exact Git revisions, not archive
copies or preservation summaries.
''')
replace('docs/planning/status/ai-efficiency-adoption-status.md', '- Governing review:\n  [20260328 Lane C AI Efficiency And Cost Review](../reviews/ci-and-delivery/' + NAME + ')', '- Historical measurement baseline, not an operational playbook:\n  [20260328 Lane C AI Efficiency And Cost Review](' + URL + ')')
replace('docs/planning/status/ai-efficiency-adoption-log.yaml', '  source_review: ' + TARGET, '  source_review: ' + URL)
replace('docs/planning/proposals/mandatory/governance-and-docs/web-vitest-changed-shallow-ci-plan-20260603.md', 'userStories:\n  - ' + TARGET, 'userStories:\n  - docs/guides/pr-preflight-and-ci-triage.md')
p = 'docs/planning/proposals/mandatory/runtime-and-contracts/rc-c2-shared-preflight-and-ci-log-first-triage-plan-20260401.md'
replace(p, '- `' + TARGET + '`', '- [Historical efficiency review](' + URL + ')')
replace(p, '  - ' + TARGET + '\n', '')
for p in [
 'docs/planning/closeouts/20260402-rc-c2-operational-friction-intake-closeout.md',
 'docs/planning/closeouts/20260418-local-build-hook-warm-cache-p0-closeout.md',
 'docs/planning/closeouts/20260601-ai-targeted-governance-report-tests-closeout.md',
 'docs/planning/closeouts/20260601-planning-db-migration-suite-routing-closeout.md',
 'docs/planning/reviews/20260806-cux1-wux1-novice-fowler-qa-review.md',
]:
 replace(p, '`' + TARGET + '`', '[Historical efficiency review](' + URL + ')')
for p in [
 'docs/planning/reviews/ci-and-delivery/20260402-rc-c2-operational-friction-intake-review.md',
 'docs/planning/reviews/ci-and-delivery/20260422-environment-configuration-audit-review.md',
]:
 old = '(./' + NAME + ')'
 replace(p, old, '(' + URL + ')', contents[p].count(old))
replace('docs/planning/reviews/sprints/sprint-2026-04a/board-003-rc-c2-cycle-closure.md', '  - ../../../../ci-and-delivery/' + NAME, '  - ' + URL)
p = 'docs/planning/reviews/review-status-board.md'
rows = [line + '\n' for line in contents[p].splitlines() if NAME in line]
assert len(rows) == 2
for row in rows:
 replace(p, row, '')
replace(TEST, "import assert from 'node:assert/strict';\n", "import assert from 'node:assert/strict';\nimport { execFileSync } from 'node:child_process';\n")
replace(TEST, "    'docs/planning/proposals/superseded/runtime-and-contracts',\n", "    'docs/planning/proposals/superseded/runtime-and-contracts',\n    '" + TARGET + "',\n")
addition = '''

test('retired efficiency playbook has no live local consumers', () => {
  const retiredPath = 'RETIRED_PATH';
  const basename = retiredPath.split('/').at(-1);
  const provenance =
    'https://github.com/dunay2/dvt/blob/BASE_SHA/' + retiredPath;
  const files = execFileSync('git', ['ls-files', '-z', '--', 'AGENTS.md', 'CLAUDE.md', 'docs', 'scripts', 'tools', '.github', 'package.json'], {
    encoding: 'utf8',
  }).split('\\0').filter(Boolean);
  for (const path of files) {
    if (path === 'tools/ci/docs-disposition-canon.test.mjs' || path === retiredPath) continue;
    if (!existsSync(new URL(`../../${path}`, import.meta.url))) continue;
    const content = readRepoFile(path).replaceAll(provenance, '');
    assert.equal(content.includes(basename), false, `retired efficiency review reference: ${path}`);
  }
  assertContains('AGENTS.md', 'docs/guides/pr-preflight-and-ci-triage.md');
  const guide = readRepoFile('docs/guides/pr-preflight-and-ci-triage.md');
  for (const marker of ['## Conflict Triage And Cleanup Safety', 'conflict markers', 'explicit opt-in', 'failed job logs first', 'pnpm verify:prepush']) {
    assert.ok(guide.includes(marker), `missing retained practice: ${marker}`);
  }
});
'''.replace('RETIRED_PATH', TARGET).replace('BASE_SHA', BASE)
anchor = "        path\n      );\n    }\n  }\n});\n"
assert contents[TEST].endswith(anchor)
replace(TEST, anchor, anchor + addition)
# Compare the complete proposed operations to the reviewed source identities.
(OUT / 'specification.json').write_text(json.dumps({'base': BASE, 'target': TARGET, 'provenance': URL, 'source_blobs': EXPECTED, 'operations': changes}, indent=2) + '\n')
(OUT / 'original-adoption.yaml').write_bytes(original['docs/planning/status/ai-efficiency-adoption-log.yaml'])
# First demonstrate the retirement regression against the unchanged document and consumers.
Path(TEST).write_bytes(contents[TEST].encode('utf-8'))
red = subprocess.run(['node', '--test', TEST], text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
(OUT / 'red.log').write_text(red.stdout)
print(red.stdout)
assert red.returncode == 1
assert TARGET in red.stdout and 'retired efficiency review reference: AGENTS.md' in red.stdout
# Apply only reviewed files; generated indexes are left to their canonical generators.
for p, text in contents.items():
 if p != TARGET:
  Path(p).write_bytes(text.encode('utf-8'))
Path(TARGET).unlink()
(OUT / 'allowed-paths.json').write_text(json.dumps(sorted([*EXPECTED, 'docs/planning/reviews/ci-and-delivery/index.md', 'docs/.manifest.json']), indent=2) + '\n')
print('Prepared one deletion and the reviewed consumers; final validation has not run yet.')
