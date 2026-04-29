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
    label: 'compiled-code-ref lineage extraction',
    path: 'docs/architecture/components/lineage-worker/compiled-code-ref-lineage-extraction-component.md',
    requiredTerms: [
      'extractCompiledCodeRefFromPayload',
      'stepArtifactRef',
      'compiledCodeRef',
      'ADR-0032',
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
    label: 'compiled-code-ref lineage extraction',
    path: 'docs/architecture/components/lineage-worker/compiled-code-ref-lineage-extraction-user-stories.md',
    requiredTerms: [
      'As a lineage consumer',
      'stepArtifactRef',
      'compiledCodeRef',
      'Given',
      'When',
      'Then',
      'Negative scenarios',
      'ADR-0032',
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

  const compiledCodeRef = read(
    'packages/@dvt/traceability-service/src/lineage/compiledCodeRef.ts'
  ).slice(0, 260);
  assert.match(compiledCodeRef, /^\/\*\*[\s\S]*@ownedConcern/);
  assert.match(compiledCodeRef, /canonical compiled-code references/);
});

test('branch semantics keep policy, lineage extraction, and test setup behind named objects', () => {
  const guardSource = read('packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts');
  const policySource = read(
    'packages/@dvt/engine/src/services/startRun/RunExecutionContextAdmissionPolicy.ts'
  );
  const compiledCodeRefSource = read(
    'packages/@dvt/traceability-service/src/lineage/compiledCodeRef.ts'
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

  assert.match(compiledCodeRefSource, /function extractCompiledSqlArtifactRef\(/);
  assert.match(compiledCodeRefSource, /function extractDirectCompiledCodeRef\(/);
  assert.match(
    compiledCodeRefSource,
    /extractCompiledSqlArtifactRef\(payload\) \?\? extractDirectCompiledCodeRef\(payload\)/
  );
  assert.doesNotMatch(compiledCodeRefSource, /dbt\.compiled-sql/);

  assert.match(temporalActivitiesTestSource, /type SetupActivitiesOptions = Readonly<\{/);
  assert.match(
    temporalActivitiesTestSource,
    /function setupActivities\(\{[\s\S]*\}: SetupActivitiesOptions = \{\}\)/
  );
  assert.doesNotMatch(temporalActivitiesTestSource, /setupActivities\(undefined/);
});

test('branch review links every non-Canvas local component guide added for the branch', () => {
  const review = read(
    'buzon/20260429-codex-static-analysis-followup-fowler-architecture-review.md'
  );
  assert.match(review, /start-run-admission-component\.md/);
  assert.match(review, /compiled-code-ref-lineage-extraction-component\.md/);
  assert.match(review, /temporal-step-plugin-profile\.md/);
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
