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
    expect(action?.visualState).toBe('select');
    action?.onPress();

    expect(toggleNodeSelection).toHaveBeenCalledWith('model_orders', true);
  });

  it('uses localized deselection copy and pause visual state for selected nodes', () => {
    const action = buildGraphNodeCardPlayAction({
      nodeId: 'model_orders',
      data: {
        selectedForExecution: true,
        executionSelectionCopy: {
          selectLabel: 'Seleccionar para ejecución',
          deselectLabel: 'Quitar de la ejecución',
        },
        onToggleNodeSelection: vi.fn(),
      },
    });

    expect(action).toMatchObject({
      label: 'Quitar de la ejecución',
      visualState: 'deselect',
    });
  });

  it('does not invent a play action when the node has no execution-selection command', () => {
    expect(buildGraphNodeCardPlayAction({ nodeId: 'model_orders', data: {} })).toBeNull();
  });
});
