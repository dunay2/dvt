/**
 * @ownedConcern Validate the semantic package-surface split between public,
 * runtime, and testing entrypoints for @dvt/engine.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ENGINE_PACKAGE_ROOT,
  engineArchitectureDocPath,
  expectFileExists,
  expectMarkdownSections,
  expectOwnedConcernHeader,
  readEngineSource,
  readRepoSource,
  repoPath,
} from './engineArchitectureTestSupport.js';

type EnginePackageJson = {
  exports?: Record<string, unknown>;
};

function readEnginePackageJson(): EnginePackageJson {
  return JSON.parse(
    readFileSync(join(ENGINE_PACKAGE_ROOT, 'package.json'), 'utf8')
  ) as EnginePackageJson;
}

function exportedModuleSpecifiers(source: string): readonly string[] {
  const matches = source.matchAll(
    /export\s+(?:type\s+)?(?:\*\s+from|\{[\s\S]*?\}\s+from)\s+['"]([^'"]+)['"]/g
  );
  return Array.from(matches, (match) => match[1] ?? '');
}

function expectNoExportFamilies(
  entrypoint: string,
  exportedModules: readonly string[],
  forbiddenFamilies: readonly string[]
): void {
  for (const family of forbiddenFamilies) {
    expect(
      exportedModules,
      `${entrypoint} must not export implementation family ${family}`
    ).not.toContain(family);
  }
}

describe('@dvt/engine public API surface architecture', () => {
  it('documents the package-surface component, stories, proposal, and Fowler analysis', () => {
    expectFileExists(engineArchitectureDocPath('engine-public-api-surface-component.md'));
    expectFileExists(engineArchitectureDocPath('engine-public-api-surface-user-stories.md'));
    expectFileExists(
      repoPath(
        'docs/planning/proposals/mandatory/runtime-and-contracts/ea-20260429-05-engine-public-api-surface-plan-20260514.md'
      )
    );
    expectFileExists(
      repoPath('buzon/20260514-codex-fowler-ea-20260429-05-engine-public-api-surface-analysis.md')
    );

    const guide = readRepoSource(
      'docs/architecture/components/engine/architecture/engine-public-api-surface-component.md'
    );
    expectMarkdownSections(guide, [
      '## Purpose',
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Diagrams',
      '## Drift Guards',
    ]);
    expect(guide).toContain('@dvt/engine/runtime');
    expect(guide).toContain('@dvt/engine/testing');
    expect(guide).toContain('```mermaid');

    const stories = readRepoSource(
      'docs/architecture/components/engine/architecture/engine-public-api-surface-user-stories.md'
    );
    for (const storyId of [
      'US-EA-20260429-05-001',
      'US-EA-20260429-05-002',
      'US-EA-20260429-05-003',
      'US-EA-20260429-05-004',
      '## Negative Scenarios',
      '## Scenario Coverage Matrix',
      '## Requirement Trace',
    ]) {
      expect(stories).toContain(storyId);
    }

    const analysis = readRepoSource(
      'buzon/20260514-codex-fowler-ea-20260429-05-engine-public-api-surface-analysis.md'
    );
    expectMarkdownSections(analysis, [
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
  });

  it('publishes root, runtime, and testing as the only governed package entrypoints', () => {
    const packageJson = readEnginePackageJson();

    expect(Object.keys(packageJson.exports ?? {}).sort()).toEqual(['.', './runtime', './testing']);
  });

  it('keeps implementation and test-double families out of the root public API', () => {
    const rootSource = readEngineSource('index.ts');
    const rootExports = exportedModuleSpecifiers(rootSource);

    expectOwnedConcernHeader(
      rootSource,
      ['@ownedConcern', 'Runtime engine stable public API'],
      'src/index.ts'
    );
    expect(rootExports).toContain('./contracts/types.js');
    expect(rootExports).toContain('./ports/IWorkflowEngine.js');
    expect(rootExports).toContain('./adapters/IProviderAdapter.js');

    expectNoExportFamilies('src/index.ts', rootExports, [
      './application/providerSelection.js',
      './application/StartRunAdmissionGuard.js',
      './application/StartRunApplicationService.js',
      './core/SnapshotProjector.js',
      './core/buildWorkflowEngineFacade.js',
      './core/WorkflowEngineCoreService.js',
      './domain/startRunIntentPolicy.js',
      './outbox/TokenBucketRateLimiter.js',
      './security/authorizer.js',
      './security/planIntegrity.js',
      './security/planRefPolicy.js',
      './security/RunAccessPolicy.js',
      './services/RunEnrichmentService.js',
      './services/RunMaintenanceService.js',
      './services/RunHealthService.js',
      './services/RunStatusQueryService.js',
      './services/runControl/RunCommandService.js',
      './services/runControl/RunSignalService.js',
      './services/startRun/StartRunTelemetryPolicy.js',
      './workers/IntentReconcilerWorker.js',
      './state/InMemoryTxStore.js',
      './state/InMemoryStartRunIntentStore.js',
      './adapters/inMemory/InMemoryProviderAdapter.js',
    ]);
  });

  it('hard-cuts legacy event aliases instead of keeping compatibility drift', () => {
    const runEventsSource = readEngineSource('contracts/runEvents.ts');
    const versionedRunEventsSource = readEngineSource('contracts/engine/RunEvents.v1.ts');
    const engineContractIndexSource = readEngineSource('contracts/engine/index.ts');
    const forbiddenLegacyAliases = [
      'RunEventPersisted',
      'RunLevelEventInput',
      'StepLevelEventInput',
      'EventInput as RunEventInput',
      'EventEnvelope as RunEventPersisted',
      'engine-legacy',
      'Alias re-exports',
    ];

    for (const source of [runEventsSource, versionedRunEventsSource, engineContractIndexSource]) {
      for (const forbidden of forbiddenLegacyAliases) {
        expect(source).not.toContain(forbidden);
      }
    }

    expect(runEventsSource).toContain('EventInput');
    expect(runEventsSource).toContain('EventEnvelope');
    expect(runEventsSource).toContain('RunEventInput');
    expect(runEventsSource).toContain('StepEventInput');
  });

  it('keeps runtime constructor consumers on the runtime entrypoint', () => {
    const temporalActivitiesTest = readRepoSource(
      'packages/@dvt/adapter-temporal/test/activities.test.ts'
    );

    expect(temporalActivitiesTest).toContain(
      "import { PlanIntegrityValidator, SequenceClock } from '@dvt/engine/runtime';"
    );
    expect(temporalActivitiesTest).not.toContain('PlanIntegrityValidator,\n');
    expect(temporalActivitiesTest).not.toContain('SequenceClock,\n');
  });

  it('keeps runtime composition explicit and free of in-memory test doubles', () => {
    const runtimeSource = readEngineSource('runtime.ts');
    const runtimeExports = exportedModuleSpecifiers(runtimeSource);

    expectOwnedConcernHeader(
      runtimeSource,
      ['@ownedConcern', 'Runtime engine composition API'],
      'src/runtime.ts'
    );
    expect(runtimeExports).toContain('./application/StartRunApplicationService.js');
    expect(runtimeExports).toContain('./workers/IntentReconcilerWorker.js');
    expectNoExportFamilies('src/runtime.ts', runtimeExports, [
      './state/InMemoryTxStore.js',
      './state/InMemoryStartRunIntentStore.js',
      './adapters/inMemory/InMemoryProviderAdapter.js',
    ]);
  });

  it('keeps in-memory stores and provider test doubles behind the testing entrypoint', () => {
    const testingSource = readEngineSource('testing.ts');
    const testingExports = exportedModuleSpecifiers(testingSource);

    expectOwnedConcernHeader(
      testingSource,
      ['@ownedConcern', 'Engine testing API'],
      'src/testing.ts'
    );
    expect(testingExports).toEqual([
      './state/InMemoryStartRunIntentStore.js',
      './state/InMemoryTxStore.js',
      './adapters/inMemory/InMemoryProviderAdapter.js',
    ]);
  });
});
