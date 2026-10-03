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

  const context = { 'package.json': classification };
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
    'package.json': classification,
  });
  assert.equal(matrix.anyChanged, false);
  assert.deepEqual(matrix.include, []);
});

const releaseFiles = ['package.json', 'CHANGELOG.md', '.release-please-manifest.json'];
const beforeRelease = { version: '0.18.0', scripts: { build: 'turbo run build' } };
const metadata = {
  version: '0.19.0',
  description: 'Updated description',
  homepage: 'https://example.test',
  repository: { type: 'git', url: 'https://example.test/repo.git', directory: 'packages/example' },
  bugs: { url: 'https://example.test/issues', email: 'support@example.test' },
  keywords: ['data', 'workflow'],
};
const workspaceManifests = WORKSPACE_ENTRIES.map(({ patterns }) =>
  patterns[0].replace('/**', '/package.json')
);
const modes = ['test', 'contracts', 'pr-quality', 'workflow'];

function assertScopePreserved(files, context, expectedFiles = files) {
  assert.deepEqual(computeWorkspaceMatrix(files, context), computeWorkspaceMatrix(expectedFiles));
  assert.deepEqual(
    computeTestPackageMatrix(files, context),
    computeTestPackageMatrix(expectedFiles)
  );
  for (const mode of modes) {
    assert.deepEqual(
      computeWorkflowModeScopeOutputs(mode, files, context),
      computeWorkflowModeScopeOutputs(mode, expectedFiles),
      mode
    );
  }
}

test('release metadata uses one reader for root and every cataloged workspace', async () => {
  const files = [...releaseFiles, ...workspaceManifests, 'apps\\web\\package.json'];
  const reads = [];
  const context = await buildChangedScopeContext(files, {
    baseRef: 'base',
    headRef: 'head',
    readJsonAtRef: async (ref, file) => {
      reads.push([ref, file]);
      return ref === 'base' ? beforeRelease : { ...beforeRelease, ...metadata };
    },
  });

  assert.deepEqual(
    reads,
    ['package.json', ...workspaceManifests].flatMap((file) => [
      ['base', file],
      ['head', file],
    ])
  );
  for (const file of ['package.json', ...workspaceManifests]) {
    assert.equal(context[file].metadataOnly, true, file);
    assert.deepEqual(computeWorkspaceMatrix([file], context).include, [], file);
    assert.deepEqual(computeTestPackageMatrix([file], context).include, [], file);
  }
  for (const mode of modes) {
    const enabled = Object.entries(computeWorkflowModeScopeOutputs(mode, files, context))
      .filter(([, value]) => value)
      .map(([key]) => key);
    assert.deepEqual(
      enabled,
      mode === 'workflow' ? ['changed_file_validation_relevant'] : [],
      mode
    );
  }
});

test('display metadata additions and removals are narrow, malformed values are not', () => {
  for (const [field, values] of Object.entries({
    version: ['0.19.0'],
    description: ['Description'],
    homepage: ['https://example.test'],
    repository: ['owner/repo', metadata.repository],
    bugs: ['https://example.test/issues', metadata.bugs, { email: 'support@example.test' }],
    keywords: [[], ['data']],
  })) {
    for (const value of values) {
      const changed = { ...beforeRelease, [field]: value };
      assert.equal(classifyPackageJsonChange(beforeRelease, changed).metadataOnly, true, field);
      assert.equal(classifyPackageJsonChange(changed, beforeRelease).metadataOnly, true, field);
    }
    for (const value of [null, 42, { unknown: 'value' }]) {
      const changed = { ...beforeRelease, [field]: value };
      assert.equal(
        classifyPackageJsonChange(beforeRelease, changed).rootBuildSensitive,
        true,
        field
      );
      assert.equal(
        classifyPackageJsonChange(changed, beforeRelease).rootBuildSensitive,
        true,
        field
      );
    }
  }
});

test('executable, dependency, toolchain, unknown and malformed edits retain their evidence', () => {
  const changes = [
    { scripts: { build: 'turbo run build --force' } },
    { dependencies: { library: '2.0.0' } },
    { devDependencies: { tool: '2.0.0' } },
    { peerDependencies: { library: '^2' } },
    { optionalDependencies: { library: '^2' } },
    { exports: './other.js' },
    { bin: './cli.js' },
    { main: './other.js' },
    { types: './other.d.ts' },
    { files: ['dist'] },
    { engines: { node: '>=24' } },
    { packageManager: 'pnpm@10.33.0' },
    { workspaces: ['other/*'] },
    { pnpm: { overrides: {} } },
    { name: 'renamed-package' },
    { unknown: true },
    { repository: { url: 'https://example.test', unknown: true } },
    { repository: { directory: 'missing-url' } },
    { bugs: {} },
    { keywords: ['valid', 42] },
    { scripts: null },
    { scripts: [] },
    { scripts: { build: 42 } },
  ];
  for (const file of [
    'package.json',
    'apps/web/package.json',
    'packages/@dvt/contracts/package.json',
  ]) {
    for (const patch of changes) {
      const classification = classifyPackageJsonChange(beforeRelease, {
        ...beforeRelease,
        ...metadata,
        ...patch,
      });
      assert.equal(classification.metadataOnly, false, file + ':' + JSON.stringify(patch));
      assert.equal(classification.rootBuildSensitive, true);
      assertScopePreserved([file], { [file]: classification });
    }
  }
});

test('workspace scripts and lint-staged cannot reuse root-only tooling exemptions', () => {
  for (const patch of [
    { scripts: { 'governance:db:query': 'node scripts/planning-db-query.cjs' } },
    { 'lint-staged': { '*.ts': 'eslint' } },
  ]) {
    const classification = classifyPackageJsonChange({ scripts: {} }, { scripts: {}, ...patch });
    assert.equal(classification.rootBuildSensitive, false);
    assert.equal(classification.metadataOnly, false);
    const file = 'apps/web/package.json';
    assertScopePreserved([file], { [file]: classification });
  }
});

test('mixed release and source changes retain scope independently for each manifest', async () => {
  const web = 'apps/web/package.json';
  const contracts = 'packages/@dvt/contracts/package.json';
  const files = [...releaseFiles, web, contracts];
  const context = await buildChangedScopeContext(files, {
    baseRef: 'base',
    headRef: 'head',
    readJsonAtRef: async (ref, file) =>
      ref === 'base'
        ? beforeRelease
        : {
            ...beforeRelease,
            ...metadata,
            ...(file === contracts ? { exports: './other.js' } : {}),
          },
  });
  // Only the contracts manifest has executable changes.
  assertScopePreserved(files, context, [contracts]);
  for (const changed of [
    'apps/web/src/main.tsx',
    'packages/@dvt/engine/src/index.ts',
    'pnpm-lock.yaml',
  ]) {
    assertScopePreserved([...files, changed], context, [contracts, changed]);
  }
});

test('missing context, refs and unreadable blobs fail closed for root and workspace', async () => {
  for (const value of [null, [], 'not a package', 42]) {
    assert.equal(classifyPackageJsonChange(value, beforeRelease).failClosed, true);
    assert.equal(classifyPackageJsonChange(beforeRelease, value).failClosed, true);
  }
  for (const file of ['package.json', 'packages/@dvt/adapter-postgres/package.json']) {
    assertScopePreserved([file], {});
    for (const options of [
      {},
      { baseRef: 'base' },
      { headRef: 'head' },
      {
        baseRef: 'base',
        headRef: 'head',
        readJsonAtRef: async () => {
          throw new SyntaxError('Invalid JSON');
        },
      },
    ]) {
      const context = await buildChangedScopeContext([file], options);
      assert.equal(context[file].failClosed, true);
      assertScopePreserved([file], context);
    }
  }
});

test('unknown manifests and injected context cannot suppress file policy', async () => {
  const files = [
    'apps/web/test/fixtures/package.json',
    'apps/new-workspace/package.json',
    'apps/web/src/main.tsx',
  ];
  assert.deepEqual(
    await buildChangedScopeContext(files, {
      baseRef: 'base',
      headRef: 'head',
      readJsonAtRef: () => assert.fail('Not a cataloged manifest'),
    }),
    {}
  );
  assertScopePreserved(
    files,
    Object.fromEntries(files.map((file) => [file, { metadataOnly: true }]))
  );
});
