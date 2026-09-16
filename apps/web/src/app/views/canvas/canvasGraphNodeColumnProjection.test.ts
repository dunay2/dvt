import { describe, expect, it } from 'vitest';

import {
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
});
