/** Owned concern: serialize contextual project-resource drag payloads for Canvas attachments. */

export const CANVAS_WORKSPACE_RESOURCE_DRAG_MIME_TYPE =
  'application/x-dvt-canvas-workspace-resource';

export type CanvasWorkspaceResourceDragPayload = Readonly<{
  resourceId: string;
  resourceType: 'schema';
  schemaName: string;
  label: string;
}>;

function readMetadataRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readMetadataString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
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
