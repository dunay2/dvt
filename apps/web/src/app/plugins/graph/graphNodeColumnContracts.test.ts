import { describe, expect, it, vi } from 'vitest';

import { resolveGraphNodeColumnInteractionProps } from './graphNodeColumnContracts';

describe('graph node column interaction contracts', () => {
  it('offers the shared reorder gesture to Source columns without exposing Transform authoring', () => {
    const onReorder = vi.fn();
    const interactions = resolveGraphNodeColumnInteractionProps({
      nodeId: 'source-1',
      nodeRole: 'input',
      data: {
        onReorderCanvasColumnOutput: onReorder,
        onApplyCanvasColumnFunction: vi.fn(),
        onApplyCanvasStructuredField: vi.fn(),
        onToggleCanvasColumnOutput: vi.fn(),
      },
    });

    interactions.onColumnReorder?.({
      nodeId: 'source-1',
      columnId: 'customer',
      targetColumnId: 'order_id',
      placement: 'before',
    });

    expect(onReorder).toHaveBeenCalledOnce();
    expect(interactions.onColumnFunctionApply).toBeUndefined();
    expect(interactions.onStructuredFieldApply).toBeUndefined();
    expect(interactions.onColumnOutputToggle).toBeUndefined();
  });
});
