import { describe, expect, it, vi } from 'vitest';

import {
  buildCanvasNodeFloatingToolbarModel,
  type CanvasNodeFloatingToolbarModel,
} from './canvasNodeFloatingToolbarModel';

function actionIds(model: CanvasNodeFloatingToolbarModel): string[] {
  return model.actions.map((action) => action.id);
}

describe('buildCanvasNodeFloatingToolbarModel', () => {
  it('projects code, operable freeze, and governed more launcher for the left-click node toolbar', () => {
    const onOpenCode = vi.fn();
    const onOpenMore = vi.fn();
    const onToggleFreeze = vi.fn();
    const input = {
      nodeId: 'model_orders',
      nodeName: 'Orders model',
      position: { x: 240, y: 120 },
      frozen: false,
      onOpenCode,
      onOpenMore,
      onToggleFreeze,
    } satisfies Parameters<typeof buildCanvasNodeFloatingToolbarModel>[0] & {
      frozen: boolean;
      onToggleFreeze: (nodeId: string) => void;
    };

    const model = buildCanvasNodeFloatingToolbarModel(input);

    expect(model).toMatchObject({
      nodeId: 'model_orders',
      nodeName: 'Orders model',
      position: { x: 240, y: 120 },
    });
    expect(actionIds(model)).toEqual(['code', 'freeze', 'more']);
    expect(model.actions).toEqual([
      expect.objectContaining({
        id: 'code',
        label: 'Código',
        description: 'Abrir edición contextual del nodo.',
        available: true,
      }),
      expect.objectContaining({
        id: 'freeze',
        label: 'Congelar',
        description: 'Mantener estable la posición y edición del nodo.',
        available: true,
      }),
      expect.objectContaining({
        id: 'more',
        label: 'Más acciones',
        description: 'Abrir las acciones contextuales gobernadas del nodo.',
        available: true,
      }),
    ]);

    model.actions.find((action) => action.id === 'code')?.onSelect?.();
    model.actions.find((action) => action.id === 'freeze')?.onSelect?.();
    model.actions.find((action) => action.id === 'more')?.onSelect?.();

    expect(onOpenCode).toHaveBeenCalledWith('model_orders');
    expect(onToggleFreeze).toHaveBeenCalledWith('model_orders');
    expect(onOpenMore).toHaveBeenCalledWith('model_orders');
  });

  it('projects an operable unfreeze action when the selected node is frozen', () => {
    const onToggleFreeze = vi.fn();
    const input = {
      nodeId: 'model_orders',
      nodeName: 'Orders model',
      position: { x: 240, y: 120 },
      frozen: true,
      onToggleFreeze,
    } satisfies Parameters<typeof buildCanvasNodeFloatingToolbarModel>[0] & {
      frozen: boolean;
      onToggleFreeze: (nodeId: string) => void;
    };

    const model = buildCanvasNodeFloatingToolbarModel(input);
    const freezeAction = model.actions.find((action) => action.id === 'freeze');

    expect(freezeAction).toEqual(
      expect.objectContaining({
        label: 'Descongelar',
        description: 'Permitir de nuevo el movimiento del nodo.',
        available: true,
      })
    );

    freezeAction?.onSelect?.();

    expect(onToggleFreeze).toHaveBeenCalledWith('model_orders');
  });

  it('does not project dead actions when their owning callback is absent', () => {
    const model = buildCanvasNodeFloatingToolbarModel({
      nodeId: 'source_orders',
      nodeName: 'Orders source',
      position: { x: 20, y: 40 },
    });

    expect(model.actions.find((action) => action.id === 'code')).toBeUndefined();
    expect(actionIds(model)).not.toContain('play');
    expect(actionIds(model)).not.toContain('freeze');
    expect(actionIds(model)).not.toContain('more');
  });
});
