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
  frozen?: boolean;
  onOpenCode?: (nodeId: string) => void;
  onToggleFreeze?: (nodeId: string) => void;
  onOpenMore?: (nodeId: string) => void;
}>;

export function buildCanvasNodeFloatingToolbarModel({
  nodeId,
  nodeName,
  position,
  frozen = false,
  onOpenCode,
  onToggleFreeze,
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
  }

  if (typeof onToggleFreeze === 'function') {
    actions.push({
      id: 'freeze',
      label: frozen ? 'Descongelar' : 'Congelar',
      description: frozen
        ? 'Permitir de nuevo el movimiento del nodo.'
        : 'Mantener estable la posición y edición del nodo.',
      tone: 'default',
      available: true,
      onSelect: () => {
        onToggleFreeze(nodeId);
      },
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
