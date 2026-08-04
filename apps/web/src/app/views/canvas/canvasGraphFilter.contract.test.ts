import { describe, expect, it } from 'vitest';

import { createCanvasGraphFilterQuery } from './canvasGraphFilter.contract';

describe('CanvasGraphFilterQuery', () => {
  it('normalizes values and removes duplicate predicates without changing their order', () => {
    expect(
      createCanvasGraphFilterQuery({
        composition: 'or',
        presentation: 'hide',
        predicates: [
          { dimension: 'status', value: ' failed ' },
          { dimension: 'role', value: 'transform' },
          { dimension: 'status', value: 'failed' },
          { dimension: 'tag', value: '   ' },
        ],
      })
    ).toEqual({
      composition: 'or',
      presentation: 'hide',
      predicates: [
        { dimension: 'status', value: 'failed' },
        { dimension: 'role', value: 'transform' },
      ],
    });
  });

  it('creates an inert AND/dim query by default', () => {
    expect(createCanvasGraphFilterQuery()).toEqual({
      composition: 'and',
      presentation: 'dim',
      predicates: [],
    });
  });
});
