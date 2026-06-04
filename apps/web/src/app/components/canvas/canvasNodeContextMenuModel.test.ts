import { describe, expect, it } from 'vitest';

import { buildCanvasNodeContextMenuModel } from './canvasNodeContextMenuModel';

function actionIds(model: ReturnType<typeof buildCanvasNodeContextMenuModel>): string[] {
  return model.actionGroups.flatMap((group) => group.actions.map((action) => action.id));
}

function actionById(
  model: ReturnType<typeof buildCanvasNodeContextMenuModel>,
  id: string
):
  | ReturnType<typeof buildCanvasNodeContextMenuModel>['actionGroups'][number]['actions'][number]
  | undefined {
  return model.actionGroups.flatMap((group) => group.actions).find((action) => action.id === id);
}

describe('canvasNodeContextMenuModel', () => {
  it('maps editable node posture to semantic context actions', () => {
    const model = buildCanvasNodeContextMenuModel({
      target: { kind: 'node', nodeId: 'source-orders', nodeName: 'Orders Source' },
      selectedForExecution: false,
      canInspectNode: true,
      canDuplicateNode: true,
      canToggleNodeSelection: true,
      canRemoveNode: true,
    });

    expect(model.target.nodeId).toBe('source-orders');
    expect(actionIds(model)).toEqual(
      expect.arrayContaining([
        'inspect-node',
        'duplicate-node',
        'select-node-for-execution',
        'remove-node',
      ])
    );
    expect(actionById(model, 'inspect-node')).toMatchObject({
      intent: 'read',
      disabled: false,
    });
    expect(actionById(model, 'remove-node')).toMatchObject({
      intent: 'command',
      destructive: true,
      disabled: false,
    });
    expect(actionById(model, 'inspect-node')?.label).toMatch(/\S/);
    expect(actionById(model, 'remove-node')?.label).toMatch(/\S/);
  });

  it('keeps inspection available but fails closed for read-only node mutation', () => {
    const model = buildCanvasNodeContextMenuModel({
      target: { kind: 'node', nodeId: 'model-orders', nodeName: 'Orders Model' },
      selectedForExecution: false,
      canInspectNode: true,
      canDuplicateNode: false,
      canToggleNodeSelection: false,
      canRemoveNode: false,
    });

    expect(actionIds(model)).toEqual(['inspect-node']);
    expect(actionById(model, 'inspect-node')).toMatchObject({
      intent: 'read',
      disabled: false,
    });
    expect(actionById(model, 'duplicate-node')).toBeUndefined();
    expect(actionById(model, 'select-node-for-execution')).toBeUndefined();
    expect(actionById(model, 'remove-node')).toBeUndefined();
  });

  it('uses execution-selection posture to choose select or deselect intent', () => {
    const model = buildCanvasNodeContextMenuModel({
      target: { kind: 'node', nodeId: 'transform-orders', nodeName: 'Clean Orders' },
      selectedForExecution: true,
      canInspectNode: true,
      canDuplicateNode: false,
      canToggleNodeSelection: true,
      canRemoveNode: false,
    });

    expect(actionIds(model)).toEqual(
      expect.arrayContaining(['inspect-node', 'deselect-node-from-execution'])
    );
    expect(actionById(model, 'deselect-node-from-execution')).toMatchObject({
      intent: 'command',
      disabled: false,
    });
  });

  it('keeps a disabled properties action when the route has no inspector callback', () => {
    const model = buildCanvasNodeContextMenuModel({
      target: { kind: 'node', nodeId: 'sink-orders', nodeName: 'Orders Sink' },
      selectedForExecution: false,
      canInspectNode: false,
      canDuplicateNode: false,
      canToggleNodeSelection: false,
      canRemoveNode: false,
    });

    expect(actionIds(model)).toEqual(['inspect-node']);
    expect(actionById(model, 'inspect-node')).toMatchObject({
      disabled: true,
    });
    expect(actionById(model, 'inspect-node')?.disabledReason).toMatch(/\S/);
  });
});
