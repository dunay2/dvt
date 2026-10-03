import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WORKSPACE_ENTRIES,
  buildChangedScopeContext,
  classifyPackageJsonChange,
  computeTestPackageMatrix,
  computeWorkflowModeScopeOutputs,
  computeWorkspaceMatrix,
} from './scope-config.mjs';

function classifyLintStagedMetadataChange() {
  return classifyPackageJsonChange(
    {
      scripts: {},
      'lint-staged': {
        'apps/**/*.{ts,tsx}': ['eslint --fix'],
      },
    },
    {
      scripts: {},
      'lint-staged': {
        'apps/**/*.{ts,tsx}': ['eslint --fix --config tools/ci/eslint-precommit.config.cjs'],
      },
    }
  );
}

test('lint-staged metadata stays in CI validation without runtime fan-out', () => {
  const classification = classifyLintStagedMetadataChange();

  assert.equal(classification.nonScriptChange, true);
  assert.equal(classification.dependencySensitive, false);
  assert.equal(classification.rootBuildSensitive, false);
  assert.equal(classification.ciToolingSensitive, true);

  const context = { packageJsonChange: classification };
  assert.deepEqual(computeWorkspaceMatrix(['package.json'], context).include, []);
  assert.deepEqual(computeTestPackageMatrix(['package.json'], context).include, []);

  const testScope = computeWorkflowModeScopeOutputs('test', ['package.json'], context);
  assert.equal(testScope.root_build_sensitive, false);

  const workflowScope = computeWorkflowModeScopeOutputs('workflow', ['package.json'], context);
  assert.equal(workflowScope.changed_file_validation_relevant, true);
  assert.equal(workflowScope.ci_tool_executable_contracts_relevant, true);
});

test('package json governance db alias stays out of runtime workspace scope', () => {
  const previousPackage = { scripts: {} };
  const nextPackage = {
    scripts: {
      'governance:db:query': 'node scripts/planning-db-query.cjs',
    },
  };

  const classification = classifyPackageJsonChange(previousPackage, nextPackage);

  assert.equal(classification.packageScriptsOnly, true);
  assert.equal(classification.governanceToolingOnly, true);
  assert.equal(classification.rootBuildSensitive, false);
  assert.equal(classification.temporalCapabilitySensitive, false);
  assert.equal(classification.postgresCapabilitySensitive, false);
  assert.equal(classification.contractCapabilitySensitive, false);

  const matrix = computeWorkspaceMatrix(['package.json'], {
    packageJsonChange: classification,
  });
  assert.equal(matrix.anyChanged, false);
  assert.deepEqual(matrix.include, []);
});

test('package json runtime script change keeps root-build fan-out', () => {
  const previousPackage = { scripts: { build: 'turbo run build' } };
  const nextPackage = { scripts: { build: 'turbo run build --force' } };

  const classification = classifyPackageJsonChange(previousPackage, nextPackage);

  assert.equal(classification.rootBuildSensitive, true);
  assert.equal(classification.packageScriptsOnly, true);

  const matrix = computeWorkspaceMatrix(['package.json'], {
    packageJsonChange: classification,
  });
  assert.equal(matrix.anyChanged, true);
  assert.equal(matrix.include.length, WORKSPACE_ENTRIES.length);
});

const releaseFiles = ['package.json', 'CHANGELOG.md', '.release-please-manifest.json'];
const beforeRelease = { version: '0.18.0', scripts: { build: 'turbo run build' } };
const afterRelease = { ...beforeRelease, version: '0.19.0' };

test('release metadata flows through Git blob context without product fan-out', async () => {
  const reads = [];
  const context = await buildChangedScopeContext(releaseFiles, {
    baseRef: 'base',
    headRef: 'head',
    readJsonAtRef: async (ref, file) => {
      reads.push([ref, file]);
      return ref === 'base' ? beforeRelease : afterRelease;
    },
  });

  assert.deepEqual(reads, [
    ['base', 'package.json'],
    ['head', 'package.json'],
  ]);
  assert.equal(context.packageJsonChange.nonScriptChange, true);
  assert.equal(context.packageJsonChange.dependencySensitive, false);
  assert.deepEqual(computeWorkspaceMatrix(releaseFiles, context).include, []);
  assert.deepEqual(computeTestPackageMatrix(releaseFiles, context).include, []);
  for (const mode of ['test', 'contracts', 'pr-quality', 'workflow']) {
    const selected = Object.entries(computeWorkflowModeScopeOutputs(mode, releaseFiles, context))
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);
    assert.deepEqual(
      selected,
      mode === 'workflow' ? ['changed_file_validation_relevant'] : [],
      mode
    );
  }
});

test('root text metadata stays narrow, but non-string values remain sensitive', () => {
  for (const field of ['version', 'description', 'homepage', 'repository']) {
    const previous = { ...beforeRelease, [field]: 'before' };
    const next = { ...beforeRelease, [field]: 'after' };
    assert.equal(classifyPackageJsonChange(previous, next).rootBuildSensitive, false, field);
    for (const value of [null, 42, [], { value: 'after' }]) {
      assert.equal(
        classifyPackageJsonChange(previous, { ...next, [field]: value }).rootBuildSensitive,
        true,
        field
      );
      assert.equal(
        classifyPackageJsonChange({ ...previous, [field]: value }, next).rootBuildSensitive,
        true,
        field
      );
    }
  }
});

test('release metadata never narrows executable, dependency, toolchain or unknown fields', () => {
  const executableChanges = {
    dependencies: { library: '1.0.0' },
    devDependencies: { tool: '1.0.0' },
    optionalDependencies: { optional: '1.0.0' },
    peerDependencies: { peer: '1.0.0' },
    scripts: { build: 'turbo run build --force' },
    bin: './cli.js',
    exports: './index.js',
    main: './index.js',
    types: './index.d.ts',
    files: ['dist'],
    engines: { node: '>=24' },
    packageManager: 'pnpm@10.33.0',
    workspaces: ['packages/*'],
    pnpm: { overrides: {} },
    unknown: true,
  };
  for (const [field, value] of Object.entries(executableChanges)) {
    const context = {
      packageJsonChange: classifyPackageJsonChange(beforeRelease, {
        ...afterRelease,
        [field]: value,
      }),
    };
    assert.equal(context.packageJsonChange.rootBuildSensitive, true, field);
    assert.equal(
      computeWorkspaceMatrix(releaseFiles, context).include.length,
      WORKSPACE_ENTRIES.length,
      field
    );
  }
});

test('release metadata preserves scope for accompanying source and lockfile changes', () => {
  const context = { packageJsonChange: classifyPackageJsonChange(beforeRelease, afterRelease) };
  for (const file of [
    'apps/web/src/app.tsx',
    'packages/@dvt/engine/src/index.ts',
    'pnpm-lock.yaml',
  ]) {
    const files = [...releaseFiles, file];
    assert.deepEqual(computeWorkspaceMatrix(files, context), computeWorkspaceMatrix([file]), file);
    assert.deepEqual(
      computeTestPackageMatrix(files, context),
      computeTestPackageMatrix([file]),
      file
    );
    for (const mode of ['test', 'contracts', 'pr-quality']) {
      assert.deepEqual(
        computeWorkflowModeScopeOutputs(mode, files, context),
        computeWorkflowModeScopeOutputs(mode, [file]),
        `${file}: ${mode}`
      );
    }
  }
});

test('malformed package blobs, missing refs and failed reads retain full scope', async () => {
  for (const value of [null, [], 'not a package', 42]) {
    assert.equal(classifyPackageJsonChange(value, afterRelease).failClosed, true);
    assert.equal(classifyPackageJsonChange(beforeRelease, value).failClosed, true);
  }
  for (const options of [
    {},
    {
      baseRef: 'base',
      headRef: 'head',
      readJsonAtRef: async () => {
        throw new SyntaxError('Unreadable package JSON');
      },
    },
  ]) {
    const context = await buildChangedScopeContext(releaseFiles, options);
    assert.equal(context.packageJsonChange.failClosed, true);
    assert.equal(
      computeWorkspaceMatrix(releaseFiles, context).include.length,
      WORKSPACE_ENTRIES.length
    );
  }
});

test('package json without semantic context still fails closed for workspace matrix', () => {
  const matrix = computeWorkspaceMatrix(['package.json']);

  assert.equal(matrix.anyChanged, true);
  assert.equal(matrix.include.length, WORKSPACE_ENTRIES.length);
});

test('package json read failure class fails closed for workspace matrix', () => {
  const matrix = computeWorkspaceMatrix(['package.json'], {
    packageJsonChange: {
      failClosed: true,
      rootBuildSensitive: true,
      dependencySensitive: true,
      lifecycleSensitive: true,
      ciToolingSensitive: true,
    },
  });

  assert.equal(matrix.anyChanged, true);
  assert.equal(matrix.include.length, WORKSPACE_ENTRIES.length);
});
