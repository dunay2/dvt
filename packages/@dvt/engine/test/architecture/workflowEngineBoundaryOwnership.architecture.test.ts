import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const TEST_ROOT = fileURLToPath(new URL('.', import.meta.url));
const ENGINE_ROOT = join(TEST_ROOT, '../../src');
const REPO_ROOT = join(TEST_ROOT, '../../../../..');
const BOUNDARY_COMPONENT_GUIDE = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/workflow-engine-boundary-ownership-component.md'
);

describe('WorkflowEngine boundary ownership architecture', () => {
  it('keeps plan artifact reading separate from run-state persistence ownership', () => {
    const runStateStore = readEngineSource('ports/IRunStateStore.ts');
    const planArtifactReader = readEngineSource('ports/IPlanArtifactReader.ts');

    expect(runStateStore).not.toContain('interface IPlanFetcher');
    expect(runStateStore).not.toContain('interface IPlanIntegrityValidator');
    expect(runStateStore).not.toContain('interface StoredPlanArtifact');

    expect(planArtifactReader).toContain(
      '@ownedConcern Define the engine port for reading plan artifacts before start-run dispatch.'
    );
    expect(planArtifactReader).toContain('export interface IPlanFetcher');
    expect(planArtifactReader).toContain('export interface IPlanIntegrityValidator');
    expect(planArtifactReader).toContain('export interface StoredPlanArtifact');
  });

  it('does not keep a duplicate adapter-local plan fetcher contract', () => {
    expect(existsSync(join(ENGINE_ROOT, 'adapters/IPlanFetcher.ts'))).toBe(false);
  });

  it('documents the external ownership map with public API, invariants, transitions, consumers, and diagrams', () => {
    expect(existsSync(BOUNDARY_COMPONENT_GUIDE)).toBe(true);

    const guide = readFileSync(BOUNDARY_COMPONENT_GUIDE, 'utf8');
    for (const heading of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Diagrams',
      '## Drift Guards',
    ]) {
      expect(guide).toContain(heading);
    }

    expect(guide).toContain('PlanRef');
    expect(guide).toContain('IPlanFetcher');
    expect(guide).toContain('IRunExecutionContextResolver');
    expect(guide).toContain('@dvt/artifacts');
    expect(guide).toContain('```mermaid');
  });
});

function readEngineSource(relativePath: string): string {
  return readFileSync(join(ENGINE_ROOT, relativePath), 'utf8');
}
