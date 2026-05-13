import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const TEST_ROOT = fileURLToPath(new URL('.', import.meta.url));
const API_ROOT = join(TEST_ROOT, '../../src');
const REPO_ROOT = join(TEST_ROOT, '../../../..');
const COMPONENT_GUIDE = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/intent-reconciler-runtime-composition-component.md'
);
const USER_STORIES = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/intent-reconciler-runtime-composition-user-stories.md'
);

describe('intent reconciler runtime composition architecture', () => {
  it('publishes a named composition object behind the exported runtime factory', () => {
    const source = readApiSource('runtime/intentReconcilerRuntime.ts');
    const factoryBody = source.slice(
      source.indexOf('export async function createIntentReconcilerRuntime')
    );

    expect(source).toContain('class IntentReconcilerRuntimeComposition');
    expect(source).toContain('function createIntentReconcilerRuntimeComposition');
    expect(factoryBody).toContain('createIntentReconcilerRuntimeComposition(');
    expect(factoryBody).toContain('.create()');

    for (const forbiddenFactoryAssembly of [
      'createRuntimeStores(config)',
      'migratePostgresRuntimeStores({',
      'resolveReconcilerAdapters(',
      'createMaintenanceService(',
      'createWorker({',
      'createRuntimeHandle(worker, stores, logger)',
    ]) {
      expect(factoryBody).not.toContain(forbiddenFactoryAssembly);
    }
  });

  it('keeps runtime assembly order explicit inside the composition object', () => {
    const source = readApiSource('runtime/intentReconcilerRuntime.ts');
    const compositionBody = source.slice(
      source.indexOf('class IntentReconcilerRuntimeComposition'),
      source.indexOf('function createIntentReconcilerRuntimeComposition')
    );

    const orderedCalls = [
      'this.resolveConfig()',
      'this.createStores(config)',
      'this.migrateStores(stores)',
      'this.resolveAdapters(config, stores)',
      'this.createMaintenance(stores, adapters)',
      'this.createWorker(maintenance, config)',
      'this.createHandle(worker, stores)',
    ];

    let previousIndex = -1;
    for (const call of orderedCalls) {
      const nextIndex = compositionBody.indexOf(call);
      expect(nextIndex, `${call} should be present`).toBeGreaterThan(previousIndex);
      previousIndex = nextIndex;
    }
  });

  it('documents the runtime composition component and DHM-WS2 stories', () => {
    expect(existsSync(COMPONENT_GUIDE)).toBe(true);
    expect(existsSync(USER_STORIES)).toBe(true);

    const guide = readFileSync(COMPONENT_GUIDE, 'utf8');
    for (const expected of [
      'IntentReconcilerRuntimeComposition',
      'IntentReconcilerRuntimeComposition`',
      '## Invariants',
      '## Startup Sequence',
      '```mermaid',
    ]) {
      expect(guide).toContain(expected);
    }

    const stories = readFileSync(USER_STORIES, 'utf8');
    for (const expectedStory of [
      'US-DHM-WS2-001',
      'US-DHM-WS2-002',
      'US-DHM-WS2-003',
      '## Negative Scenarios',
      '## Scenario Coverage Matrix',
    ]) {
      expect(stories).toContain(expectedStory);
    }
  });
});

function readApiSource(relativePath: string): string {
  return readFileSync(join(API_ROOT, relativePath), 'utf8');
}
