/** Owned concern: build the Project Workspace Explorer read model from existing resources. */
import { Database, PanelsTopLeft, type LucideIcon } from 'lucide-react';

import { resolveNodeKindRegistration } from '../plugins/nodeTypeRegistry';
import type { CanonicalNode, CanonicalNodeStatus } from '../types/canonical';

export const CANVAS_WORKSPACE_RESOURCE_DRAG_MIME_TYPE =
  'application/x-dvt-canvas-workspace-resource';

export type CanvasWorkspaceResourceType = 'canvas' | 'canvas_node' | 'schema';

export type CanvasWorkspaceResourceDragPayload = Readonly<{
  resourceId: string;
  resourceType: 'schema';
  schemaName: string;
  label: string;
}>;

export type CanvasWorkspaceExplorerCanvasDocument = Readonly<{
  id?: string;
  kind: string;
  title: string;
}>;

export type CanvasWorkspaceExplorerModelInput = Readonly<{
  nodes: readonly CanonicalNode[];
  canvasDocument?: CanvasWorkspaceExplorerCanvasDocument | null;
  canvasDocuments?: readonly (CanvasWorkspaceExplorerCanvasDocument & { id: string })[];
  activeCanvasId?: string | null;
}>;

export type CanvasWorkspaceResource = Readonly<{
  id: string;
  label: string;
  resourceType: CanvasWorkspaceResourceType;
  status: CanonicalNodeStatus;
  badge: string;
  detail: string | null;
  isActive?: boolean;
  dragPayload?: CanonicalNode;
  projectResourceDragPayload?: CanvasWorkspaceResourceDragPayload;
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

function readMetadataRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readMetadataString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNodeSchemaName(node: CanonicalNode): string | null {
  const metadata = readMetadataRecord(node.metadata);
  const config = readMetadataRecord(metadata?.config);
  const dbt = readMetadataRecord(metadata?.dbt);

  return (
    readMetadataString(metadata?.schema) ??
    readMetadataString(dbt?.schemaName) ??
    readMetadataString(config?.schema)
  );
}

export function serializeCanvasWorkspaceResourceDragPayload(
  payload: CanvasWorkspaceResourceDragPayload
): string {
  return JSON.stringify(payload);
}

export function parseCanvasWorkspaceResourceDragPayload(
  value: string
): CanvasWorkspaceResourceDragPayload | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    const record = readMetadataRecord(parsed);
    if (record?.resourceType !== 'schema') {
      return null;
    }
    const resourceId = readMetadataString(record.resourceId);
    const schemaName = readMetadataString(record.schemaName);
    const label = readMetadataString(record.label);
    if (resourceId == null || schemaName == null || label == null) {
      return null;
    }
    return {
      resourceId,
      resourceType: 'schema',
      schemaName,
      label,
    };
  } catch {
    return null;
  }
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
  input: Pick<
    CanvasWorkspaceExplorerModelInput,
    'canvasDocument' | 'canvasDocuments' | 'activeCanvasId'
  >
): CanvasWorkspaceResourceGroup | null {
  const canvasDocuments =
    input.canvasDocuments ??
    (input.canvasDocument == null
      ? []
      : [
          {
            ...input.canvasDocument,
            id: input.canvasDocument.id ?? input.canvasDocument.kind,
          },
        ]);
  if (canvasDocuments.length === 0) {
    return null;
  }

  return {
    id: 'canvas',
    label: 'Canvases',
    color: '#38bdf8',
    icon: PanelsTopLeft,
    resources: canvasDocuments.map((canvasDocument) => ({
      id: `canvas:${canvasDocument.id}`,
      label: canvasDocument.title,
      resourceType: 'canvas',
      status: 'idle',
      badge: input.activeCanvasId === canvasDocument.id ? 'active' : 'canvas',
      detail: canvasDocument.kind,
      isActive: input.activeCanvasId === canvasDocument.id,
    })),
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

function buildSchemaResourceGroup(
  nodes: readonly CanonicalNode[]
): CanvasWorkspaceResourceGroup | null {
  const schemaCounts = new Map<string, number>();

  nodes.forEach((node) => {
    const schemaName = readNodeSchemaName(node);
    if (schemaName == null) {
      return;
    }

    schemaCounts.set(schemaName, (schemaCounts.get(schemaName) ?? 0) + 1);
  });

  if (schemaCounts.size === 0) {
    return null;
  }

  return {
    id: 'schemas',
    label: 'Schemas',
    color: '#f59e0b',
    icon: Database,
    resources: Array.from(schemaCounts.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([schemaName, nodeCount]) => {
        const resourceId = `schema:${schemaName}`;
        return {
          id: resourceId,
          label: schemaName,
          resourceType: 'schema' as const,
          status: 'idle' as const,
          badge: 'schema',
          detail: `${nodeCount} ${nodeCount === 1 ? 'node' : 'nodes'}`,
          projectResourceDragPayload: {
            resourceId,
            resourceType: 'schema',
            schemaName,
            label: schemaName,
          },
        };
      }),
  };
}

export function buildCanvasWorkspaceResourceGroups(
  input: CanvasWorkspaceExplorerModelInput
): CanvasWorkspaceResourceGroup[] {
  const canvasGroup = buildCanvasResourceGroup(input);
  const schemaGroup = buildSchemaResourceGroup(input.nodes);
  const nodeGroups = buildNodeResourceGroups(input.nodes);
  return [canvasGroup, schemaGroup, ...nodeGroups].filter(
    (group): group is CanvasWorkspaceResourceGroup => group != null
  );
}
