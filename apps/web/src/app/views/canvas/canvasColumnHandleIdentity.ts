/** Stable field-port identity shared by cards and connection gestures. */
import type { CoreNodeRole } from '../../types/canonical';
export type CanvasColumnPortDirection = 'source' | 'target';
export type CanvasColumnHandleIdentity = Readonly<{
  direction: CanvasColumnPortDirection;
  nodeId: string;
  columnId: string;
}>;

const HANDLE_PREFIX = 'column';

export function createCanvasColumnHandleId(identity: CanvasColumnHandleIdentity): string {
  return [
    HANDLE_PREFIX,
    identity.direction,
    encodeURIComponent(identity.nodeId),
    encodeURIComponent(identity.columnId),
  ].join(':');
}

export function parseCanvasColumnHandleId(
  value: string | null | undefined
): CanvasColumnHandleIdentity | null {
  if (value == null) return null;
  const [prefix, direction, encodedNodeId, encodedColumnId, ...rest] = value.split(':');
  if (
    prefix !== HANDLE_PREFIX ||
    (direction !== 'source' && direction !== 'target') ||
    encodedNodeId == null ||
    encodedColumnId == null ||
    rest.length > 0
  ) {
    return null;
  }
  try {
    const nodeId = decodeURIComponent(encodedNodeId);
    const columnId = decodeURIComponent(encodedColumnId);
    return nodeId.length > 0 && columnId.length > 0 ? { direction, nodeId, columnId } : null;
  } catch {
    return null;
  }
}

export function resolveCanvasColumnPortDirections(
  role: CoreNodeRole
): readonly CanvasColumnPortDirection[] {
  if (role === 'input') return ['source'];
  if (role === 'transform') return ['target', 'source'];
  if (role === 'output') return ['target'];
  return [];
}
