/** Owned concern: build the Project Workspace Explorer read model from existing resources. */
import { PanelsTopLeft, type LucideIcon } from 'lucide-react';

import { resolveNodeKindRegistration } from '../plugins/nodeTypeRegistry';
import type { CanonicalNode, CanonicalNodeStatus } from '../types/canonical';

export type CanvasWorkspaceResourceType = 'canvas' | 'canvas_node';

export type CanvasWorkspaceExplorerCanvasDocument = Readonly<{
  kind: string;
  title: string;
}>;

export type CanvasWorkspaceExplorerModelInput = Readonly<{
  nodes: readonly CanonicalNode[];
  canvasDocument?: CanvasWorkspaceExplorerCanvasDocument | null;
}>;

export type CanvasWorkspaceResource = Readonly<{
  id: string;
  label: string;
  resourceType: CanvasWorkspaceResourceType;
  status: CanonicalNodeStatus;
  badge: string;
  detail: string | null;
  dragPayload?: CanonicalNode;
}>;

export type CanvasWorkspaceResourceGroup = Readonly<{
  id: string;
  label: string;
  color: string;
  icon: LucideIcon;
  resources: readonly CanvasWorkspaceResource[];
}>;

function resolveNodeBadgeText(node: CanonicalNode): string {
  const packageName = typeof node.metadata?.package === 'string' ? node.metadata.package : null;
  return packageName ?? node.pluginId;
}

function resolveNodeDetailText(node: CanonicalNode): string | null {
  if (node.lastDuration == null) {
    return null;
  }

  const cost = node.lastCost == null ? '' : ` - $${node.lastCost.toFixed(2)}`;
  return `${node.lastDuration}s${cost}`;
}

function mapNodeToWorkspaceResource(node: CanonicalNode): CanvasWorkspaceResource {
  return {
    id: node.id,
    label: node.name,
    resourceType: 'canvas_node',
    status: node.status,
    badge: resolveNodeBadgeText(node),
    detail: resolveNodeDetailText(node),
    dragPayload: node,
  };
}

function buildCanvasResourceGroup(
  canvasDocument: CanvasWorkspaceExplorerCanvasDocument | null | undefined
): CanvasWorkspaceResourceGroup | null {
  if (canvasDocument == null) {
    return null;
  }

  return {
    id: 'canvas',
    label: 'Canvases',
    color: '#38bdf8',
    icon: PanelsTopLeft,
    resources: [
      {
        id: `canvas:${canvasDocument.kind}`,
        label: canvasDocument.title,
        resourceType: 'canvas',
        status: 'idle',
        badge: 'canvas',
        detail: canvasDocument.kind,
      },
    ],
  };
}

function buildNodeResourceGroups(nodes: readonly CanonicalNode[]): CanvasWorkspaceResourceGroup[] {
  const groups = new Map<string, CanvasWorkspaceResource[]>();

  nodes.forEach((node) => {
    const bucket = groups.get(node.kind) ?? [];
    bucket.push(mapNodeToWorkspaceResource(node));
    groups.set(node.kind, bucket);
  });

  return Array.from(groups.entries())
    .map(([kind, resources]) => {
      const registration = resolveNodeKindRegistration(kind);
      return {
        id: kind,
        label: registration.label,
        color: registration.minimapColor,
        icon: registration.icon,
        resources,
      };
    })
    .sort((groupA, groupB) => groupA.label.localeCompare(groupB.label));
}

export function buildCanvasWorkspaceResourceGroups(
  input: CanvasWorkspaceExplorerModelInput
): CanvasWorkspaceResourceGroup[] {
  const canvasGroup = buildCanvasResourceGroup(input.canvasDocument);
  const nodeGroups = buildNodeResourceGroups(input.nodes);
  return canvasGroup == null ? nodeGroups : [canvasGroup, ...nodeGroups];
}
