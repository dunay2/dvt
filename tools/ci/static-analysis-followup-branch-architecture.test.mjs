import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const componentGuides = [
  {
    label: 'start-run admission',
    path: 'docs/architecture/components/engine/architecture/start-run-admission-component.md',
    requiredTerms: [
      'RunExecutionContextAdmissionRequest',
      'StartRunAdmissionGuard',
      'RunExecutionContextAdmissionPolicy',
      'IRunExecutionContextResolver',
      '```mermaid',
    ],
  },
  {
    label: 'generic artifact lineage extraction',
    path: 'docs/architecture/components/lineage-worker/artifact-lineage-extraction-component.md',
    requiredTerms: [
      'StepArtifactRef',
      'readVerifiedArtifactBytes',
      'compiled-sql',
      '@dvt/artifacts',
      '```mermaid',
    ],
  },
];

const requiredGuideSections = [
  '## Public API',
  '## Invariants',
  '## Transitions',
  '## Consumers',
  '## Diagrams',
];

const userStoryDocs = [
  {
    label: 'start-run admission',
    path: 'docs/architecture/components/engine/architecture/start-run-admission-user-stories.md',
    requiredTerms: [
      'As an operator',
      'RunExecutionContextAdmissionRequest',
      'Given',
      'When',
      'Then',
      'Negative scenarios',
      'Traceability',
    ],
  },
  {
    label: 'generic artifact lineage extraction',
    path: 'docs/architecture/components/lineage-worker/artifact-lineage-extraction-user-stories.md',
    requiredTerms: [
      'As a lineage consumer',
      'StepArtifactRef',
      'Given',
      'when',
      'then',
      'Negative scenarios',
      'Traceability',
    ],
  },
];

function read(path) {
  return readFileSync(path, 'utf8');
}

test('branch-adjacent component guides publish API, invariants, transitions, consumers, and diagrams', () => {
  for (const guide of componentGuides) {
    assert.equal(existsSync(guide.path), true, `${guide.label} guide is missing`);
    const source = read(guide.path);

    for (const section of requiredGuideSections) {
      assert.match(source, new RegExp(section), `${guide.label} guide lacks ${section}`);
    }
    for (const term of guide.requiredTerms) {
      assert.match(source, new RegExp(term), `${guide.label} guide lacks ${term}`);
    }
  }
});

test('branch-adjacent source modules declare semantic ownership at module start', () => {
  const startRunAdmissionGuard = read(
    'packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts'
  ).slice(0, 260);
  assert.match(startRunAdmissionGuard, /^\/\*\*[\s\S]*@ownedConcern/);
  assert.match(
    startRunAdmissionGuard,
    /@ownedConcern Coordinate start-run admission orchestration/
  );

  const runExecutionContextPolicy = read(
    'packages/@dvt/engine/src/services/startRun/RunExecutionContextAdmissionPolicy.ts'
  ).slice(0, 260);
  assert.match(runExecutionContextPolicy, /^\/\*\*[\s\S]*@ownedConcern/);
  assert.match(runExecutionContextPolicy, /generic run-execution-context admission/);

  const lineageMapper = read(
    'packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts'
  ).slice(0, 300);
  assert.match(lineageMapper, /^\/\*\*[\s\S]*@ownedConcern/);
  assert.match(lineageMapper, /generic artifact references/);
});

test('branch semantics keep policy, lineage extraction, and test setup behind named objects', () => {
  const guardSource = read('packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts');
  const policySource = read(
    'packages/@dvt/engine/src/services/startRun/RunExecutionContextAdmissionPolicy.ts'
  );
  const lineageMapperSource = read(
    'packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts'
  );
  const temporalActivitiesTestSource = read(
    'packages/@dvt/adapter-temporal/test/activities.test.ts'
  );

  assert.match(policySource, /export type RunExecutionContextAdmissionRequest = Readonly<\{/);
  assert.match(policySource, /assertAllowed\(\{[\s\S]*\}: RunExecutionContextAdmissionRequest\)/);
  assert.doesNotMatch(
    policySource,
    /assertAllowed\(\s*plan:\s*ExecutionPlan,\s*planRef:\s*PlanRef/
  );
  assert.match(guardSource, /this\.runExecutionContextPolicy\.assertAllowed\(\{/);

  assert.match(lineageMapperSource, /StepArtifactRefSchema\.safeParse/);
  assert.match(lineageMapperSource, /readVerifiedArtifactBytes\(artifactRef/);
  assert.match(lineageMapperSource, /artifactRef\.artifactKind !== COMPILED_SQL_ARTIFACT_KIND/);
  assert.doesNotMatch(lineageMapperSource, /compiledCodeRef|CompiledCodeRef/);

  assert.match(temporalActivitiesTestSource, /type SetupActivitiesOptions = Readonly<\{/);
  assert.match(
    temporalActivitiesTestSource,
    /function setupActivities\(\{[\s\S]*\}: SetupActivitiesOptions = \{\}\)/
  );
  assert.doesNotMatch(temporalActivitiesTestSource, /setupActivities\(undefined/);
});

test('active component indexes link the generic lineage guide', () => {
  const lineageIndex = read('docs/architecture/components/lineage-worker/index.md');
  assert.match(lineageIndex, /artifact-lineage-extraction-component\.md/);
  assert.match(lineageIndex, /artifact-lineage-extraction-user-stories\.md/);
  assert.doesNotMatch(lineageIndex, /compiled-code-ref-lineage-extraction/);
});

test('branch-adjacent user stories cover success, degraded, and negative scenarios', () => {
  for (const storyDoc of userStoryDocs) {
    assert.equal(existsSync(storyDoc.path), true, `${storyDoc.label} user stories are missing`);
    const source = read(storyDoc.path);

    for (const term of storyDoc.requiredTerms) {
      assert.match(source, new RegExp(term, 'i'), `${storyDoc.label} user stories lack ${term}`);
    }
  }
});
