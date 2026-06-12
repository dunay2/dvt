import { describe, expect, it } from 'vitest';

import {
  parseCanvasWorkspaceResourceDragPayload,
  serializeCanvasWorkspaceResourceDragPayload,
} from './canvasWorkspaceExplorerModel';

describe('canvasWorkspaceExplorerModel', () => {
  it('round-trips contextual schema drag payloads for node-card attachment', () => {
    const serialized = serializeCanvasWorkspaceResourceDragPayload({
      resourceId: 'schema:mart',
      resourceType: 'schema',
      schemaName: 'mart',
      label: 'mart',
    });

    expect(parseCanvasWorkspaceResourceDragPayload(serialized)).toEqual({
      resourceId: 'schema:mart',
      resourceType: 'schema',
      schemaName: 'mart',
      label: 'mart',
    });
  });

  it('rejects malformed or non-schema contextual drag payloads', () => {
    expect(parseCanvasWorkspaceResourceDragPayload('{')).toBeNull();
    expect(
      parseCanvasWorkspaceResourceDragPayload(
        JSON.stringify({
          resourceId: 'canvas:dbt',
          resourceType: 'canvas',
          schemaName: 'mart',
          label: 'mart',
        })
      )
    ).toBeNull();
    expect(
      parseCanvasWorkspaceResourceDragPayload(
        JSON.stringify({
          resourceType: 'schema',
          schemaName: 'mart',
          label: 'mart',
        })
      )
    ).toBeNull();
  });
});
