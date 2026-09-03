import { describe, expect, it } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';

import {
  createDvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  decodeDvtSubstraitStructuredFieldDocument,
  encodeDvtSubstraitStructuredFieldDocument,
  inspectDvtSubstraitStructuredFieldDraft,
} from './canvasDvtSubstraitStructuredField';
import { composeDvtSubstraitProjectionFields } from './canvasDvtSubstraitStructuredFieldMutation';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

const SOURCE = {
  nodeId: 'source-orders',
  schema: 'raw',
  table: 'orders',
  sourceRef: {
    schemaVersion: 'connected-source-ref.v1' as const,
    connectionRef: {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse-main',
      provider: 'postgres',
    },
    sourceObjectId: 'raw.orders',
  },
  fields: [
    { name: 'order_id', dataType: 'integer' },
    { name: 'customer', dataType: 'text' },
    { name: 'amount', dataType: 'numeric' },
  ],
};

function projectionDraft(): DvtSubstraitProjectionDraft {
  return createDvtSubstraitProjectionDraft({
    source: SOURCE,
    targetNodeId: 'transform-orders',
    outputs: SOURCE.fields.map((field) => ({
      fieldId: `output:${field.name}`,
      name: field.name,
      sourceFieldName: field.name,
    })),
  });
}

describe('canonical Substrait structured Transform fields', () => {
  it('persists one explicit parent while retaining ordered child identities', () => {
    const composed = composeDvtSubstraitProjectionFields(projectionDraft(), {
      draggedFieldId: 'output:customer',
      targetFieldId: 'output:order_id',
      parentFieldId: 'output:identity',
      parentName: 'identity',
    });
    const reloaded = decodeDvtSubstraitStructuredFieldDocument(
      encodeDvtSubstraitStructuredFieldDocument(composed)
    );

    expect(inspectDvtSubstraitStructuredFieldDraft(reloaded)).toEqual({
      ok: true,
      fields: [
        {
          fieldId: 'output:identity',
          name: 'identity',
          children: [
            { fieldId: 'output:order_id', name: 'order_id' },
            { fieldId: 'output:customer', name: 'customer' },
          ],
        },
        { fieldId: 'output:amount', name: 'amount' },
      ],
    });
  });

  it('projects the persisted parent and children back into the Canvas card truth', () => {
    const document = encodeDvtSubstraitStructuredFieldDocument(
      composeDvtSubstraitProjectionFields(projectionDraft(), {
        draggedFieldId: 'output:customer',
        targetFieldId: 'output:order_id',
        parentFieldId: 'output:identity',
        parentName: 'identity',
      })
    );
    const sourceNode: CanonicalNode = {
      id: SOURCE.nodeId,
      name: SOURCE.table,
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: {
        schema: SOURCE.schema,
        tableName: SOURCE.table,
        connectedSourceRef: SOURCE.sourceRef,
        columns: SOURCE.fields.map((field) => ({ name: field.name, type: field.dataType })),
      },
    };
    const transformNode = applyDvtSubstraitSemanticDocument(
      {
        id: 'transform-orders',
        name: 'Transform orders',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: [],
        metadata: {},
      },
      document
    );

    const truth = projectCanvasNodePresentationTruth({
      node: transformNode,
      nodes: [sourceNode, transformNode],
      edges: [{ sourceId: sourceNode.id, targetId: transformNode.id }],
    });

    expect(truth.columns.declared).toMatchObject([
      {
        name: 'identity',
        type: 'struct',
        children: [
          { name: 'order_id', type: 'integer', sourceFieldName: 'order_id' },
          { name: 'customer', type: 'text', sourceFieldName: 'customer' },
        ],
      },
      { name: 'amount', type: 'numeric', sourceFieldName: 'amount' },
    ]);
  });

  it('fails closed without changing the draft for invalid composition identities', () => {
    const draft = projectionDraft();
    const invalidRequests = [
      {
        draggedFieldId: 'output:order_id',
        targetFieldId: 'output:order_id',
        parentFieldId: 'output:identity',
        parentName: 'identity',
      },
      {
        draggedFieldId: 'output:missing',
        targetFieldId: 'output:order_id',
        parentFieldId: 'output:identity',
        parentName: 'identity',
      },
      {
        draggedFieldId: 'output:customer',
        targetFieldId: 'output:order_id',
        parentFieldId: 'output:amount',
        parentName: 'identity',
      },
      {
        draggedFieldId: 'output:customer',
        targetFieldId: 'output:order_id',
        parentFieldId: 'output:identity',
        parentName: 'amount',
      },
    ];

    invalidRequests.forEach((request) => {
      expect(composeDvtSubstraitProjectionFields(draft, request)).toBe(draft);
    });
  });
});
