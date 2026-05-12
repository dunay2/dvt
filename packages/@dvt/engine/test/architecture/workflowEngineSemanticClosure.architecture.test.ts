import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const TEST_ROOT = fileURLToPath(new URL('.', import.meta.url));
const ENGINE_ROOT = join(TEST_ROOT, '../../src');
const REPO_ROOT = join(TEST_ROOT, '../../../../..');
const COMPONENT_GUIDE = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/workflow-engine-semantic-closure-component.md'
);
const USER_STORIES = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/workflow-engine-semantic-closure-user-stories.md'
);
const FOWLER_MAILBOX = join(
  REPO_ROOT,
  'buzon/20260512-codex-fowler-dhm-ws6-semantic-closure-analysis.md'
);
const CLOSEOUT = join(
  REPO_ROOT,
  'docs/planning/closeouts/20260512-dhm-ws6-semantic-closure-closeout.md'
);

describe('WorkflowEngine semantic closure architecture', () => {
  it('declares owned concerns for the composition, compatibility, and role-interface seams', () => {
    const modules = [
      {
        path: 'apps/api/src/runtime/intentReconcilerRuntime.ts',
        headerTokens: [
          '@ownedConcern',
          'API-side intent reconciler runtime composition',
          'not an engine domain service',
        ],
      },
      {
        path: 'apps/api/src/application/services/WorkflowEngineFactory.ts',
        headerTokens: [
          '@ownedConcern',
          'API WorkflowEngine runtime composition',
          'production factory and test seam',
        ],
      },
      {
        path: 'packages/@dvt/engine/src/core/WorkflowEngineCoreService.ts',
        headerTokens: [
          '@ownedConcern',
          'compatibility run-control adapter',
          'delegates to command and signal services',
        ],
      },
      {
        path: 'packages/@dvt/engine/src/domain/IRunCommandService.ts',
        headerTokens: ['@ownedConcern', 'cancel command role interface'],
      },
      {
        path: 'packages/@dvt/engine/src/domain/IRunSignalService.ts',
        headerTokens: ['@ownedConcern', 'signal command role interface'],
      },
      {
        path: 'packages/@dvt/engine/src/services/runControl/RunCommandService.ts',
        headerTokens: ['@ownedConcern', 'runtime cancel commands'],
      },
      {
        path: 'packages/@dvt/engine/src/services/runControl/RunSignalService.ts',
        headerTokens: ['@ownedConcern', 'runtime signal commands'],
      },
      {
        path: 'packages/@dvt/engine/src/application/workflow-engine-use-cases/buildWorkflowEngineUseCases.ts',
        headerTokens: ['@ownedConcern', 'WorkflowEngine facade use-case implementations'],
      },
    ];

    for (const module of modules) {
      const source = readRepoSource(module.path);
      const header = source.slice(0, 800);
      for (const token of module.headerTokens) {
        expect(header, `${module.path} should declare ${token}`).toContain(token);
      }
    }
  });

  it('preserves semantic runtime ownership rather than only proving barrel thinness', () => {
    const factory = readRepoSource('apps/api/src/application/services/WorkflowEngineFactory.ts');
    const apiRuntime = readRepoSource('apps/api/src/runtime/intentReconcilerRuntime.ts');
    const coreService = readEngineSource('core/WorkflowEngineCoreService.ts');
    const commandService = readEngineSource('services/runControl/RunCommandService.ts');
    const signalService = readEngineSource('services/runControl/RunSignalService.ts');

    expect(factory).toContain('buildRunCommandService');
    expect(factory).toContain('buildRunSignalService');
    expect(factory).toContain('buildWorkflowEngineUseCases');

    expect(apiRuntime).toContain('class IntentReconcilerRuntimeComposition');
    expect(apiRuntime).toContain('migratePostgresRuntimeStores');
    expect(coreService).not.toContain('migratePostgresRuntimeStores');
    expect(coreService).not.toContain('createTemporalProviderAdapterFactory');

    expect(commandService).toContain('adapter.cancelRun(validatedRunRef)');
    expect(commandService).not.toContain('adapter.signal(');
    expect(commandService).not.toContain('SignalTransitionGuard');

    expect(signalService).toContain('SignalTransitionGuard');
    expect(signalService).toContain('emitSignalDerivedRunEvent');
    expect(signalService).toContain('adapter.signal(validatedRunRef, validatedRequest)');
    expect(signalService).not.toContain('adapter.cancelRun(');

    for (const forbiddenCoreOwnership of [
      'adapter.cancelRun(',
      'adapter.signal(',
      'SignalTransitionGuard',
      'emitSignalDerivedRunEvent',
      'migratePostgresRuntimeStores',
      'createTemporalProviderAdapterFactory',
    ]) {
      expect(coreService, `core service must not own ${forbiddenCoreOwnership}`).not.toContain(
        forbiddenCoreOwnership
      );
    }

    expect(coreService).toContain('this.runCommandService.cancel(ref)');
    expect(coreService).toContain('this.runSignalService.signal(ref, req)');
  });

  it('requires local semantic closure docs, Fowler analysis, and complete story coverage', () => {
    for (const path of [COMPONENT_GUIDE, USER_STORIES, FOWLER_MAILBOX, CLOSEOUT]) {
      expect(existsSync(path), `${path} should exist`).toBe(true);
    }

    const guide = readFileSync(COMPONENT_GUIDE, 'utf8');
    for (const expected of [
      '## Purpose',
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Component Grouping',
      '## Current-State Diagram',
      '## Runtime Sequence',
      '## Drift Guards',
      '```mermaid',
    ]) {
      expect(guide).toContain(expected);
    }

    const mailbox = readFileSync(FOWLER_MAILBOX, 'utf8');
    for (const expected of [
      '## Mature-System Comparison',
      '## Improved Patterns',
      '## Antipatterns Detected',
      '## Component Grouping',
      '## Future Lessons',
      '## Repetition Register',
      '## Opportunity Register',
      '## Drift Register',
      '## Applied Fixes',
    ]) {
      expect(mailbox).toContain(expected);
    }

    const stories = readFileSync(USER_STORIES, 'utf8');
    for (const expectedStory of [
      'US-DHM-WS6-001',
      'US-DHM-WS6-002',
      'US-DHM-WS6-003',
      'US-DHM-WS6-004',
      'US-DHM-WS6-005',
      '## Negative Scenarios',
      '## Scenario Coverage Matrix',
    ]) {
      expect(stories).toContain(expectedStory);
    }
  });
});

function readEngineSource(relativePath: string): string {
  return readFileSync(join(ENGINE_ROOT, relativePath), 'utf8');
}

function readRepoSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}
