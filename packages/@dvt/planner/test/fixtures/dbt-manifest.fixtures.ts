import type { PlannerInputEnvelopeV2 } from '../../src/domain/types.js';

type ManifestNodeRecord = Record<
  string,
  {
    resource_type: 'model' | 'test' | 'snapshot';
    depends_on: { nodes: string[] };
  }
>;

function makeManifestNodes(count: number): ManifestNodeRecord {
  const nodes: ManifestNodeRecord = {};

  for (let i = 0; i < count; i += 1) {
    const nodeId = `model.analytics.n${i.toString().padStart(3, '0')}`;
    const dependsOn: string[] = [];

    if (i > 0) dependsOn.push(`model.analytics.n${(i - 1).toString().padStart(3, '0')}`);
    if (i > 1 && i % 5 === 0)
      dependsOn.push(`model.analytics.n${(i - 2).toString().padStart(3, '0')}`);

    nodes[nodeId] = {
      resource_type: 'model',
      depends_on: { nodes: dependsOn },
    };
  }

  const lastNodeId = `model.analytics.n${(count - 1).toString().padStart(3, '0')}`;
  nodes[`test.analytics.n${(count - 1).toString().padStart(3, '0')}_not_null`] = {
    resource_type: 'test',
    depends_on: { nodes: [lastNodeId] },
  };

  return nodes;
}

function makeManifestEnvelope(size: 10 | 100 | 500): PlannerInputEnvelopeV2 {
  const nodes = makeManifestNodes(size);
  const leaf = `model.analytics.n${(size - 1).toString().padStart(3, '0')}`;

  return {
    manifest: {
      metadata: {
        project_name: 'analytics',
      },
      nodes,
    },
    selection: {
      selectedNodeIds: [leaf],
      includeUpstream: true,
      includeDownstream: false,
    },
    policies: {
      retry: {
        kind: 'at-most-N',
        maxAttempts: 3,
      },
      timeout: {
        kind: 'budget',
        maxSeconds: 120,
      },
      concurrency: {
        kind: 'bounded',
        maxParallel: 16,
      },
    },
    requestedBy: 'planner-fixture-suite',
    requestId: `fixture-${size}`,
    requestedAtIso: '2026-02-26T23:00:00.000Z',
  };
}

export const FIXTURE_MANIFEST_10 = makeManifestEnvelope(10);
export const FIXTURE_MANIFEST_100 = makeManifestEnvelope(100);
export const FIXTURE_MANIFEST_500 = makeManifestEnvelope(500);
