import { describe, expect, it } from 'vitest';

import type { ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import { encodeDvtSubstraitStructuredFieldDocument } from './canvasDvtSubstraitStructuredField';
import { composeDvtSubstraitProjectionFields } from './canvasDvtSubstraitStructuredFieldMutation';

const connectedSourceRef: ConnectedSourceRef = {
  schemaVersion: 'connected-source-ref.v1',
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'warehouse-main',
    provider: 'postgres',
  },
  sourceObjectId: 'raw.orders',
};

const source: CanonicalNode = {
  id: 'source-orders',
  name: 'orders',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    schema: 'raw',
    tableName: 'orders',
    connectedSourceRef,
    columns: [
      { name: 'order_id', type: 'integer' },
      { name: 'customer', type: 'text', nullable: false },
      { name: 'amount', type: 'numeric' },
    ],
  },
};

describe('Transform output-selection presentation', () => {
  it('keeps an excluded middle field in its source-relative position', () => {
    const semanticDocument = encodeDvtSubstraitProjectionDocument(
      createDvtSubstraitProjectionDraft({
        source: {
          nodeId: source.id,
          schema: 'raw',
          table: 'orders',
          sourceRef: connectedSourceRef,
          fields: [
            { name: 'order_id', dataType: 'integer' },
            { name: 'customer', dataType: 'text' },
            { name: 'amount', dataType: 'numeric' },
          ],
        },
        targetNodeId: 'transform-orders',
        outputs: [
          { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
          { fieldId: 'output:amount', name: 'amount', sourceFieldName: 'amount' },
        ],
      })
    );
    const transform = applyDvtSubstraitSemanticDocument(
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
      semanticDocument
    );

    const secondSource: CanonicalNode = {
      ...source,
      id: 'source-health-check',
      name: 'health_check',
      metadata: {
        ...source.metadata,
        schema: 'core',
        tableName: 'health_check',
        connectedSourceRef: { ...connectedSourceRef, sourceObjectId: 'core.health_check' },
        columns: [{ name: 'id', type: 'integer', nullable: false }],
      },
    };
    const truth = projectCanvasNodePresentationTruth({
      node: transform,
      nodes: [source, secondSource, transform],
      edges: [
        { sourceId: source.id, targetId: transform.id },
        { sourceId: secondSource.id, targetId: transform.id },
      ],
    });

    expect(truth.columns.visible.map(({ name, provenance }) => ({ name, provenance }))).toEqual([
      { name: 'order_id', provenance: 'declared' },
      { name: 'customer', provenance: 'inherited' },
      { name: 'amount', provenance: 'declared' },
      { name: 'id', provenance: 'inherited' },
    ]);
    expect(truth.columns.visible.find((column) => column.name === 'customer')?.nullable).toBe(
      false
    );
  });
  it('keeps original roots and inherited inactive fields visible beside a derived struct', () => {
    const sourceWithInactive: CanonicalNode = {
      ...source,
      metadata: {
        ...source.metadata,
        columns: [
          ...((source.metadata?.columns as readonly unknown[] | undefined) ?? []),
          { name: 'status', type: 'text' },
        ],
      },
    };
    const flatDraft = createDvtSubstraitProjectionDraft({
      source: {
        nodeId: sourceWithInactive.id,
        schema: 'raw',
        table: 'orders',
        sourceRef: connectedSourceRef,
        fields: [
          { name: 'order_id', dataType: 'integer' },
          { name: 'customer', dataType: 'text' },
          { name: 'amount', dataType: 'numeric' },
          { name: 'status', dataType: 'text' },
        ],
      },
      targetNodeId: 'transform-orders',
      outputs: [
        { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
        { fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' },
        { fieldId: 'output:amount', name: 'amount', sourceFieldName: 'amount' },
      ],
    });
    const structuredDraft = composeDvtSubstraitProjectionFields(flatDraft, {
      draggedFieldId: 'output:customer',
      targetFieldId: 'output:order_id',
      parentFieldId: 'output:identity',
      parentName: 'identity',
    });
    const transform = applyDvtSubstraitSemanticDocument(
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
      encodeDvtSubstraitStructuredFieldDocument(structuredDraft)
    );

    const truth = projectCanvasNodePresentationTruth({
      node: transform,
      nodes: [sourceWithInactive, transform],
      edges: [{ sourceId: sourceWithInactive.id, targetId: transform.id }],
    });
    const visibleByName = new Map(truth.columns.visible.map((column) => [column.name, column]));

    expect([...visibleByName.keys()]).toEqual(
      expect.arrayContaining(['order_id', 'customer', 'identity', 'amount', 'status'])
    );
    expect(visibleByName.size).toBe(5);
    expect(visibleByName.get('order_id')).toMatchObject({ provenance: 'declared' });
    expect(visibleByName.get('customer')).toMatchObject({ provenance: 'declared' });
    expect(visibleByName.get('identity')).toMatchObject({
      provenance: 'declared',
      children: [
        expect.objectContaining({ name: 'order_id' }),
        expect.objectContaining({ name: 'customer' }),
      ],
    });
    expect(visibleByName.get('amount')).toMatchObject({ provenance: 'declared' });
    expect(visibleByName.get('status')).toMatchObject({ provenance: 'inherited' });
  });
  it('keeps every physical Source field visible while downstream nodes receive only its projection', () => {
    const sourceDraft = createDvtSubstraitProjectionDraft({
      source: {
        nodeId: source.id,
        schema: 'raw',
        table: 'orders',
        sourceRef: connectedSourceRef,
        fields: [
          { name: 'order_id', dataType: 'integer' },
          { name: 'customer', dataType: 'text' },
          { name: 'amount', dataType: 'numeric' },
        ],
      },
      targetNodeId: source.id,
      outputs: [
        { fieldId: 'source:amount', name: 'amount', sourceFieldName: 'amount' },
        { fieldId: 'source:order_id', name: 'order_id', sourceFieldName: 'order_id' },
      ],
    });
    const projectedSource = applyDvtSubstraitSemanticDocument(
      source,
      encodeDvtSubstraitProjectionDocument(sourceDraft)
    );
    const transform: CanonicalNode = {
      id: 'transform-projected-source',
      name: 'Transform projected Source',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {},
    };
    const edges = [{ sourceId: projectedSource.id, targetId: transform.id }];

    const sourceTruth = projectCanvasNodePresentationTruth({
      node: projectedSource,
      nodes: [projectedSource, transform],
      edges,
    });
    expect(sourceTruth.columns.visible.map(({ name, selected }) => ({ name, selected }))).toEqual([
      { name: 'amount', selected: true },
      { name: 'order_id', selected: true },
      { name: 'customer', selected: false },
    ]);

    const transformTruth = projectCanvasNodePresentationTruth({
      node: transform,
      nodes: [projectedSource, transform],
      edges,
    });
    expect(transformTruth.columns.visible.map((column) => column.name)).toEqual([
      'amount',
      'order_id',
    ]);
  });
});
