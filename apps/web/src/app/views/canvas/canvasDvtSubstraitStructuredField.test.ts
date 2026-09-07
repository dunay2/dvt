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

function composeIdentity(draft = projectionDraft()): DvtSubstraitProjectionDraft {
  return composeDvtSubstraitProjectionFields(draft, {
    draggedFieldId: 'output:customer',
    targetFieldId: 'output:order_id',
    parentFieldId: 'output:identity',
    parentName: 'identity',
  });
}

const identityChildren = [
  'output:identity:child:output:order_id',
  'output:identity:child:output:customer',
];

function inspectFields(
  draft: DvtSubstraitProjectionDraft
): Extract<ReturnType<typeof inspectDvtSubstraitStructuredFieldDraft>, { ok: true }>['fields'] {
  const inspection = inspectDvtSubstraitStructuredFieldDraft(draft);
  if (!inspection.ok) throw new Error('Expected inspectable structured projection.');
  return inspection.fields;
}

describe('canonical Substrait structured Transform fields', () => {
  it('appends a derived parent while retaining original roots and fresh child identities', () => {
    const reloaded = decodeDvtSubstraitStructuredFieldDocument(
      encodeDvtSubstraitStructuredFieldDocument(composeIdentity())
    );
    const fields = inspectFields(reloaded);

    expect(fields.map((field) => field.fieldId)).toEqual([
      'output:order_id',
      'output:customer',
      'output:amount',
      'output:identity',
    ]);
    expect(fields[3]).toMatchObject({
      fieldId: 'output:identity',
      name: 'identity',
      children: identityChildren.map((fieldId) => ({ fieldId })),
    });
  });

  it('projects original roots and the persisted struct into the Canvas card truth', () => {
    const document = encodeDvtSubstraitStructuredFieldDocument(composeIdentity());
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

    expect(truth.columns.declared.map((column) => column.name)).toEqual([
      'order_id',
      'customer',
      'amount',
      'identity',
    ]);
    expect(truth.columns.declared[3]).toMatchObject({
      name: 'identity',
      type: 'struct',
      children: [
        { name: 'order_id', type: 'integer', sourceFieldName: 'order_id' },
        { name: 'customer', type: 'text', sourceFieldName: 'customer' },
      ],
    });
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

  it('appends a scalar to a struct without consuming the scalar root', () => {
    const appended = composeDvtSubstraitProjectionFields(composeIdentity(), {
      draggedFieldId: 'output:amount',
      targetFieldId: 'output:identity',
      parentFieldId: 'output:identity',
      parentName: 'identity',
    });
    const fields = inspectFields(appended);

    expect(fields.map((field) => field.fieldId)).toEqual([
      'output:order_id',
      'output:customer',
      'output:amount',
      'output:identity',
    ]);
    expect(fields[3]?.children?.map((field) => field.fieldId)).toEqual([
      ...identityChildren,
      'output:identity:child:output:amount',
    ]);
  });

  it('creates another derived struct while retaining every scalar root', () => {
    const fields = [...SOURCE.fields, { name: 'tax', dataType: 'numeric' }];
    const draft = createDvtSubstraitProjectionDraft({
      source: { ...SOURCE, fields },
      targetNodeId: 'transform-orders',
      outputs: fields.map((field) => ({
        fieldId: `output:${field.name}`,
        name: field.name,
        sourceFieldName: field.name,
      })),
    });
    const totals = composeDvtSubstraitProjectionFields(composeIdentity(draft), {
      draggedFieldId: 'output:tax',
      targetFieldId: 'output:amount',
      parentFieldId: 'output:totals',
      parentName: 'totals',
    });
    const inspected = inspectFields(totals);

    expect(inspected.map((field) => field.fieldId)).toEqual([
      'output:order_id',
      'output:customer',
      'output:amount',
      'output:tax',
      'output:identity',
      'output:totals',
    ]);
    expect(inspected[5]?.children?.map((field) => field.fieldId)).toEqual([
      'output:totals:child:output:amount',
      'output:totals:child:output:tax',
    ]);
  });
});
