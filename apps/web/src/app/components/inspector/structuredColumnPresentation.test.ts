import { describe, expect, it } from 'vitest';

import { flattenStructuredColumns } from './structuredColumnPresentation';

describe('structured Inspector column presentation', () => {
  it('preserves parent-first order and stable leaf identities', () => {
    const rows = flattenStructuredColumns([
      {
        name: 'identity',
        type: 'struct',
        provenance: 'declared',
        reference: 'output:identity',
        children: [
          {
            name: 'order_id',
            type: 'integer',
            provenance: 'declared',
            reference: 'output:order_id',
          },
          {
            name: 'customer',
            type: 'text',
            provenance: 'declared',
            reference: 'output:customer',
          },
        ],
      },
    ]);

    expect(rows.map(({ path, column }) => ({ path, reference: column.reference }))).toEqual([
      { path: 'identity', reference: 'output:identity' },
      { path: 'identity.order_id', reference: 'output:order_id' },
      { path: 'identity.customer', reference: 'output:customer' },
    ]);
  });
});
