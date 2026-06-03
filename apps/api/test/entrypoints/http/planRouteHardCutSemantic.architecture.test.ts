import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { evaluatePlanRoutePlanSource } from '../../../src/entrypoints/http/planRoutePlanSourcePolicy.js';

/**
 * Owned concern: keep protected runtime planner ingress hard-cut to canonical
 * graphSource semantics across start-run, preview, and component docs.
 */
describe('plan route hard-cut semantic architecture', () => {
  it('rejects legacy planner ingress through the shared policy', () => {
    for (const record of [
      { manifestRef: { uri: 's3://bucket/manifest.json', sha256: 'abc' } },
      { manifest: { nodes: {} } },
      { nodes: [{ nodeId: 'model.a' }] },
      {
        graphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: 'manifest-v10',
          nodes: [{ nodeId: 'model.a', stepKind: 'DBT_MODEL', dependsOn: [] }],
        },
        manifestRef: { uri: 's3://bucket/manifest.json', sha256: 'abc' },
      },
    ]) {
      expect(evaluatePlanRoutePlanSource(record)).toEqual({
        ok: false,
        issue: { type: 'bad_request', reason: 'invalid_plan_source' },
      });
    }
  });

  it('documents API, invariants, transitions, consumers, diagrams, and user scenarios', () => {
    const repoRoot = resolve(import.meta.dirname, '../../../../..');
    const componentDoc = readFileSync(
      resolve(repoRoot, 'docs/architecture/components/api/planner-ingress-hard-cut-component.md'),
      'utf8'
    );
    const userStories = readFileSync(
      resolve(
        repoRoot,
        'docs/architecture/components/api/planner-ingress-hard-cut-user-stories.md'
      ),
      'utf8'
    );

    for (const section of ['## Public API', '## Invariants', '## Transitions', '## Consumers']) {
      expect(componentDoc).toContain(section);
    }
    expect(componentDoc).toContain('```mermaid');
    expect(componentDoc).toContain('`graphSource`');
    expect(componentDoc).toContain('`manifestRef`');
    expect(componentDoc).toContain('`targetProfile`');
    expect(componentDoc).toContain('`evaluatePlanRoutePlanSource`');
    expect(componentDoc).toContain('`previewPlanRoute`');
    expect(componentDoc).toContain('`buildPlannerBackedStartRunCommand`');
    expect(userStories).toContain('## User Stories');
    expect(userStories).toContain('US-PLANNER-HC-001');
    expect(userStories).toContain('US-PLANNER-HC-005');
  });
});
