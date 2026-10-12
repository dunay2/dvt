import { describe, expect, it } from 'vitest';

import { inspectDvtConnectedFieldProjection } from '../src/index.js';

import { canonicalDraft } from './fixtures/connectedFieldDraft.js';
import {
  opaqueIdentityDraft,
  typedCanonicalDraft,
  unaryFunctionProjectionDraft,
} from './fixtures/connectedFieldVariants.js';

const NODE_BINDING = {
  sourceNodeId: 'source-orders',
  targetNodeId: 'transform-orders',
} as const;

describe('connected-field Substrait reader', () => {
  it('preserves typed source fields in projected outputs', () => {
    const inspection = inspectDvtConnectedFieldProjection(typedCanonicalDraft(), NODE_BINDING);

    expect(inspection).toMatchObject({
      ok: true,
      projection: {
        outputs: [
          { name: 'order_id', dataType: 'string' },
          { name: 'customer_name', dataType: 'string' },
        ],
      },
    });
  });

  it('reads aliases with an arbitrary unary function chain from Substrait semantics', () => {
    const projected = inspectDvtConnectedFieldProjection(
      unaryFunctionProjectionDraft(),
      NODE_BINDING
    );

    if (!projected.ok) throw new Error('Expected connected-field projection');
    expect(projected.projection.outputs).toMatchObject([
      { name: 'order_id', sourceFieldName: 'order_id' },
      { name: 'customer_trimmed', sourceFieldName: 'customer', operations: ['trim'] },
      {
        name: 'customer_upper',
        sourceFieldName: 'customer',
        operations: ['trim', 'trim', 'upper'],
      },
    ]);
  });

  it('reads opaque semantic identities from the protected node binding', () => {
    const inspection = inspectDvtConnectedFieldProjection(opaqueIdentityDraft(), NODE_BINDING);
    expect(inspection).toMatchObject({
      ok: true,
      projection: {
        targetNodeId: 'transform-orders',
        source: { nodeId: 'source-orders' },
      },
    });
  });

  it.each([
    { sourceNodeId: 'node-a', targetNodeId: 'node-a' },
    { sourceNodeId: ' source-orders', targetNodeId: 'transform-orders' },
  ])('rejects an ambiguous protected node binding %#', (binding) => {
    expect(inspectDvtConnectedFieldProjection(opaqueIdentityDraft(), binding)).toEqual({
      ok: false,
    });
  });

  it('rejects a semantic projection without a governed PostgreSQL source', () => {
    expect(inspectDvtConnectedFieldProjection(canonicalDraft('snowflake'), NODE_BINDING)).toEqual({
      ok: false,
    });
  });
});
