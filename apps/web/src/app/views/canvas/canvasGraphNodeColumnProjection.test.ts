import { describe, expect, it } from 'vitest';

import { projectGraphNodeColumn } from './canvasGraphNodeColumnProjection';

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
});
