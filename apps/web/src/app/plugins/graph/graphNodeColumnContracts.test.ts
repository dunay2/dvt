import { describe, expect, it, vi } from 'vitest';

import { resolveGraphNodeColumnInteractionProps } from './graphNodeColumnContracts';

describe('graph node column interaction contracts', () => {
  it('offers Source projection gestures without exposing Transform algebra', () => {
    const onReorder = vi.fn();
    const onToggle = vi.fn();
    const interactions = resolveGraphNodeColumnInteractionProps({
      nodeId: 'source-1',
      nodeRole: 'input',
      data: {
        onReorderCanvasColumnOutput: onReorder,
        onApplyCanvasColumnFunction: vi.fn(),
        onApplyCanvasStructuredField: vi.fn(),
        onToggleCanvasColumnOutput: onToggle,
      },
    });

    interactions.onColumnReorder?.({
      nodeId: 'source-1',
      columnId: 'customer',
      targetColumnId: 'order_id',
      placement: 'before',
    });
    interactions.onColumnOutputToggle?.({
      nodeId: 'source-1',
      columnId: 'customer',
      columnType: 'text',
      output: false,
    });

    expect(onReorder).toHaveBeenCalledOnce();
    expect(onToggle).toHaveBeenCalledOnce();
    expect(interactions.onColumnFunctionApply).toBeUndefined();
    expect(interactions.onStructuredFieldApply).toBeUndefined();
  });
});
