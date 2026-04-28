/**
 * Owned concern: verify DBT runtime ownership stays outside the Temporal core
 * activity dispatcher/factory boundary.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const ACTIVITY_ROOT = join(import.meta.dirname, '../src/activities');
const REPO_ROOT = join(import.meta.dirname, '../../../..');
const DBT_PROFILE_GUIDE = join(
  REPO_ROOT,
  'docs/architecture/components/engine/adapters/temporal/temporal-dbt-worker-plugin-profile.md'
);

const CORE_ACTIVITY_MODULES = [
  'activityFactory.ts',
  'activityTypes.ts',
  'stepActivities.ts',
  'stepActivityDispatcher.ts',
] as const;

describe('Temporal DBT core decoupling architecture', () => {
  it('declares semantic ownership for core activity modules', () => {
    const expectedOwnedConcerns = new Map<string, string>([
      [
        'activityFactory.ts',
        '@ownedConcern Compose Temporal core activities with optional worker-provided step registries.',
      ],
      [
        'activityTypes.ts',
        '@ownedConcern Define plugin-free Temporal activity contracts and dispatch types.',
      ],
      [
        'stepActivities.ts',
        '@ownedConcern Publish the Temporal activity public surface without owning plugin step kinds.',
      ],
      [
        'stepActivityDispatcher.ts',
        '@ownedConcern Dispatch workflow step work to core gateway or composed plugin activities.',
      ],
    ]);

    for (const [fileName, expectedOwnedConcern] of expectedOwnedConcerns.entries()) {
      expect(readCoreActivitySource(fileName)).toContain(expectedOwnedConcern);
    }
  });

  it('keeps DBT imports out of core activity modules', () => {
    for (const fileName of CORE_ACTIVITY_MODULES) {
      const source = readCoreActivitySource(fileName);

      expect(source).not.toContain('dbtStepActivity');
      expect(source).not.toContain('plugins/dbt');
      expect(source).not.toContain('DbtStepActivity');
      expect(source).not.toContain('DbtPluginRunner');
      expect(source).not.toContain('DbtPluginExecutionInput');
      expect(source).not.toContain('dbtPluginRunner');
    }
  });

  it('documents core registry ownership as plugin-free by default', () => {
    const dispatcherSource = readCoreActivitySource('stepActivityDispatcher.ts');

    expect(dispatcherSource).toContain('Core registry starts empty');
    expect(dispatcherSource).toContain('plugin activities are composed by worker profiles');
  });

  it('documents the DBT worker profile as the owner of DBT step-kind composition', () => {
    const guide = readFileSync(DBT_PROFILE_GUIDE, 'utf8');

    for (const heading of [
      '## Owned Concern',
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Component Map',
      '## Diagrams',
      '## Drift Guards',
    ]) {
      expect(guide).toContain(heading);
    }

    expect(guide).toContain('createDbtStepActivityRegistry');
    expect(guide).toContain('`createDefaultStepActivityRegistry()` remains plugin-free');
    expect(guide).toContain('`ActivityDeps` remains free of `runExecutionContextReader`');
    expect(guide).toContain('TemporalWorkerHostConfig.stepActivitiesByKind');
    expect(guide).toContain('DVT_TEMPORAL_DBT_ENABLED=false');
    expect(guide).toContain('```mermaid');
  });
});

function readCoreActivitySource(fileName: string): string {
  return readFileSync(join(ACTIVITY_ROOT, fileName), 'utf8');
}
