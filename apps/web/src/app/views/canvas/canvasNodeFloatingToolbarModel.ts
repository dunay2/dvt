/** Owned concern: derive the left-click node floating-toolbar model without mutating graph state. */
import { canvasViewCopy, type CanvasViewCopy } from './copy';

export type CanvasNodeFloatingToolbarActionId = 'code' | 'freeze' | 'more';

export type CanvasNodeFloatingToolbarActionTone = 'default' | 'active';

export type CanvasNodeFloatingToolbarCopy = Readonly<{
  toolbarLabelTemplate: string;
  codeLabel: string;
  codeDescription: string;
  freezeLabel: string;
  freezeDescription: string;
  unfreezeLabel: string;
  unfreezeDescription: string;
  moreLabel: string;
  moreDescription: string;
}>;

export type CanvasNodeFloatingToolbarAction = Readonly<{
  id: CanvasNodeFloatingToolbarActionId;
  label: string;
  description: string;
  tone: CanvasNodeFloatingToolbarActionTone;
  pressed: boolean;
  available: boolean;
  unavailableReason?: string;
  onSelect?: () => void;
}>;

export type CanvasNodeFloatingToolbarModel = Readonly<{
  nodeId: string;
  nodeName: string;
  position: Readonly<{ x: number; y: number }>;
  actions: readonly CanvasNodeFloatingToolbarAction[];
  accessibleLabel: string;
}>;

export type BuildCanvasNodeFloatingToolbarModelArgs = Readonly<{
  nodeId: string;
  nodeName: string;
  position: Readonly<{ x: number; y: number }>;
  frozen?: boolean;
  onOpenCode?: (nodeId: string) => void;
  onToggleFreeze?: (nodeId: string) => void;
  onOpenMore?: (nodeId: string) => void;
  copy?: CanvasNodeFloatingToolbarCopy;
}>;

function resolveToolbarCopy(copy: CanvasViewCopy): CanvasNodeFloatingToolbarCopy {
  return {
    toolbarLabelTemplate: copy.canvasNodeToolbarLabelTemplate,
    codeLabel: copy.canvasNodeToolbarCodeLabel,
    codeDescription: copy.canvasNodeToolbarCodeDescription,
    freezeLabel: copy.canvasNodeToolbarFreezeLabel,
    freezeDescription: copy.canvasNodeToolbarFreezeDescription,
    unfreezeLabel: copy.canvasNodeToolbarUnfreezeLabel,
    unfreezeDescription: copy.canvasNodeToolbarUnfreezeDescription,
    moreLabel: copy.canvasNodeToolbarMoreLabel,
    moreDescription: copy.canvasNodeToolbarMoreDescription,
  };
}

export function buildCanvasNodeFloatingToolbarModel({
  nodeId,
  nodeName,
  position,
  frozen = false,
  onOpenCode,
  onToggleFreeze,
  onOpenMore,
  copy = resolveToolbarCopy(canvasViewCopy),
}: BuildCanvasNodeFloatingToolbarModelArgs): CanvasNodeFloatingToolbarModel {
  const actions: CanvasNodeFloatingToolbarAction[] = [];

  if (typeof onOpenCode === 'function') {
    actions.push({
      id: 'code',
      label: copy.codeLabel,
      description: copy.codeDescription,
      tone: 'default',
      pressed: false,
      available: true,
      onSelect: () => {
        onOpenCode(nodeId);
      },
    });
  }

  if (typeof onToggleFreeze === 'function') {
    actions.push({
      id: 'freeze',
      label: frozen ? copy.unfreezeLabel : copy.freezeLabel,
      description: frozen ? copy.unfreezeDescription : copy.freezeDescription,
      tone: frozen ? 'active' : 'default',
      pressed: frozen,
      available: true,
      onSelect: () => {
        onToggleFreeze(nodeId);
      },
    });
  }

  if (typeof onOpenMore === 'function') {
    actions.push({
      id: 'more',
      label: copy.moreLabel,
      description: copy.moreDescription,
      tone: 'default',
      pressed: false,
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
    accessibleLabel: copy.toolbarLabelTemplate.replace('{nodeName}', nodeName),
  };
}
