import { describe, expect, it, vi } from 'vitest';

import {
  buildCanvasNodeFloatingToolbarModel,
  type CanvasNodeFloatingToolbarModel,
} from './canvasNodeFloatingToolbarModel';

function actionIds(model: CanvasNodeFloatingToolbarModel): string[] {
  return model.actions.map((action) => action.id);
}

describe('buildCanvasNodeFloatingToolbarModel', () => {
  it('projects the left-click node toolbar as a closed, ordered action set', () => {
    const onOpenCode = vi.fn();

    const model = buildCanvasNodeFloatingToolbarModel({
      nodeId: 'model_orders',
      nodeName: 'Orders model',
      position: { x: 240, y: 120 },
      onOpenCode,
    });

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
        description: 'Mantener el nodo protegido frente a cambios accidentales.',
        available: false,
      }),
      expect.objectContaining({
        id: 'more',
        label: 'Más acciones',
        description: 'Abrir acciones avanzadas del nodo.',
        available: false,
      }),
    ]);

    model.actions.find((action) => action.id === 'code')?.onSelect?.();

    expect(onOpenCode).toHaveBeenCalledWith('model_orders');
  });

  it('does not fake unavailable actions when the owning callback is absent', () => {
    const model = buildCanvasNodeFloatingToolbarModel({
      nodeId: 'source_orders',
      nodeName: 'Orders source',
      position: { x: 20, y: 40 },
    });

    expect(model.actions.find((action) => action.id === 'code')).toMatchObject({
      available: false,
      unavailableReason: 'La edición contextual no está disponible para este nodo.',
    });
    expect(actionIds(model)).not.toContain('play');
  });
});
