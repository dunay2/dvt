import type { IContentAddressedArtifactStore } from '@dvt/artifacts';
import {
  type ConnectionRef,
  type ConnectedSourceRef,
  type DvtSubstraitSemanticDocumentV1,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';
import type { ProjectedDvtConnectedFieldSql } from '@dvt/postgres-projection';
import { describe, expect, it, vi } from 'vitest';

import {
  DvtPostgresTargetProjectionPublisher,
  type DvtPostgresTargetProjectionPublishInput,
} from '../../../src/application/services/dvtPostgresTargetProjectionPublisher.js';
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
          relationId: 'relation:source-a',
          relAnchor: 1,
          sourceRef: CONNECTED_SOURCE,
        },
        {
          relationId: 'relation:transform-a:project',
          relAnchor: 2,
        },
      ],
      fields: base.sidecar.fields.map((field) => ({
        ...field,
        relationId: 'relation:transform-a:project',
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
        kind: 'dvt:transform',
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

function projected(targetNodeId = 'transform-a'): ProjectedDvtConnectedFieldSql {
  return {
    sql: 'select order_id from raw.orders',
    projection: {
      targetNodeId,
      source: {
        nodeId: 'source-a',
        schema: 'raw',
        table: 'orders',
        sourceRef: CONNECTED_SOURCE,
        fields: [{ name: 'order_id', dataType: 'integer' }],
      },
      outputs: [
        {
          fieldId: 'field:transform-a:order_id',
          name: 'order_id',
          sourceFieldId: 'field:source-a:order_id',
          sourceFieldName: 'order_id',
          dataType: 'integer',
          outputOrdinal: 0,
        },
      ],
    },
  };
}

function publishInput(
  overrides: Partial<{ draft: WorkspaceGraphAuthoringDraft }> = {}
): DvtPostgresTargetProjectionPublishInput {
  return {
    scope: {
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'environment-a',
    },
    draft: overrides.draft ?? draft(),
    selectedNodeIds: ['source-a', 'transform-a'],
    selectedEdgeIds: ['source-transform'],
  };
}

describe('DvtPostgresTargetProjectionPublisher', () => {
  it('publishes exact SQL bytes through CAS and returns a typed binding', async () => {
    const sql = projected().sql;
    const bytes = Buffer.from(sql, 'utf8');
    const digest = sha256Hex(bytes);
    const storageUri = `s3://artifacts/tenants/tenant-a/${digest}`;
    const publish = vi.fn<Pick<IContentAddressedArtifactStore, 'publish'>['publish']>(
      async (request) => ({ ...request, disposition: 'created' })
    );
    const publisher = new DvtPostgresTargetProjectionPublisher({
      artifactStore: { publish },
      locateArtifact: ({ sha256 }) => `s3://artifacts/tenants/tenant-a/${sha256}`,
      projectSemanticDocument: async () => projected(),
    });

    const binding = await publisher.publish(publishInput());

    expect(publish).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      storageUri,
      sha256: digest,
      sizeBytes: bytes.byteLength,
      mediaType: 'application/sql; charset=utf-8',
      bytes,
    });
    expect(binding).toEqual({
      outputNodeId: 'transform-a',
      semanticPlanSha256: semanticDocument().semanticPlan.sha256,
      connectionRef: CONNECTION,
      artifact: {
        artifactKind: 'compiled-sql',
        sha256: digest,
        storageUri,
        sizeBytes: bytes.byteLength,
        encoding: 'utf-8',
      },
    });
  });

  it.each([
    ['another target node', () => projected('transform-b'), () => draft()],
    ['a closed execution gate', () => projected(), () => draft({ executionGate: 'closed' })],
  ])('rejects %s before CAS publication', async (_label, project, buildDraft) => {
    const publish = vi.fn<Pick<IContentAddressedArtifactStore, 'publish'>['publish']>();
    const publisher = new DvtPostgresTargetProjectionPublisher({
      artifactStore: { publish },
      locateArtifact: () => 's3://artifacts/tenants/tenant-a/invalid',
      projectSemanticDocument: async () => project(),
    });

    await expect(publisher.publish(publishInput({ draft: buildDraft() }))).rejects.toThrow();
    expect(publish).not.toHaveBeenCalled();
  });
});
