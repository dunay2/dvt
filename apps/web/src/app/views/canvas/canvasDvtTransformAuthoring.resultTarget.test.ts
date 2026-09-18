import { describe, expect, it } from 'vitest';
import type { DvtTransformResultTargetV1 } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import {
  applyDvtTransformAuthoringMetadata,
  createDvtTransformAuthoringMetadata,
  validateDvtTransformAuthoringMetadata,
} from './canvasDvtTransformAuthoring';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';

const target: DvtTransformResultTargetV1 = {
  schemaVersion: 'dvt-transform-result-target.v1',
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'warehouse-a',
    provider: 'postgres',
  },
  schema: 'analytics',
  relation: 'orders_enriched',
};
const node: CanonicalNode = {
  id: 'transform-1',
  name: 'Orders',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: { config: { materialized: 'table' }, columns: [{ name: 'order_id', type: 'string' }] },
};

describe('Transform result destination metadata', () => {
  it('keeps canonical semantics and output identities when configuring a result target', () => {
    const projection = createDvtSubstraitProjectionDraft({
      targetNodeId: node.id,
      source: {
        nodeId: 'source-1',
        schema: 'raw',
        table: 'orders',
        fields: [{ name: 'order_id', dataType: 'string' }],
        sourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: target.connectionRef,
          sourceObjectId: 'raw.orders',
        },
      },
      outputs: [{ fieldId: 'order-id', name: 'order_id', sourceFieldName: 'order_id' }],
    });
    const semanticNode = applyDvtSubstraitSemanticDocument(
      node,
      encodeDvtSubstraitProjectionDocument(projection)
    );
    const updated = applyDvtTransformAuthoringMetadata(semanticNode, {
      ...createDvtTransformAuthoringMetadata(semanticNode),
      resultTarget: target,
    });
    expect(updated.metadata?.transformAuthoring).toEqual(semanticNode.metadata?.transformAuthoring);
    expect(createDvtTransformAuthoringMetadata(updated)).toMatchObject({
      mode: 'substrait',
      resultTarget: target,
    });
  });

  it('does not invent a target for an existing Transform', () => {
    const draft = createDvtTransformAuthoringMetadata(node);
    expect(draft).not.toHaveProperty('resultTarget');
    expect(applyDvtTransformAuthoringMetadata(node, draft)).toEqual(node);
  });

  it('persists and restores an explicitly authored target without changing other metadata', () => {
    const authored = applyDvtTransformAuthoringMetadata(node, {
      ...createDvtTransformAuthoringMetadata(node),
      resultTarget: target,
    });
    expect(authored.metadata).toEqual({
      ...node.metadata,
      config: { materialized: 'table', resultTarget: target },
    });
    expect(createDvtTransformAuthoringMetadata(authored)).toMatchObject({ resultTarget: target });
  });

  it('allows explicit removal and preserves disposition and columns', () => {
    const configured = {
      ...node,
      metadata: { ...node.metadata, config: { materialized: 'table', resultTarget: target } },
    };
    const draft = { ...createDvtTransformAuthoringMetadata(configured), resultTarget: null };
    expect(applyDvtTransformAuthoringMetadata(configured, draft)).toEqual(node);
  });

  it('preserves a saved target when a semantic edit does not address destination', () => {
    const configured = {
      ...node,
      metadata: { ...node.metadata, config: { materialized: 'table', resultTarget: target } },
    };
    expect(
      applyDvtTransformAuthoringMetadata(configured, createDvtTransformAuthoringMetadata(node))
    ).toEqual(configured);
  });

  it.each([
    { ...target, schema: '' },
    { ...target, relation: ' bad ' },
  ])('refuses malformed drafts without changing the node', (resultTarget) => {
    const draft = { ...createDvtTransformAuthoringMetadata(node), resultTarget };
    expect(validateDvtTransformAuthoringMetadata(draft)).not.toEqual({});
    expect(applyDvtTransformAuthoringMetadata(node, draft)).toBe(node);
  });

  it('does not silently erase malformed persisted target metadata', () => {
    expect(() =>
      createDvtTransformAuthoringMetadata({
        ...node,
        metadata: { config: { materialized: 'table', resultTarget: null } },
      })
    ).toThrow();
  });
});
