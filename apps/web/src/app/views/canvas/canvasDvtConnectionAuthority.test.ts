import { describe, expect, it } from 'vitest';

import type { GitArtifactRef } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import {
  applyDvtNodeAuthoringMetadata,
  createDvtNodeAuthoringMetadata,
  resolveEffectiveDvtConnectionRef,
} from './canvasDvtAuthoringModel';
import { buildPreviewGraphSource } from './previewCompilerGraphSource';

const connectionA = {
  schemaVersion: 'connection-ref.v1',
  connectionId: 'warehouse-a',
  provider: 'postgres',
} as const;

function node(overrides: Partial<CanonicalNode> = {}): CanonicalNode {
  return {
    id: 'source-1',
    name: 'Orders',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['authoring'],
    metadata: {
      config: {
        schema: 'raw',
        table: 'orders',
        alias: 'orders_src',
      },
    },
    ...overrides,
  };
}

describe('Canvas DVT PostgreSQL connection authority', () => {
  it('reads imported and manual source authorities through one effective ref', () => {
    const manual = node({ metadata: { ...node().metadata, connectionRef: connectionA } });
    const imported = node({
      pluginId: 'dvt.warehouse-source',
      metadata: {
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: connectionA,
          sourceObjectId: 'relation/analytics/raw/orders',
        },
        schema: 'raw',
        tableName: 'orders',
        sourceName: 'orders_src',
      },
    });

    expect(resolveEffectiveDvtConnectionRef(manual)).toEqual(connectionA);
    expect(resolveEffectiveDvtConnectionRef(imported)).toEqual(connectionA);
  });

  it('fails closed when a source persists both authorities', () => {
    const conflicting = node({
      metadata: {
        ...node().metadata,
        connectionRef: connectionA,
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: connectionA,
          sourceObjectId: 'relation/analytics/raw/orders',
        },
      },
    });

    expect(() => resolveEffectiveDvtConnectionRef(conflicting)).toThrow(
      /one connection authority/i
    );
  });

  it('persists a manual selection on the source without copying it to descendants', () => {
    const sourceDraft = createDvtNodeAuthoringMetadata(node());
    expect(sourceDraft?.kind).toBe('source');
    if (sourceDraft?.kind !== 'source') {
      throw new Error('Expected a DVT source draft.');
    }

    const updatedSource = applyDvtNodeAuthoringMetadata(node(), {
      ...sourceDraft,
      connectionRef: connectionA,
    });
    expect(updatedSource.metadata?.connectionRef).toEqual(connectionA);

    const transform = node({
      id: 'transform-1',
      kind: 'dvt:transform',
      role: 'transform',
      metadata: { config: { sql: 'select * from raw.orders' } },
    });
    expect(transform.metadata).not.toHaveProperty('connectionRef');
  });

  it('projects the same connection and supplied edges into Preview steps', () => {
    const source = node({ metadata: { ...node().metadata, connectionRef: connectionA } });
    const transform = node({
      id: 'transform-1',
      name: 'Orders transform',
      kind: 'dvt:transform',
      role: 'transform',
      path: 'models/orders.sql',
    });
    const sink = node({
      id: 'sink-1',
      name: 'Orders daily',
      kind: 'dvt:sink',
      role: 'output',
      metadata: {
        config: {
          schema: 'analytics',
          table: 'orders_daily',
          materialization: 'table',
          writeMode: 'replace',
        },
      },
    });

    const graphArgs = {
      nodes: [source, transform, sink],
      scopedNodeIds: [source.id, transform.id, sink.id],
      sqlText: 'select * from raw.orders',
      sqlArtifact: {
        repo: 'org/repo',
        path: 'models/orders.sql',
        ref: 'refs/heads/main',
        commitSha: 'commit-sql-1',
        contentSha256: 'a'.repeat(64),
      } as unknown as GitArtifactRef,
    };
    const sourceToTransform = {
      id: 'source-transform',
      sourceId: source.id,
      targetId: transform.id,
      relation: 'lineage' as const,
    };
    const transformToSink = {
      id: 'transform-sink',
      sourceId: transform.id,
      targetId: sink.id,
      relation: 'lineage' as const,
    };
    const graph = buildPreviewGraphSource({
      ...graphArgs,
      edges: [transformToSink, sourceToTransform],
    });

    expect(graph.sourceVersion).toBe('transformation-sql-first-v2');
    expect(
      graph.nodes.map(
        (entry) => (entry.stepTypeConfig as { connectionRef: typeof connectionA }).connectionRef
      )
    ).toEqual([connectionA, connectionA, connectionA]);
    expect(graph.nodes.map(({ nodeId, dependsOn }) => ({ nodeId, dependsOn }))).toEqual([
      { nodeId: source.id, dependsOn: [] },
      { nodeId: transform.id, dependsOn: [source.id] },
      { nodeId: sink.id, dependsOn: [transform.id] },
    ]);

    const topologyProbe = buildPreviewGraphSource({
      ...graphArgs,
      edges: [
        transformToSink,
        {
          id: 'source-sink',
          sourceId: source.id,
          targetId: sink.id,
          relation: 'lineage' as const,
        },
        sourceToTransform,
      ],
    });

    expect(topologyProbe.nodes.map(({ nodeId, dependsOn }) => ({ nodeId, dependsOn }))).toEqual([
      { nodeId: source.id, dependsOn: [] },
      { nodeId: transform.id, dependsOn: [source.id] },
      { nodeId: sink.id, dependsOn: [source.id, transform.id] },
    ]);
  });
});
