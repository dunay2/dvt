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
    const onToggleExecutionSelection = vi.fn();

    const model = buildCanvasNodeFloatingToolbarModel({
      nodeId: 'model_orders',
      nodeName: 'Orders model',
      selectedForExecution: false,
      position: { x: 240, y: 120 },
      onOpenCode,
      onToggleExecutionSelection,
    });

    expect(model).toMatchObject({
      nodeId: 'model_orders',
      nodeName: 'Orders model',
      position: { x: 240, y: 120 },
    });
    expect(actionIds(model)).toEqual(['code', 'freeze', 'play', 'more']);
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
        id: 'play',
        label: 'Seleccionar para ejecución',
        description: 'Marcar este nodo como alcance de ejecución.',
        tone: 'success',
        available: true,
      }),
      expect.objectContaining({
        id: 'more',
        label: 'Más acciones',
        description: 'Abrir acciones avanzadas del nodo.',
        available: false,
      }),
    ]);

    model.actions.find((action) => action.id === 'code')?.onSelect?.();
    model.actions.find((action) => action.id === 'play')?.onSelect?.();

    expect(onOpenCode).toHaveBeenCalledWith('model_orders');
    expect(onToggleExecutionSelection).toHaveBeenCalledWith('model_orders', true);
  });

  it('does not fake unavailable actions when the owning callback is absent', () => {
    const model = buildCanvasNodeFloatingToolbarModel({
      nodeId: 'source_orders',
      nodeName: 'Orders source',
      selectedForExecution: true,
      position: { x: 20, y: 40 },
    });

    expect(model.actions.find((action) => action.id === 'code')).toMatchObject({
      available: false,
      unavailableReason: 'La edición contextual no está disponible para este nodo.',
    });
    expect(model.actions.find((action) => action.id === 'play')).toMatchObject({
      label: 'Quitar de ejecución',
      available: false,
      unavailableReason: 'La selección de ejecución no está disponible para este nodo.',
    });
  });
});
