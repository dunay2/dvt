import { describe, expect, it, vi } from 'vitest';

import { buildGraphNodeCardPlayAction } from './graphNodeCardActions';

describe('buildGraphNodeCardPlayAction', () => {
  it('derives node-card play from execution selection when the selection command is available', () => {
    const toggleNodeSelection = vi.fn();
    const action = buildGraphNodeCardPlayAction({
      nodeId: 'model_orders',
      data: {
        selectedForExecution: false,
        onToggleNodeSelection: toggleNodeSelection,
      },
    });

    expect(action?.label).toBe('Select for execution');
    action?.onPress();

    expect(toggleNodeSelection).toHaveBeenCalledWith('model_orders', true);
  });

  it('does not invent a play action when the node has no execution-selection command', () => {
    expect(buildGraphNodeCardPlayAction({ nodeId: 'model_orders', data: {} })).toBeNull();
  });
});
