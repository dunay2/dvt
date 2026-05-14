import { describe, expect, it } from 'vitest';

import {
  engineArchitectureDocPath,
  expectFileExists,
  expectForbiddenTokensAbsent,
  expectMarkdownSections,
  expectOwnedConcernHeader,
  readEngineArchitectureDoc,
  readEngineTestSource,
  readRepoSource,
  repoPath,
} from './engineArchitectureTestSupport.js';

describe('WorkflowEngine boundary fitness architecture', () => {
  it('documents WE-HX-6 component semantics, Fowler analysis, stories, and proposal trace', () => {
    expectFileExists(engineArchitectureDocPath('workflow-engine-boundary-fitness-component.md'));
    expectFileExists(engineArchitectureDocPath('workflow-engine-boundary-fitness-user-stories.md'));
    expectFileExists(
      repoPath('buzon/20260512-codex-fowler-we-hx-6-boundary-fitness-analysis-and-remediation.md')
    );

    const guide = readEngineArchitectureDoc('workflow-engine-boundary-fitness-component.md');
    expectMarkdownSections(guide, [
      '## Purpose',
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Diagrams',
      '## Drift Guards',
    ]);
    expect(guide).toContain('```mermaid');
    expect(guide).toContain('engineArchitectureTestSupport.ts');
    expect(guide).toContain('makeTemporalAdapter');

    const stories = readEngineArchitectureDoc('workflow-engine-boundary-fitness-user-stories.md');
    for (const expectedStory of [
      'US-WE-HX-6-001',
      'US-WE-HX-6-002',
      'US-WE-HX-6-003',
      'US-WE-HX-6-004',
      'US-WE-HX-6-005',
      'US-WE-HX-6-006',
      'US-WE-HX-6-007',
      '## Negative Scenarios',
      '## Scenario Coverage Matrix',
      '## Requirement Trace',
    ]) {
      expect(stories).toContain(expectedStory);
    }

    const mailbox = readRepoSource(
      'buzon/20260512-codex-fowler-we-hx-6-boundary-fitness-analysis-and-remediation.md'
    );
    expectMarkdownSections(mailbox, [
      '## Fowler Architecture Analysis',
      '## Mature-System Comparison',
      '## Improved Patterns',
      '## Antipatterns Detected',
      '## Component Grouping',
      '## Repetition Register',
      '## Opportunity Register',
      '## Drift Register',
      '## Applied Fixes',
      '## Future Lessons',
    ]);

    const proposal = readRepoSource(
      'docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md'
    );
    expect(proposal).toContain('featureId: WE-HX-6-BOUNDARY-FITNESS');
    expect(proposal).toContain('WorkflowEngineBoundaryFitness');
    expect(proposal).toContain('WorkflowEngineTestDoubleBoundary');
  });

  it('declares owned fixture concerns and blocks production adapter/runtime bleed', () => {
    for (const module of [
      {
        path: 'helpers/workflowEngine.fixture.ts',
        headerTokens: [
          '@ownedConcern',
          'WorkflowEngine test composition fixture',
          'fake provider adapters',
          'engine-owned ports',
        ],
      },
      {
        path: 'helpers/runLifecycle.fixture.ts',
        headerTokens: ['@ownedConcern', 'run lifecycle test fixture', 'in-memory run store'],
      },
      {
        path: 'core/WorkflowEngine.helpers.ts',
        headerTokens: [
          '@ownedConcern',
          'WorkflowEngine facade behavior test helpers',
          'test-only vocabulary',
        ],
      },
    ]) {
      const source = readEngineTestSource(module.path);
      expectOwnedConcernHeader(source, module.headerTokens, module.path);
      expectForbiddenTokensAbsent(
        source,
        [
          "from '@dvt/adapter-",
          'from "@dvt/adapter-',
          '@temporalio/',
          'createTemporalProviderAdapter',
          'migratePostgresRuntimeStores',
          'apps/api/src',
          'process.env',
          'ENGINE_PROVIDER',
        ],
        module.path
      );
    }

    const workflowFixture = readEngineTestSource('helpers/workflowEngine.fixture.ts');
    expect(workflowFixture).toContain('makeTemporalAdapter');
    expect(workflowFixture).toContain("provider: 'temporal'");
    expect(workflowFixture).toContain('IProviderAdapter');
  });

  it('centralizes architecture test support instead of duplicating path readers', () => {
    const support = readEngineTestSource('architecture/engineArchitectureTestSupport.ts');
    expectOwnedConcernHeader(
      support,
      ['@ownedConcern', 'Engine architecture test support', 'source and documentation discovery'],
      'architecture/engineArchitectureTestSupport.ts'
    );

    for (const exportedName of [
      'readEngineSource',
      'readEngineTestSource',
      'readRepoSource',
      'readEngineArchitectureDoc',
      'expectMarkdownSections',
      'expectOwnedConcernHeader',
      'expectForbiddenTokensAbsent',
      'getClassConstructorParameterPropertyTypes',
    ]) {
      expect(support).toContain(`export function ${exportedName}`);
    }

    for (const modulePath of [
      'architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts',
      'architecture/workflowEngineSemanticClosure.architecture.test.ts',
    ]) {
      const source = readEngineTestSource(modulePath);
      expect(source, modulePath).toContain("from './engineArchitectureTestSupport.js'");
      for (const repeatedReader of [
        'const TEST_ROOT',
        'const ENGINE_ROOT',
        'const REPO_ROOT',
        'function readEngineSource',
        'function readRepoSource',
      ]) {
        expect(source, `${modulePath} should not redeclare ${repeatedReader}`).not.toContain(
          repeatedReader
        );
      }
    }
  });
});
