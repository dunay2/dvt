import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  DEFAULT_FILTER,
  SUPPORTED_TASKS,
  buildTurboArgs,
  parseArgs,
} = require('../../scripts/run-turbo-workspace-task.cjs');

const turbo = JSON.parse(readFileSync('turbo.json', 'utf8'));
const rootPackage = JSON.parse(readFileSync('package.json', 'utf8'));
const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const testWorkflow = readFileSync('.github/workflows/test.yml', 'utf8');

test('Turbo workspace wrapper rejects unsupported task names and defaults to the affected filter', () => {
  assert.throws(() => parseArgs([]), /Unsupported Turbo workspace task/);
  assert.throws(() => parseArgs(['lint']), /Unsupported Turbo workspace task/);
  assert.deepEqual(parseArgs(['typecheck']), {
    task: 'typecheck',
    filter: DEFAULT_FILTER,
  });
  assert.deepEqual(parseArgs(['test', '--filter', '@dvt/engine']), {
    task: 'test',
    filter: '@dvt/engine',
  });
  assert.deepEqual(parseArgs(['build', '--filter=@dvt/web']), {
    task: 'build',
    filter: '@dvt/web',
  });
  assert.deepEqual(buildTurboArgs('typecheck', '@dvt/contracts'), [
    'exec',
    'turbo',
    'run',
    'typecheck',
    '--filter=@dvt/contracts',
  ]);
  assert.deepEqual([...SUPPORTED_TASKS], ['build', 'test', 'typecheck']);
});

test('turbo.json declares governed build, typecheck, and test task contracts', () => {
  assert.ok(turbo.globalDependencies.includes('turbo.json'));
  assert.ok(turbo.globalDependencies.includes('scripts/skip-prebuild-if-orchestrated.cjs'));
  assert.ok(turbo.globalDependencies.includes('scripts/skip-pretest-if-ci.cjs'));
  assert.deepEqual(turbo.tasks.build.dependsOn, ['^build']);
  assert.deepEqual(turbo.tasks.build.outputs, ['dist/**', '**/*.tsbuildinfo']);
  assert.deepEqual(turbo.tasks.build.env, ['DVT_CI']);

  assert.deepEqual(turbo.tasks.typecheck.dependsOn, ['^build']);
  assert.deepEqual(turbo.tasks.typecheck.outputs, []);
  assert.deepEqual(turbo.tasks.typecheck.env, ['DVT_CI']);

  assert.deepEqual(turbo.tasks.test.dependsOn, ['^build']);
  assert.deepEqual(turbo.tasks.test.outputs, []);
  assert.deepEqual(turbo.tasks.test.env, ['DVT_CI']);
});

test('root affected commands and CI matrix build/typecheck steps use the Turbo workspace wrapper', () => {
  assert.equal(
    rootPackage.scripts['ci:affected:build'],
    'node scripts/run-turbo-workspace-task.cjs build'
  );
  assert.equal(
    rootPackage.scripts['ci:affected:typecheck'],
    'node scripts/run-turbo-workspace-task.cjs typecheck'
  );
  assert.equal(
    rootPackage.scripts['ci:affected:test'],
    'node scripts/run-turbo-workspace-task.cjs test'
  );

  assert.ok(
    ciWorkflow.includes(
      'node scripts/run-turbo-workspace-task.cjs build --filter=${{ matrix.pkg }}'
    )
  );
  assert.ok(
    ciWorkflow.includes(
      'node scripts/run-turbo-workspace-task.cjs typecheck --filter=${{ matrix.pkg }}'
    )
  );
  assert.ok(
    testWorkflow.includes(
      'node scripts/run-turbo-workspace-task.cjs build --filter=...[origin/${{ github.base_ref }}]'
    )
  );
  assert.equal(testWorkflow.includes('declare -A seen'), false);
});
