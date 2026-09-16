import type { Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';

import {
  projectInteractiveCanvasColumns,
  projectGraphNodeColumn,
  selectGraphNodeCardColumns,
} from './canvasGraphNodeColumnProjection';

describe('projectGraphNodeColumn', () => {
  it('preserves nested field presentation recursively', () => {
    expect(
      projectGraphNodeColumn(
        {
          name: 'identity',
          type: 'struct',
          provenance: 'declared',
          children: [
            {
              name: 'order_id',
              type: 'integer',
              provenance: 'declared',
              sourceFieldName: 'order_id',
              reference: 'source:orders:order_id',
            },
          ],
        },
        true
      )
    ).toEqual({
      name: 'identity',
      type: 'struct',
      output: true,
      children: [
        {
          id: 'source:orders:order_id',
          name: 'order_id',
          type: 'integer',
          output: true,
          sourceFieldName: 'order_id',
          reference: 'source:orders:order_id',
        },
      ],
    });
  });

  it('adds every pending composition input without duplicating direct outputs', () => {
    expect(
      selectGraphNodeCardColumns({
        columns: {
          declared: [],
          inherited: [
            {
              name: 'shared_id',
              type: 'integer',
              provenance: 'inherited',
              sourceNodeId: 'orders',
              reference: 'orders.shared_id',
            },
            {
              name: 'shared_id',
              type: 'integer',
              provenance: 'inherited',
              sourceNodeId: 'clients',
              reference: 'clients.shared_id',
            },
          ],
          visible: [
            {
              name: 'shared_id',
              type: 'integer',
              provenance: 'declared',
              sourceNodeId: 'orders',
              sourceFieldName: 'shared_id',
              reference: 'output.shared_id',
            },
          ],
          declaredCount: 1,
          inheritedCount: 2,
          visibleCount: 1,
          visibleProvenance: 'declared',
        },
        code: { kind: 'unavailable' },
        relationalComposition: {
          state: 'pending',
          connectedInputCount: 2,
          pendingInputCount: 1,
        },
      }).map((column) => ({
        reference: column.reference,
        sourceNodeId: column.sourceNodeId,
      }))
    ).toEqual([
      { reference: 'output.shared_id', sourceNodeId: 'orders' },
      { reference: 'clients.shared_id', sourceNodeId: 'clients' },
    ]);
  });

  it('preserves distinct interactive identities for equal field names from N sources', () => {
    const presentationTruth = {
      columns: {
        declared: [],
        inherited: [],
        visible: [
          {
            name: 'client_id',
            type: 'text',
            provenance: 'inherited' as const,
            sourceNodeId: 'clients',
            sourceNodeName: 'client',
            sourceFieldName: 'client_id',
            reference: 'clients.client_id',
          },
          {
            name: 'client_id',
            type: 'text',
            provenance: 'inherited' as const,
            sourceNodeId: 'orders',
            sourceNodeName: 'orders',
            sourceFieldName: 'client_id',
            reference: 'orders.client_id',
          },
          {
            name: 'order_id',
            type: 'text',
            provenance: 'inherited' as const,
            sourceNodeId: 'order-details',
            sourceNodeName: 'order_details',
            sourceFieldName: 'order_id',
            reference: 'order-details.order_id',
          },
        ],
        declaredCount: 0,
        inheritedCount: 3,
        visibleCount: 3,
        visibleProvenance: 'inherited' as const,
      },
      code: { kind: 'unavailable' as const },
    };
    const node = {
      id: 'model',
      data: {
        role: 'transform',
        presentationTruth,
        columns: presentationTruth.columns.visible.map((column) =>
          projectGraphNodeColumn(column, false)
        ),
      },
    } as unknown as Node;
    const source = (id: string): CanonicalNode => ({
      id,
      name: id,
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
    });

    const columns = projectInteractiveCanvasColumns(
      node,
      new Map([
        ['clients', source('clients')],
        ['orders', source('orders')],
        ['order-details', source('order-details')],
      ])
    );

    expect(columns.map((column) => column.id)).toEqual([
      'clients.client_id',
      'orders.client_id',
      'order-details.order_id',
    ]);
    expect(columns.map((column) => column.source)).toEqual([
      { nodeId: 'clients', columnId: 'client_id' },
      { nodeId: 'orders', columnId: 'client_id' },
      { nodeId: 'order-details', columnId: 'order_id' },
    ]);
  });
});
