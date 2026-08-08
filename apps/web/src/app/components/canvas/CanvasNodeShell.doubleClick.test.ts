import { describe, expect, it } from 'vitest';

import type { CanvasNodeContextMenuModel } from './canvasNodeContextMenuModel';
import { resolveCanvasNodeDoubleClickAction } from './CanvasNodeShell';

function buildModel(
  actions: CanvasNodeContextMenuModel['actionGroups'][number]['actions']
): CanvasNodeContextMenuModel {
  return {
    target: { kind: 'node', nodeId: 'node-1', nodeName: 'Node 1' },
    actionGroups: [{ id: 'workbench', label: 'Workbench', actions }],
  };
}

describe('resolveCanvasNodeDoubleClickAction', () => {
  it('prefers the existing code command when code is available', () => {
    expect(
      resolveCanvasNodeDoubleClickAction(
        buildModel([
          { id: 'inspect-node', label: 'Open workbench', intent: 'read', disabled: false },
          { id: 'open-node-code', label: 'Open node code', intent: 'read', disabled: false },
        ])
      )
    ).toBe('open-node-code');
  });

  it('falls back to the contextual workbench when code is unavailable', () => {
    expect(
      resolveCanvasNodeDoubleClickAction(
        buildModel([{ id: 'inspect-node', label: 'Open workbench', intent: 'read', disabled: false }])
      )
    ).toBe('open-workbench');
  });

  it('does not route double click to disabled read actions', () => {
    expect(
      resolveCanvasNodeDoubleClickAction(
        buildModel([
          { id: 'inspect-node', label: 'Open workbench', intent: 'read', disabled: true },
          { id: 'open-node-code', label: 'Open node code', intent: 'read', disabled: true },
        ])
      )
    ).toBeNull();
  });

  it('never treats execution-selection commands as a double-click target', () => {
    expect(
      resolveCanvasNodeDoubleClickAction(
        buildModel([
          {
            id: 'select-node-for-execution',
            label: 'Select for execution',
            intent: 'command',
            disabled: false,
          },
        ])
      )
    ).toBeNull();
  });
});
