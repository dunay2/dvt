/** Owned concern: derive the left-click node floating-toolbar model without mutating graph state. */

export type CanvasNodeFloatingToolbarActionId = 'code' | 'freeze' | 'more';

export type CanvasNodeFloatingToolbarActionTone = 'default' | 'success';

export type CanvasNodeFloatingToolbarAction = Readonly<{
  id: CanvasNodeFloatingToolbarActionId;
  label: string;
  description: string;
  tone: CanvasNodeFloatingToolbarActionTone;
  available: boolean;
  unavailableReason?: string;
  onSelect?: () => void;
}>;

export type CanvasNodeFloatingToolbarModel = Readonly<{
  nodeId: string;
  nodeName: string;
  position: Readonly<{ x: number; y: number }>;
  actions: readonly CanvasNodeFloatingToolbarAction[];
}>;

export type BuildCanvasNodeFloatingToolbarModelArgs = Readonly<{
  nodeId: string;
  nodeName: string;
  position: Readonly<{ x: number; y: number }>;
  onOpenCode?: (nodeId: string) => void;
  onOpenMore?: (nodeId: string) => void;
}>;

export function buildCanvasNodeFloatingToolbarModel({
  nodeId,
  nodeName,
  position,
  onOpenCode,
  onOpenMore,
}: BuildCanvasNodeFloatingToolbarModelArgs): CanvasNodeFloatingToolbarModel {
  const actions: CanvasNodeFloatingToolbarAction[] = [];

  if (typeof onOpenCode === 'function') {
    actions.push({
      id: 'code',
      label: 'Código',
      description: 'Abrir edición contextual del nodo.',
      tone: 'default',
      available: true,
      onSelect: () => {
        onOpenCode(nodeId);
      },
    });
    actions.push({
      id: 'freeze',
      label: 'Congelar',
      description: 'Mantener estable la posición y edición del nodo.',
      tone: 'default',
      available: false,
      unavailableReason: 'La política de congelado del nodo aún no está disponible.',
    });
  }

  if (typeof onOpenMore === 'function') {
    actions.push({
      id: 'more',
      label: 'Más acciones',
      description: 'Abrir las acciones contextuales gobernadas del nodo.',
      tone: 'default',
      available: true,
      onSelect: () => {
        onOpenMore(nodeId);
      },
    });
  }

  return {
    nodeId,
    nodeName,
    position,
    actions,
  };
}
