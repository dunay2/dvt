import { describe, expect, it } from 'vitest';

import { buildCanvasNodeModelerActionModel } from './canvasNodeContextMenuModel';

function actionIds(model: ReturnType<typeof buildCanvasNodeModelerActionModel>): string[] {
  return model.actionGroups.flatMap((group) => group.actions.map((action) => action.id));
}

function actionById(
  model: ReturnType<typeof buildCanvasNodeModelerActionModel>,
  id: string
):
  | ReturnType<typeof buildCanvasNodeModelerActionModel>['actionGroups'][number]['actions'][number]
  | undefined {
  return model.actionGroups.flatMap((group) => group.actions).find((action) => action.id === id);
}

describe('canvasNodeContextMenuModel', () => {
  it('projects only backed node operations', () => {
    const model = buildCanvasNodeModelerActionModel({
      target: { kind: 'node', nodeId: 'source-orders', nodeName: 'Orders Source' },
      selectedForExecution: false,
      canMutateGraph: true,
      canInspectNode: true,
      canDuplicateNode: true,
      canToggleNodeSelection: true,
      canRemoveNode: true,
    });

    expect(model.target.nodeId).toBe('source-orders');
    expect(actionIds(model)).toEqual([
      'open-properties',
      'duplicate-node',
      'select-node-for-execution',
      'remove-node',
    ]);
    expect(actionById(model, 'open-properties')).toMatchObject({
      intent: 'query',
      disabled: false,
      label: 'Properties',
    });
    expect(actionById(model, 'remove-node')).toMatchObject({
      intent: 'command',
      destructive: true,
      disabled: false,
    });
  });

  it('keeps execution selection available when graph mutation is blocked', () => {
    const model = buildCanvasNodeModelerActionModel({
      target: { kind: 'node', nodeId: 'model-orders', nodeName: 'Orders Model' },
      selectedForExecution: false,
      canMutateGraph: false,
      canInspectNode: true,
      canDuplicateNode: true,
      canToggleNodeSelection: true,
      canRemoveNode: true,
    });

    expect(actionIds(model)).toEqual(['open-properties', 'select-node-for-execution']);
    expect(actionById(model, 'select-node-for-execution')).toMatchObject({
      intent: 'command',
      disabled: false,
      label: 'Select for execution',
    });
    expect(actionById(model, 'duplicate-node')).toBeUndefined();
    expect(actionById(model, 'remove-node')).toBeUndefined();
  });

  it('uses execution-selection posture to choose select or deselect', () => {
    const model = buildCanvasNodeModelerActionModel({
      target: { kind: 'node', nodeId: 'transform-orders', nodeName: 'Clean Orders' },
      selectedForExecution: true,
      canMutateGraph: true,
      canInspectNode: false,
      canDuplicateNode: false,
      canToggleNodeSelection: true,
      canRemoveNode: false,
    });

    expect(actionIds(model)).toEqual(['deselect-node-from-execution']);
    expect(actionById(model, 'deselect-node-from-execution')).toMatchObject({
      intent: 'command',
      disabled: false,
      label: 'Deselect for execution',
    });
  });

  it('returns no menu operations when none are backed', () => {
    const model = buildCanvasNodeModelerActionModel({
      target: { kind: 'node', nodeId: 'sink-orders', nodeName: 'Orders Sink' },
      selectedForExecution: false,
      canMutateGraph: false,
      canInspectNode: false,
      canDuplicateNode: false,
      canToggleNodeSelection: false,
      canRemoveNode: false,
    });

    expect(actionIds(model)).toEqual([]);
  });
});
