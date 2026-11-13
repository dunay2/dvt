/** Owned concern: prove native reporter integration and unchanged CLI outcome with real small children. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import reporter, { CI_TOOL_TIMING_PREFIX } from './ci-tool-test-timing-reporter.mjs';

const suiteUrl = new URL('./ci-tool-test-suite.mjs', import.meta.url).href;
const catalogUrl = new URL('./ci-tool-test-catalog.mjs', import.meta.url).href;
const cases = [
  { name: 'pass', source: "import test from 'node:test'; test('leaf', () => {});", code: 0 },
  {
    name: 'assertion',
    source:
      "import test from 'node:test'; test('leaf', () => { throw new Error('private-error-payload'); });",
    code: 1,
  },
  { name: 'syntax', source: 'this is not valid ???', code: 1 },
  {
    name: 'skip',
    source: "import test from 'node:test'; test('leaf', { skip: true }, () => {});",
    code: 0,
  },
];

for (const fixture of cases) {
  test(`actual suite preserves native ${fixture.name} result and file accounting`, () => {
    const parent = path.resolve(os.tmpdir());
    const root = mkdtempSync(path.join(parent, 'dvt-ci-timings-'));
    try {
      const relative = 'tools/ci/producer space.test.mjs';
      mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
      writeFileSync(path.join(root, relative), fixture.source);
      const script = `import { runCiToolTests } from ${JSON.stringify(suiteUrl)};
        import { EXECUTABLE_CI_TOOL_TESTS } from ${JSON.stringify(catalogUrl)};
        process.exitCode = runCiToolTests('static', {
          repoRootPath: process.cwd(), tests: [...EXECUTABLE_CI_TOOL_TESTS, ${JSON.stringify(relative)}]
        });`;
      // This fixture launches a standalone CLI; the outer test worker marker would suppress it.
      const env = { ...process.env };
      delete env.NODE_TEST_CONTEXT;
      const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
        cwd: root,
        env,
        encoding: 'utf8',
        timeout: 20_000,
      });
      assert.ifError(result.error);
      assert.equal(result.status, fixture.code, result.stderr);
      assert.match(result.stdout, /TAP version 13/u);
      const records = result.stdout
        .split(/\r?\n/u)
        .filter((line) => line.startsWith(CI_TOOL_TIMING_PREFIX))
        .map((line) => JSON.parse(line.slice(CI_TOOL_TIMING_PREFIX.length)));
      assert.equal(records.filter((r) => r.type === 'producer').length, 1);
      const summary = records.find((r) => r.type === 'summary');
      assert.ok(summary, result.stdout);
      assert.equal(summary.outcome, fixture.code === 0 ? 'passed' : 'failed');
      assert.deepEqual(
        summary.ranking.map((r) => r.file),
        [relative]
      );
      assert.ok(Number.isFinite(summary.ranking[0].durationMs));
      assert.ok(!JSON.stringify(records).includes('private-error-payload'));
      if (fixture.name === 'skip') assert.equal(summary.counts.skipped, 1);
      if (fixture.name === 'syntax') assert.equal(summary.ranking[0].counts, null);
    } finally {
      assert.equal(path.dirname(path.resolve(root)), parent);
      assert.ok(path.basename(root).startsWith('dvt-ci-timings-'));
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test('reporter ignores raw output and emits partial evidence after an interrupted stream', async () => {
  const file = path.resolve('selected.mjs');
  async function* source() {
    yield { type: 'test:stdout', data: { file, message: 'credential-payload' } };
    yield { type: 'test:stderr', data: { file, message: 'private-error-payload' } };
    yield {
      type: 'test:complete',
      data: {
        file,
        name: file,
        nesting: 0,
        line: 1,
        column: 1,
        details: { duration_ms: 0, passed: true, error: { secret: 'credential-payload' } },
      },
    };
  }
  const lines = [];
  for await (const line of reporter(source(), { files: [file] })) lines.push(line);
  assert.ok(lines.every((line) => line.startsWith(CI_TOOL_TIMING_PREFIX)));
  assert.ok(!lines.join('').includes('credential-payload'));
  assert.ok(!lines.join('').includes('private-error-payload'));
  const last = JSON.parse(lines.at(-1).slice(CI_TOOL_TIMING_PREFIX.length));
  assert.equal(last.type, 'partial');
  assert.ok(last.diagnostics.includes('missing-global-summary'));
  assert.ok(!Object.hasOwn(last, 'ranking'));
});
