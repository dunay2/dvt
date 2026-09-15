import {
  DvtOperationalWorkloadContractV1,
  DvtOperationalWorkloadContractV2,
  KNOWN_STEP_KINDS,
  type ConnectionRef,
  type ConnectedSourceRef,
  type DvtSubstraitSemanticDocumentV1,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  DvtOperationalWorkloadProjector,
  type DvtOperationalWorkloadProjectorInput,
} from '../../../src/application/services/dvtOperationalWorkloadProjector.js';
import { buildCanonicalSemanticDocument } from '../../fixtures/workspaceGraphDraftFixture.js';

const CONNECTION: ConnectionRef = {
  schemaVersion: 'connection-ref.v1',
  connectionId: 'warehouse-main',
  provider: 'postgres',
};
const CONNECTED_SOURCE: ConnectedSourceRef = {
  schemaVersion: 'connected-source-ref.v1',
  connectionRef: CONNECTION,
  sourceObjectId: 'raw.orders',
};

function semanticDocument(): DvtSubstraitSemanticDocumentV1 {
  const base = buildCanonicalSemanticDocument();
  return {
    ...base,
    sidecar: {
      ...base.sidecar,
      relations: [
        {
          relationId: 'relation:source-orders',
          relAnchor: 1,
          sourceRef: CONNECTED_SOURCE,
        },
        {
          relationId: 'relation:transform-orders:project',
          relAnchor: 2,
        },
      ],
      fields: base.sidecar.fields.map((field) => ({
        ...field,
        relationId: 'relation:transform-orders:project',
      })),
    },
  };
}

function draft(edgeMetadata?: Readonly<Record<string, unknown>>): WorkspaceGraphAuthoringDraft {
  return {
    canvas: { id: 'canvas-a', kind: 'transformation', title: 'Canvas' },
    nodeIds: ['source-a', 'transform-a'],
    nodePositions: {
      'source-a': { x: 0, y: 0 },
      'transform-a': { x: 200, y: 0 },
    },
    nodes: [
      {
        id: 'source-a',
        name: 'Orders',
        pluginId: 'dvt.warehouse-source',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: [],
        metadata: { connectedSourceRef: CONNECTED_SOURCE },
      },
      {
        id: 'transform-a',
        name: 'Orders projection',
        pluginId: 'dvt',
        kind: 'transform',
        role: 'transform',
        status: 'idle',
        tags: [],
        metadata: {
          transformAuthoring: {
            version: 'v1',
            mode: 'substrait',
            semanticDocument: semanticDocument(),
          },
        },
      },
    ],
    edges: [
      {
        id: 'source-transform',
        sourceId: 'source-a',
        targetId: 'transform-a',
        relation: 'lineage',
        ...(edgeMetadata === undefined ? {} : { metadata: edgeMetadata }),
      },
    ],
  };
}

function input(
  overrides: Partial<DvtOperationalWorkloadProjectorInput> = {}
): DvtOperationalWorkloadProjectorInput {
  const semantic = semanticDocument();
  return {
    scope: {
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'environment-a',
    },
    draftRevision: 'revision-7',
    canvasId: 'canvas-a',
    draft: draft(),
    selectedNodeIds: ['source-a', 'transform-a'],
    selectedEdgeIds: ['source-transform'],
    targetProjection: {
      profileId: 'dvt.vtx2.postgres.project-rel.v1',
      outputNodeId: 'transform-a',
      semanticPlanSha256: semantic.semanticPlan.sha256,
      schemaDigestSha256: 'd'.repeat(64),
      connectionRef: CONNECTION,
      artifact: {
        artifactKind: 'compiled-sql',
        sha256: 'b'.repeat(64),
        storageUri: `s3://dvt-artifacts/tenants/tenant-a/${'b'.repeat(64)}`,
        sizeBytes: 128,
        encoding: 'utf-8',
      },
    },
    ...overrides,
  };
}

function runDraft(
  config: Readonly<Record<string, unknown>> = {
    materialized: 'table',
    resultTarget: {
      schemaVersion: 'dvt-transform-result-target.v1',
      connectionRef: CONNECTION,
      schema: 'analytics',
      relation: 'orders_result',
    },
  }
): WorkspaceGraphAuthoringDraft {
  const base = draft();
  return {
    ...base,
    nodes: base.nodes.map((node) =>
      node.id === 'transform-a' ? { ...node, metadata: { ...node.metadata, config } } : node
    ),
  };
}

describe('DvtOperationalWorkloadProjector', () => {
  it('lowers one terminal Transform closure to one ephemeral workload', () => {
    const result = new DvtOperationalWorkloadProjector().project(input());

    if (!result.ok) throw new Error(result.reason);
    expect(result.graphSource.nodes).toHaveLength(1);
    expect(result.graphSource.nodes[0]).toMatchObject({
      nodeId: 'transform-a',
      stepKind: KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD,
      dependsOn: [],
    });
    const workload = DvtOperationalWorkloadContractV1.schema.parse(
      result.graphSource.nodes[0]?.stepTypeConfig
    );
    expect(workload.graph).toEqual({
      draftRevision: 'revision-7',
      canvasId: 'canvas-a',
      selectedNodeIds: ['source-a', 'transform-a'],
      selectedEdgeIds: ['source-transform'],
    });
    expect(workload.output).toEqual({ kind: 'ephemeral-preview', nodeId: 'transform-a' });
  });

  it('lowers one configured table result to the Run workload contract', () => {
    const result = new DvtOperationalWorkloadProjector().project(input({ draft: runDraft() }));

    if (!result.ok) throw new Error(result.reason);
    const workload = DvtOperationalWorkloadContractV2.schema.parse(
      result.graphSource.nodes[0]?.stepTypeConfig
    );
    expect(workload.executionIntent).toBe('run');
    expect(workload.targetProjection.schemaDigestSha256).toBe('d'.repeat(64));
    expect(workload.output).toMatchObject({
      kind: 'transform-result',
      disposition: 'table',
      target: { schema: 'analytics', relation: 'orders_result' },
    });
    expect(workload.publicationBoundaries).toEqual([]);
  });

  it.each([
    ['view disposition', () => input({ draft: runDraft({ materialized: 'view' }) })],
    ['missing target', () => input({ draft: runDraft({ materialized: 'table' }) })],
    [
      'missing output schema digest',
      () => {
        const candidate = input({ draft: runDraft() });
        const { schemaDigestSha256: _schemaDigestSha256, ...targetProjection } =
          candidate.targetProjection;
        return { ...candidate, targetProjection };
      },
    ],
    [
      'target on another connection',
      () =>
        input({
          draft: runDraft({
            materialized: 'table',
            resultTarget: {
              schemaVersion: 'dvt-transform-result-target.v1',
              connectionRef: { ...CONNECTION, connectionId: 'warehouse-other' },
              schema: 'analytics',
              relation: 'orders_result',
            },
          }),
        }),
    ],
  ])('fails closed for configured Run with %s', (_label, candidate) => {
    expect(new DvtOperationalWorkloadProjector().project(candidate()).ok).toBe(false);
  });

  it.each([
    ['closed execution gate', { executionGate: 'closed' }],
    ['disabled execution dependency', { executionDependency: false }],
  ])('ignores an outgoing edge with %s when resolving terminality', (_label, metadata) => {
    const base = draft();
    const candidate = input({
      draft: {
        ...base,
        nodeIds: [...base.nodeIds, 'downstream-a'],
        nodePositions: { ...base.nodePositions, 'downstream-a': { x: 400, y: 0 } },
        nodes: [
          ...base.nodes,
          {
            id: 'downstream-a',
            name: 'Downstream',
            pluginId: 'dvt',
            kind: 'transform',
            role: 'transform',
            status: 'idle',
            tags: [],
          },
        ],
        edges: [
          ...base.edges,
          {
            id: 'transform-downstream',
            sourceId: 'transform-a',
            targetId: 'downstream-a',
            relation: 'lineage',
            metadata,
          },
        ],
      },
    });

    expect(new DvtOperationalWorkloadProjector().project(candidate).ok).toBe(true);
  });

  it.each([
    [
      'stale semantic projection',
      () =>
        input({
          targetProjection: {
            ...input().targetProjection,
            semanticPlanSha256: 'c'.repeat(64),
          },
        }),
    ],
    [
      'mixed provider',
      () =>
        input({
          targetProjection: {
            ...input().targetProjection,
            connectionRef: { ...CONNECTION, provider: 'snowflake' },
          },
        }),
    ],
    ['closed execution gate', () => input({ draft: draft({ executionGate: 'closed' }) })],
    [
      'non-terminal Transform',
      () => {
        const base = draft();
        return input({
          draft: {
            ...base,
            nodeIds: [...base.nodeIds, 'downstream-a'],
            nodePositions: { ...base.nodePositions, 'downstream-a': { x: 400, y: 0 } },
            nodes: [
              ...base.nodes,
              {
                id: 'downstream-a',
                name: 'Downstream',
                pluginId: 'dvt',
                kind: 'transform',
                role: 'transform',
                status: 'idle',
                tags: [],
              },
            ],
            edges: [
              ...base.edges,
              {
                id: 'transform-downstream',
                sourceId: 'transform-a',
                targetId: 'downstream-a',
                relation: 'lineage',
              },
            ],
          },
        });
      },
    ],
    [
      'foreign Source plugin',
      () => {
        const base = draft();
        return input({
          draft: {
            ...base,
            nodes: base.nodes.map((node) =>
              node.id === 'source-a' ? { ...node, pluginId: 'foreign-source' } : node
            ),
          },
        });
      },
    ],
    [
      'reversed dependency',
      () =>
        input({
          draft: {
            ...draft(),
            edges: [
              {
                id: 'source-transform',
                sourceId: 'transform-a',
                targetId: 'source-a',
                relation: 'lineage',
              },
            ],
          },
        }),
    ],
    [
      'non-lineage dependency',
      () => {
        const base = draft();
        return input({
          draft: {
            ...base,
            edges: base.edges.map((edge) => ({ ...edge, relation: 'validation' as const })),
          },
        });
      },
    ],
    ['extra selected card', () => input({ selectedNodeIds: ['source-a', 'transform-a', 'other'] })],
  ])('fails closed for %s before Planner admission', (_label, candidate) => {
    expect(new DvtOperationalWorkloadProjector().project(candidate()).ok).toBe(false);
  });
});
