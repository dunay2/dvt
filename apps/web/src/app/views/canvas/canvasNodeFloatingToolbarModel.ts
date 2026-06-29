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
}>;

export function buildCanvasNodeFloatingToolbarModel({
  nodeId,
  nodeName,
  position,
  onOpenCode,
}: BuildCanvasNodeFloatingToolbarModelArgs): CanvasNodeFloatingToolbarModel {
  return {
    nodeId,
    nodeName,
    position,
    actions: [
      {
        id: 'code',
        label: 'Código',
        description: 'Abrir edición contextual del nodo.',
        tone: 'default',
        available: typeof onOpenCode === 'function',
        unavailableReason:
          typeof onOpenCode === 'function'
            ? undefined
            : 'La edición contextual no está disponible para este nodo.',
        onSelect:
          typeof onOpenCode === 'function'
            ? () => {
                onOpenCode(nodeId);
              }
            : undefined,
      },
      {
        id: 'freeze',
        label: 'Congelar',
        description: 'Mantener el nodo protegido frente a cambios accidentales.',
        tone: 'default',
        available: false,
        unavailableReason: 'Congelar nodo todavía no está disponible.',
      },
      {
        id: 'more',
        label: 'Más acciones',
        description: 'Abrir acciones avanzadas del nodo.',
        tone: 'default',
        available: false,
        unavailableReason: 'Las acciones avanzadas pertenecen al menú contextual del nodo.',
      },
    ],
  };
}
