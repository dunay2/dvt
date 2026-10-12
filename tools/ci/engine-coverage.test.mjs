import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import yaml from 'js-yaml';
import { parseCLI, resolveConfig } from 'vitest/node';

const root = fileURLToPath(new URL('../..', import.meta.url));
const engineRoot = path.join(root, 'packages/@dvt/engine');
const engineConfig = path.join(engineRoot, 'vitest.config.ts');
const require = createRequire(import.meta.url);
const rootPackage = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

function coverageArguments() {
  const command = rootPackage.scripts['test:coverage:engine'];
  const match = /^pnpm --filter @dvt\/engine test\s+(.+)$/u.exec(command);
  assert.ok(match, 'Coverage must retain the engine test/pretest lifecycle');
  return match[1].split(/\s+/u);
}

test('the public command enables coverage in the installed Vitest CLI', () => {
  const { options } = parseCLI(['vitest', 'run', ...coverageArguments()]);
  assert.equal(options.coverage?.enabled, true);
  assert.deepEqual(options['--'], []);
});

test('engine coverage uses the root policy and includes unexecuted source', async () => {
  const [{ vitestConfig: engine }, { vitestConfig: repository }] = await Promise.all([
    resolveConfig({ root: engineRoot, config: engineConfig }),
    resolveConfig({ root, config: path.join(root, 'vitest.config.ts') }),
  ]);
  assert.deepEqual(engine.coverage.thresholds, repository.coverage.thresholds);
  assert.deepEqual(engine.coverage.thresholds, {
    statements: 65,
    branches: 55,
    functions: 65,
    lines: 65,
  });
  assert.equal(engine.coverage.provider, 'v8');
  assert.equal(engine.coverage.all, true);
  assert.equal(engine.coverage.clean, true);
  assert.deepEqual(engine.coverage.include, ['src/**/*.ts']);
  assert.deepEqual(engine.include, ['test/**/*.test.ts']);
  assert.ok(engine.coverage.reporter.some(([name]) => name === 'json'));
});

test('the workflow requires the actual JSON report instead of an optional directory', () => {
  const workflow = yaml.load(readFileSync(path.join(root, '.github/workflows/test.yml'), 'utf8'));
  const steps = workflow.jobs.coverage.steps;
  assert.ok(steps.some((step) => step.run === 'pnpm test:coverage:engine'));
  const upload = steps.find((step) => step.uses?.startsWith('actions/upload-artifact@'));
  assert.equal(upload.with.path, 'packages/@dvt/engine/coverage/coverage-final.json');
  assert.equal(upload.with['if-no-files-found'], 'error');
  assert.equal(upload['continue-on-error'], undefined);
  assert.equal(upload.if, 'always()');
  assert.equal(workflow.jobs.coverage['continue-on-error'], undefined);
});

test('real Vitest rejects low coverage and stale reports, then passes the covered control', () => {
  const fixtureParent = path.join(root, 'tmp');
  mkdirSync(fixtureParent, { recursive: true });
  const fixture = mkdtempSync(path.join(fixtureParent, 'engine-coverage-'));
  try {
    mkdirSync(path.join(fixture, 'src'));
    mkdirSync(path.join(fixture, 'test'));
    mkdirSync(path.join(fixture, 'coverage'));
    writeFileSync(path.join(fixture, 'coverage/stale-marker'), 'not coverage evidence');
    writeFileSync(
      path.join(fixture, 'vitest.config.mjs'),
      `
      import engine from ${JSON.stringify(path.relative(fixture, engineConfig).replaceAll('\\', '/'))};
      export default { ...engine, root: ${JSON.stringify(fixture)}, test: {
        ...engine.test, maxWorkers: 1, minWorkers: 1, fileParallelism: false
      } };
    `
    );
    writeFileSync(path.join(fixture, 'src/covered.ts'), 'export const covered = () => 1;');
    const functions = Array.from({ length: 12 }, (_, index) => `uncovered${index}`);
    writeFileSync(
      path.join(fixture, 'src/unexecuted.ts'),
      functions.map((name) => `export function ${name}() {\n  return 2;\n}\n`).join('\n')
    );
    const testPath = path.join(fixture, 'test/coverage.test.ts');
    const positiveTest = `import { expect, test } from 'vitest';
      import { covered } from '../src/covered';
      test('covered', () => expect(covered()).toBe(1));`;
    writeFileSync(testPath, positiveTest);
    const run = () =>
      spawnSync(
        process.execPath,
        [
          require.resolve('vitest/vitest.mjs'),
          'run',
          ...coverageArguments(),
          '--config',
          path.join(fixture, 'vitest.config.mjs'),
        ],
        { cwd: fixture, encoding: 'utf8', timeout: 30_000 }
      );
    const rejected = run();
    assert.ifError(rejected.error);
    assert.equal(rejected.status, 1, rejected.stdout + rejected.stderr);
    assert.match(rejected.stdout + rejected.stderr, /Coverage.*does not meet.*threshold/u);
    assert.equal(existsSync(path.join(fixture, 'coverage/stale-marker')), false);
    const report = JSON.parse(
      readFileSync(path.join(fixture, 'coverage/coverage-final.json'), 'utf8')
    );
    const unexecuted = Object.entries(report).find(([file]) => file.endsWith('unexecuted.ts'))?.[1];
    assert.ok(unexecuted, 'Unexecuted source must contribute to the coverage denominator');
    assert.ok(Object.values(unexecuted.s).every((count) => count === 0));
    writeFileSync(
      testPath,
      `${positiveTest}
      import * as unexecuted from '../src/unexecuted';
      test('remaining source', () => {
        for (const fn of Object.values(unexecuted)) expect(fn()).toBe(2);
      });`
    );
    const accepted = run();
    assert.ifError(accepted.error);
    assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
    assert.ok(existsSync(path.join(fixture, 'coverage/coverage-final.json')));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
