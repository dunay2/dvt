import { describe, expect, it } from 'vitest';

import {
  reconcileCanvasInspectorListOrder,
  reorderCanvasInspectorList,
} from './useCanvasInspectorListOrder';

describe('Canvas Inspector list order', () => {
  it('drops stale and duplicate identities and appends new identities canonically', () => {
    expect(
      reconcileCanvasInspectorListOrder(
        ['stale', 'amount', 'amount', 42],
        ['order_id', 'customer', 'amount', 'created_at']
      )
    ).toEqual(['amount', 'order_id', 'customer', 'created_at']);
  });

  it('moves one identity without dropping the other records', () => {
    expect(
      reorderCanvasInspectorList(['order_id', 'customer', 'amount'], 'amount', 'order_id', 'before')
    ).toEqual(['amount', 'order_id', 'customer']);
  });
});
