import { describe, expect, it } from 'vitest';

import {
  buildCanvasNodeContextMenuModel,
  buildCanvasNodeModelerActionModel,
} from './canvasNodeContextMenuModel';

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
  it('projects command actions for modeler panels without the current properties action', () => {
    const model = buildCanvasNodeModelerActionModel({
      target: { kind: 'node', nodeId: 'source-orders', nodeName: 'Orders Source' },
      selectedForExecution: false,
      canMutateGraph: true,
      canDuplicateNode: true,
      canToggleNodeSelection: true,
      canRemoveNode: true,
    });

    expect(model.target.nodeId).toBe('source-orders');
    expect(actionIds(model)).toEqual(
      expect.arrayContaining(['duplicate-node', 'select-node-for-execution', 'remove-node'])
    );
    expect(actionById(model, 'inspect-node')).toBeUndefined();
    expect(actionById(model, 'inspect-inputs-outputs')).toBeUndefined();
    expect(actionById(model, 'inspect-tests')).toBeUndefined();
    expect(actionById(model, 'remove-node')).toMatchObject({
      intent: 'command',
      destructive: true,
      disabled: false,
    });
  });

  it('maps editable node posture to only backed node context actions', () => {
    const model = buildCanvasNodeContextMenuModel({
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
      'inspect-node',
      'select-node-for-execution',
      'duplicate-node',
      'remove-node',
    ]);
    expect(actionById(model, 'inspect-node')).toMatchObject({
      label: 'Open workbench',
      intent: 'read',
      disabled: false,
    });
    expect(actionById(model, 'inspect-node')).not.toHaveProperty('workbenchTabId');
    expect(actionById(model, 'inspect-inputs-outputs')).toBeUndefined();
    expect(actionById(model, 'inspect-tests')).toBeUndefined();
    expect(actionById(model, 'edit-sql')).toBeUndefined();
    expect(actionById(model, 'preview-node')).toBeUndefined();
    expect(actionById(model, 'run-from-node')).toBeUndefined();
    expect(actionById(model, 'show-lineage')).toBeUndefined();
    expect(actionById(model, 'remove-node')).toMatchObject({
      label: 'Delete',
      intent: 'command',
      destructive: true,
      disabled: false,
    });
    expect(actionIds(model)).not.toEqual(
      expect.arrayContaining([
        'add-source',
        'add-model',
        'open-project',
        'open-project-code',
        'preview-execution-plan',
        'canvas-settings',
      ])
    );
  });

  it('keeps execution selection available when graph mutation is blocked but planning is allowed', () => {
    const model = buildCanvasNodeContextMenuModel({
      target: { kind: 'node', nodeId: 'model-orders', nodeName: 'Orders Model' },
      selectedForExecution: false,
      canMutateGraph: false,
      canInspectNode: true,
      canDuplicateNode: true,
      canToggleNodeSelection: true,
      canRemoveNode: true,
    });

    expect(actionIds(model)).toEqual(['inspect-node', 'select-node-for-execution']);
    expect(actionById(model, 'inspect-node')).toMatchObject({ disabled: false });
    expect(actionById(model, 'inspect-inputs-outputs')).toBeUndefined();
    expect(actionById(model, 'inspect-tests')).toBeUndefined();
    expect(actionById(model, 'edit-sql')).toBeUndefined();
    expect(actionById(model, 'preview-node')).toBeUndefined();
    expect(actionById(model, 'run-from-node')).toBeUndefined();
    expect(actionById(model, 'show-lineage')).toBeUndefined();
    expect(actionById(model, 'select-node-for-execution')).toMatchObject({
      intent: 'command',
      disabled: false,
      label: 'Select for execution',
    });
    expect(actionById(model, 'duplicate-node')).toBeUndefined();
    expect(actionById(model, 'remove-node')).toBeUndefined();
  });

  it('keeps modeler execution selection available when graph mutation is blocked', () => {
    const model = buildCanvasNodeModelerActionModel({
      target: { kind: 'node', nodeId: 'source-orders', nodeName: 'Orders Source' },
      selectedForExecution: true,
      canMutateGraph: false,
      canDuplicateNode: true,
      canToggleNodeSelection: true,
      canRemoveNode: true,
    });

    expect(actionIds(model)).toEqual(['deselect-node-from-execution']);
    expect(actionById(model, 'deselect-node-from-execution')).toMatchObject({
      intent: 'command',
      disabled: false,
      label: 'Deselect for execution',
    });
    expect(actionById(model, 'duplicate-node')).toBeUndefined();
    expect(actionById(model, 'remove-node')).toBeUndefined();
  });

  it('keeps inspection available but fails closed for read-only execution posture', () => {
    const model = buildCanvasNodeContextMenuModel({
      target: { kind: 'node', nodeId: 'model-orders', nodeName: 'Orders Model' },
      selectedForExecution: false,
      canMutateGraph: false,
      canInspectNode: true,
      canDuplicateNode: true,
      canToggleNodeSelection: false,
      canRemoveNode: true,
    });

    expect(actionIds(model)).toEqual(['inspect-node']);
    expect(actionById(model, 'duplicate-node')).toBeUndefined();
    expect(actionById(model, 'select-node-for-execution')).toBeUndefined();
    expect(actionById(model, 'remove-node')).toBeUndefined();
  });

  it('keeps node code exclusive to the selected-node floating toolbar', () => {
    const model = buildCanvasNodeContextMenuModel({
      target: { kind: 'node', nodeId: 'model-orders', nodeName: 'Orders Model' },
      selectedForExecution: false,
      canMutateGraph: false,
      canInspectNode: true,
      canOpenNodeCode: true,
      canDuplicateNode: false,
      canToggleNodeSelection: false,
      canRemoveNode: false,
    });

    expect(actionIds(model)).toEqual(['inspect-node']);
    expect(actionById(model, 'open-node-code')).toBeUndefined();
  });

  it('uses execution-selection posture to choose select or deselect intent', () => {
    const model = buildCanvasNodeContextMenuModel({
      target: { kind: 'node', nodeId: 'transform-orders', nodeName: 'Clean Orders' },
      selectedForExecution: true,
      canMutateGraph: true,
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
      label: 'Deselect for execution',
    });
  });

  it('does not add disabled workbench tab actions when the route has no inspector callback', () => {
    const model = buildCanvasNodeContextMenuModel({
      target: { kind: 'node', nodeId: 'sink-orders', nodeName: 'Orders Sink' },
      selectedForExecution: false,
      canMutateGraph: false,
      canInspectNode: false,
      canDuplicateNode: false,
      canToggleNodeSelection: false,
      canRemoveNode: false,
    });

    expect(actionIds(model)).toEqual([]);
    expect(actionById(model, 'inspect-node')).toBeUndefined();
    expect(actionById(model, 'inspect-inputs-outputs')).toBeUndefined();
    expect(actionById(model, 'inspect-tests')).toBeUndefined();
  });
});
