const { workspaceRow, repoRoot } = require('./generate-code-status-tests/helpers.cjs');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const yaml = require('js-yaml');
const generatorPath = path.join(repoRoot, 'scripts', 'generate-code-status.cjs');
const policyPath = path.join(repoRoot, 'docs', 'generated-docs-policy.json');
const prQualityWorkflowPath = path.join(repoRoot, '.github', 'workflows', 'pr-quality-gate.yml');
const docsDeployWorkflowPath = path.join(repoRoot, '.github', 'workflows', 'docs-deploy.yml');
const zensicalRequirementsPath = path.join(repoRoot, '.github', 'requirements', 'zensical.lock');
const zensicalRequirementsInputPath = path.join(repoRoot, '.github', 'requirements', 'zensical.in');
const workflowScopePath = path.join(repoRoot, 'tools', 'ci', 'policy', 'workflow-scope.json');
const packageJson = require('../package.json');
function assertPrWorkflowSkipsDocumentationPublicationToolchain(steps) {
  const stepNames = steps.map((step) => step.name);
  assert.equal(stepNames.includes('Setup Python for DB-first documentation publication'), false);
  assert.equal(
    stepNames.includes('Install Zensical for DB-first documentation publication'),
    false
  );
  assert.equal(stepNames.includes('Validate DB-first documentation publication and links'), false);
  assert.equal(
    steps.some((step) => typeof step.run === 'string' && step.run.includes('pnpm docs:publish')),
    false
  );
}
const { main, resolveGenerationMode } = require('./generate-code-status.cjs');

require('./generate-code-status-tests/workspace-membership.test.cjs');
require('./generate-code-status-tests/repository-map.test.cjs');
require('./generate-code-status-tests/component-topology.test.cjs');
require('./generate-code-status-tests/system-delivery.test.cjs');
require('./generate-code-status-tests/publication.integration.test.cjs');

test('generation modes isolate each on-demand documentation projection', async () => {
  assert.equal(resolveGenerationMode([]), 'all');
  assert.equal(resolveGenerationMode(['--code-state-only']), 'code-state-only');
  assert.equal(resolveGenerationMode(['--repository-map-only']), 'repository-map-only');
  assert.equal(resolveGenerationMode(['--component-map-only']), 'component-map-only');
  assert.equal(
    resolveGenerationMode(['--system-delivery-status-only']),
    'system-delivery-status-only'
  );
  assert.equal(resolveGenerationMode(['--repository-map-only', '--check']), 'repository-map-only');
  assert.throws(
    () => resolveGenerationMode(['--code-state-only', '--repository-map-only']),
    /Choose either/u
  );

  const workspaces = [workspaceRow()];
  const calls = [];
  const evaluatedRepository = { gitSha: 'fixture-sha', release: { version: '1.2.3' } };
  const dependencies = {
    collectRepositoryWorkspaceStats: () => {
      calls.push('collect');
      return workspaces;
    },
    generateCodeState: async () => calls.push('code'),
    generateComponentMap: async () => calls.push('component-map'),
    generateRepositoryMap: async () => calls.push('map'),
    generateSystemDeliveryStatus: async (_workspaces, snapshot) => {
      assert.equal(snapshot, evaluatedRepository);
      calls.push('system-status');
    },
    readEvaluatedRepositorySnapshot: () => {
      calls.push('snapshot');
      return evaluatedRepository;
    },
  };
  await main(['--code-state-only'], dependencies);
  assert.deepEqual(calls, ['collect', 'code']);
  calls.length = 0;
  await main(['--repository-map-only'], dependencies);
  assert.deepEqual(calls, ['collect', 'map']);
  calls.length = 0;
  await main(['--component-map-only'], dependencies);
  assert.deepEqual(calls, ['component-map']);
  calls.length = 0;
  await main(['--system-delivery-status-only'], dependencies);
  assert.deepEqual(calls, ['snapshot', 'collect', 'system-status']);
});

test('routine docs status checks remain DB-free and do not publish documentation', () => {
  assert.equal(
    packageJson.scripts['docs:status:check'],
    'pnpm docs:status:generate --code-state-only --check'
  );
});

test('DB-free checks stay separate from mandatory DB-first consultation and publication', () => {
  assert.match(packageJson.scripts['docs:ci'], /docs:status:generate --code-state-only/u);

  const publicationGuidancePaths = [
    'AGENTS.md',
    'docs/DOCS_README.md',
    'docs/guides/documentation-maintenance-guide-20260407.md',
  ];
  for (const guidancePath of publicationGuidancePaths) {
    const content = fs.readFileSync(path.join(repoRoot, guidancePath), 'utf8');
    assert.match(content, /planning:db:query architecture-designs/u, guidancePath);
    assert.match(content, /pnpm docs:publish/u, guidancePath);
    assert.match(
      content,
      /docs:serve[\s\S]{0,160}(?:does not|do not) generate|(?:does not|do not) generate[\s\S]{0,160}docs:serve/iu,
      guidancePath
    );
    assert.doesNotMatch(content, /tracked Repository Map|commit the map/iu, guidancePath);
  }
});

test('code-state-only generation does not require a reachable Planning DB', () => {
  const result = spawnSync(process.execPath, [generatorPath, '--code-state-only'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://invalid:invalid@127.0.0.1:1/invalid',
      DVT_PLANNING_DB_URL: 'postgresql://invalid:invalid@127.0.0.1:1/invalid',
    },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('policy names actual inputs and the minimal generator command', () => {
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  const entry = policy.artifactClasses.find((item) => item.id === 'local-docs-repository-map');
  assert.ok(entry);
  assert.equal(entry.generatorCommand, 'pnpm docs:status:generate --repository-map-only');
  assert.deepEqual(entry.artifacts, ['.generated-docs/concepts/repository-map.md']);
  assert.equal(entry.tracking, 'untracked');
  assert.equal(entry.manualEditPolicy, 'generator-owned');
  assert.deepEqual(entry.publication, { enabled: true });
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs', 'concepts', 'repository-map.md')), false);
  assert.ok(entry.sourcePaths.includes('package.json'));
  assert.ok(entry.sourcePaths.includes('pnpm-workspace.yaml'));
  assert.ok(entry.sourcePaths.includes('scripts/generated-doc-date.cjs'));
  for (const sourcePath of [
    'scripts/planning-db/current-schema.cjs',
    'tools/planning-db/schema/manifest.cjs',
    'tools/planning-db/schema/**/*.sql',
  ]) {
    assert.ok(entry.sourcePaths.includes(sourcePath), sourcePath);
  }
  assert.ok(!entry.sourcePaths.includes('tools/planning-db/state/canonical-state.json'));
  assert.ok(entry.sourcePaths.includes('scripts/planning-db-import.cjs'));
  assert.ok(
    entry.sourcePaths.includes('docs/planning/status/system-governance-unit-index.units.yaml')
  );
  assert.ok(entry.sourcePaths.includes('docs/*.md'));
  assert.ok(entry.sourcePaths.includes('docs/**/*.md'));
  assert.ok(entry.sourcePaths.includes('buzon/*.md'));
  for (const sourcePath of [
    '.',
    'README.md',
    '**/README.md',
    '**/package.json',
    '**/src/**',
    '**/test/**',
  ]) {
    assert.ok(entry.sourcePaths.includes(sourcePath), sourcePath);
  }
  assert.equal(
    entry.sourcePaths.some((value) => value.includes('subject_key')),
    false
  );
});

test('Component Map policy is DB-first, on-demand, and has no manual catalog', () => {
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  const entry = policy.artifactClasses.find((item) => item.id === 'local-docs-component-map');
  assert.ok(entry);
  assert.equal(entry.generatorCommand, 'pnpm docs:status:generate --component-map-only');
  assert.deepEqual(entry.artifacts, ['.generated-docs/architecture/component-map.md']);
  assert.equal(entry.tracking, 'untracked');
  assert.equal(entry.manualEditPolicy, 'generator-owned');
  assert.deepEqual(entry.publication, { enabled: true });
  assert.ok(entry.sourcePaths.includes('scripts/planning-db-query.cjs'));
  for (const sourcePath of [
    'scripts/planning-db/current-schema.cjs',
    'tools/planning-db/schema/manifest.cjs',
    'tools/planning-db/schema/**/*.sql',
  ]) {
    assert.ok(entry.sourcePaths.includes(sourcePath), sourcePath);
  }
  assert.deepEqual(
    entry.dbBackedArtifacts.map((group) => group.queryView),
    [
      'architecture.component_query',
      'architecture.relation_query',
      'architecture.responsibility_query',
      'architecture.maturity_query',
      'architecture.drift_query',
      'planning_query_store.component_engineering_document_query',
    ]
  );
  for (const group of entry.dbBackedArtifacts) {
    assert.deepEqual(group.artifacts, ['.generated-docs/architecture/component-map.md']);
    assert.equal(group.importCommand, 'pnpm planning:db:import');
    assert.equal(group.checkCommand, 'pnpm docs:status:generate --component-map-only');
  }

  assert.equal(
    fs.existsSync(path.join(repoRoot, 'docs', 'architecture', 'component-map.md')),
    false
  );
  const componentIndex = fs.readFileSync(
    path.join(repoRoot, 'docs', 'architecture', 'components', 'index.md'),
    'utf8'
  );
  assert.doesNotMatch(componentIndex, /## Current Component Entry Points/u);
  assert.match(componentIndex, /DB-first Component Map/u);
});

test('System Delivery Status policy is DB-first, on-demand, and has no manual snapshot', () => {
  const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
  const entry = policy.artifactClasses.find(
    (item) => item.id === 'local-docs-system-delivery-status'
  );
  assert.ok(entry);
  assert.equal(entry.generatorCommand, 'pnpm docs:status:generate --system-delivery-status-only');
  assert.deepEqual(entry.artifacts, ['.generated-docs/architecture/system-delivery-status.md']);
  assert.equal(entry.tracking, 'untracked');
  assert.equal(entry.manualEditPolicy, 'generator-owned');
  assert.deepEqual(entry.publication, { enabled: true });
  assert.equal(
    fs.existsSync(path.join(repoRoot, 'docs', 'architecture', 'system-delivery-status.md')),
    false
  );
  assert.ok(entry.sourcePaths.includes('package.json'));
  assert.ok(entry.sourcePaths.includes('.release-please-manifest.json'));
  assert.ok(entry.sourcePaths.includes('CHANGELOG.md'));
  assert.ok(!entry.sourcePaths.includes('tools/planning-db/state/canonical-state.json'));
  assert.deepEqual(
    entry.dbBackedArtifacts.map((group) => group.queryView),
    [
      'architecture.component_query',
      'architecture.maturity_query',
      'planning_query_store.command_query_rail_query',
      'planning_query_store.command_query_rail_manifest_query',
    ]
  );
  for (const group of entry.dbBackedArtifacts) {
    assert.deepEqual(group.artifacts, ['.generated-docs/architecture/system-delivery-status.md']);
    assert.equal(group.importCommand, 'pnpm planning:db:import');
    assert.equal(group.checkCommand, 'pnpm docs:status:generate --system-delivery-status-only');
  }
});

test('generator no longer reads the empty documentation panel binding', () => {
  const source = fs.readFileSync(generatorPath, 'utf8');
  assert.doesNotMatch(source, /documentation_panel_query/u);
  assert.match(source, /not in \('deprecated', 'drift'\)/u);
  assert.match(source, /pnpmCommand\(\)/u);
  assert.doesNotMatch(source, /npm_lifecycle_event === 'docs:status:check'/u);
});

test('on-demand Planning DB publication provides explicit Git refs to the importer', () => {
  const workflow = yaml.load(fs.readFileSync(docsDeployWorkflowPath, 'utf8'));
  const workflowScope = JSON.parse(fs.readFileSync(workflowScopePath, 'utf8'));
  const publicationAuthorityStep = workflow.jobs['build-deploy'].steps.find(
    (step) => step.name === 'Prepare Planning DB publication authority'
  );

  assert.ok(publicationAuthorityStep, 'expected the on-demand Planning DB publication step');
  assert.equal(publicationAuthorityStep.env.GIT_BASE, '${{ github.sha }}');
  assert.equal(publicationAuthorityStep.env.GIT_HEAD, '${{ github.sha }}');
  assert.ok(workflowScope.generated_status_relevant.includes('scripts/generated-doc-date.cjs'));
  assert.ok(
    !workflowScope.generated_status_relevant.includes(
      'tools/planning-db/state/canonical-state.json'
    )
  );
  assert.ok(workflowScope.generated_status_relevant.includes('scripts/planning-db-import.cjs'));
  assert.ok(
    workflowScope.generated_status_relevant.includes(
      'docs/planning/status/system-governance-unit-index.units.yaml'
    )
  );
  assert.ok(workflowScope.generated_status_relevant.includes('docs/*.md'));
  assert.ok(workflowScope.generated_status_relevant.includes('docs/**/*.md'));
  assert.ok(workflowScope.generated_status_relevant.includes('buzon/*.md'));
  for (const sourcePath of [
    'README.md',
    'src/**',
    'test/**',
    '**/README.md',
    '**/package.json',
    '**/src/**',
    '**/test/**',
  ]) {
    assert.ok(workflowScope.generated_status_relevant.includes(sourcePath), sourcePath);
  }
});

test('ordinary PR checks skip publication while explicit docs deploy pins Zensical', () => {
  const workflow = yaml.load(fs.readFileSync(prQualityWorkflowPath, 'utf8'));
  const deployWorkflow = yaml.load(fs.readFileSync(docsDeployWorkflowPath, 'utf8'));
  const steps = workflow.jobs['pr-checks'].steps;
  const deploySteps = deployWorkflow.jobs['build-deploy'].steps;
  const canonicalSetup = deploySteps.find((step) => step.name === 'Setup Python');
  const canonicalInstall = deploySteps.find((step) => step.name === 'Install Zensical');

  assertPrWorkflowSkipsDocumentationPublicationToolchain(steps);
  assert.match(canonicalSetup.uses, /^actions\/setup-python@[0-9a-f]{40}$/u);
  assert.equal(canonicalSetup.with['python-version'], '3.12.10');
  assert.equal(canonicalSetup.with.cache, 'pip');
  assert.equal(canonicalSetup.with['cache-dependency-path'], '.github/requirements/zensical.lock');
  assert.equal(
    canonicalInstall.run.trim(),
    'python -m pip install --disable-pip-version-check --require-hashes -r .github/requirements/zensical.lock'
  );
  assert.doesNotMatch(canonicalInstall.run, /--upgrade/u);

  const lockedRequirements = fs.readFileSync(zensicalRequirementsPath, 'utf8');
  const directRequirements = fs
    .readFileSync(zensicalRequirementsInputPath, 'utf8')
    .replaceAll('\r\n', '\n');
  assert.equal(directRequirements, 'pip==26.0.1\nzensical==0.0.39\n');
  assert.match(lockedRequirements, /\.github\/requirements\/zensical\.in/u);
  assert.match(lockedRequirements, /^pip==26\.0\.1\s+\\$/mu);
  assert.match(lockedRequirements, /^zensical==0\.0\.39\s+\\$/mu);
  assert.match(lockedRequirements, /--hash=sha256:[0-9a-f]{64}/u);
});
