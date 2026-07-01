import { describe, expect, it, vi } from 'vitest';

import {
  buildCanvasNodeFloatingToolbarModel,
  type CanvasNodeFloatingToolbarModel,
} from './canvasNodeFloatingToolbarModel';

function actionIds(model: CanvasNodeFloatingToolbarModel): string[] {
  return model.actions.map((action) => action.id);
}

describe('buildCanvasNodeFloatingToolbarModel', () => {
  it('projects code and unavailable freeze posture for the left-click node toolbar', () => {
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
    expect(actionIds(model)).toEqual(['code', 'freeze']);
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
        available: false,
        unavailableReason: 'La política de congelado del nodo aún no está disponible.',
      }),
    ]);

    model.actions.find((action) => action.id === 'code')?.onSelect?.();

    expect(onOpenCode).toHaveBeenCalledWith('model_orders');
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
