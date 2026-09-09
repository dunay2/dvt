import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  applyDvtNodeAuthoringMetadata,
  createDvtNodeAuthoringMetadata,
  resolveEffectiveDvtConnectionRef,
} from './canvasDvtAuthoringModel';

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

  it('preserves one imported authority when editing source metadata', () => {
    const imported = node({
      metadata: {
        ...node().metadata,
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: connectionA,
          sourceObjectId: 'relation/analytics/raw/orders',
        },
      },
    });
    const draft = createDvtNodeAuthoringMetadata(imported);
    expect(draft?.kind).toBe('source');
    if (draft?.kind !== 'source') {
      throw new Error('Expected a DVT source draft.');
    }

    const updated = applyDvtNodeAuthoringMetadata(imported, {
      ...draft,
      alias: 'orders_curated',
    });

    expect(updated.metadata?.connectedSourceRef).toEqual(imported.metadata?.connectedSourceRef);
    expect(updated.metadata).not.toHaveProperty('connectionRef');
    expect(resolveEffectiveDvtConnectionRef(updated)).toEqual(connectionA);
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
});
