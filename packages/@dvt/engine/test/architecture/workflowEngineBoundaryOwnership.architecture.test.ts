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
const BOUNDARY_USER_STORIES = join(
  REPO_ROOT,
  'docs/architecture/components/engine/architecture/workflow-engine-boundary-ownership-user-stories.md'
);
const FOWLER_REVIEW = join(
  REPO_ROOT,
  'docs/planning/reviews/architecture-and-governance/20260429-we-hx-1-fowler-architecture-review.md'
);
const API_STORED_PLAN_PORT = join(REPO_ROOT, 'apps/api/src/application/ports/storedPlan.ts');

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

  it('documents the external ownership map with public API, invariants, transitions, consumers, user stories, and diagrams', () => {
    expect(existsSync(BOUNDARY_COMPONENT_GUIDE)).toBe(true);
    expect(existsSync(BOUNDARY_USER_STORIES)).toBe(true);
    expect(existsSync(FOWLER_REVIEW)).toBe(true);

    const guide = readFileSync(BOUNDARY_COMPONENT_GUIDE, 'utf8');
    for (const heading of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## User Stories',
      '## Diagrams',
      '## Drift Guards',
    ]) {
      expect(guide).toContain(heading);
    }

    expect(guide).toContain('PlanRef');
    expect(guide).toContain('IPlanFetcher');
    expect(guide).toContain('IRunExecutionContextResolver');
    expect(guide).toContain('@dvt/artifacts');
    expect(guide).toContain('workflow-engine-boundary-ownership-user-stories.md');
    expect(guide).toContain('```mermaid');

    const stories = readFileSync(BOUNDARY_USER_STORIES, 'utf8');
    for (const storyId of [
      'US-WE-HX-1-001',
      'US-WE-HX-1-002',
      'US-WE-HX-1-003',
      'US-WE-HX-1-004',
    ]) {
      expect(stories).toContain(storyId);
    }
    expect(stories).toContain('## Negative Scenarios');
    expect(stories).toContain('## Scenario Coverage Matrix');

    const review = readFileSync(FOWLER_REVIEW, 'utf8');
    for (const section of [
      '## Fowler Architecture Analysis',
      '## Mature-System Comparison',
      '## Antipatterns And Fixes',
      '## Repetitions And Drift',
      '## Patterns Applied',
      '## Future Lessons',
    ]) {
      expect(review).toContain(section);
    }
  });

  it('keeps owned-concern docblocks on the boundary modules touched by the slice', () => {
    for (const relativePath of [
      'ports/IPlanArtifactReader.ts',
      'ports/IRunStateStore.ts',
      'application/StartRunApplicationService.ts',
      'application/RecoverRunApplicationService.ts',
      'security/planIntegrity.ts',
    ]) {
      expect(readEngineSource(relativePath).slice(0, 240)).toContain('@ownedConcern');
    }
  });

  it('reuses the engine-owned stored plan artifact shape instead of redefining it in API', () => {
    const apiPort = readFileSync(API_STORED_PLAN_PORT, 'utf8');

    expect(apiPort).toContain("import type { StoredPlanArtifact } from '@dvt/engine'");
    expect(apiPort).not.toContain('export interface StoredPlanArtifact');
  });
});

function readEngineSource(relativePath: string): string {
  return readFileSync(join(ENGINE_ROOT, relativePath), 'utf8');
}
