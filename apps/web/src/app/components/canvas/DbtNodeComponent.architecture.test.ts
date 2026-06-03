import { describe, expect, it } from 'vitest';

import DbtNodeComponentSource from './DbtNodeComponent.tsx?raw';
import CanvasNodeMapperSource from '../../views/canvas/canvasNodeMapper.ts?raw';

describe('DbtNodeComponent architecture', () => {
  it('keeps the whole node card as the React Flow drag surface', () => {
    expect(DbtNodeComponentSource).not.toContain('canvas-node-drag-handle');
    expect(DbtNodeComponentSource).not.toContain('styles.dragHandle');
    expect(CanvasNodeMapperSource).not.toContain('CANVAS_NODE_DRAG_HANDLE_SELECTOR');
    expect(CanvasNodeMapperSource).not.toContain('dragHandle:');
  });

  it('uses Canvas execution selection state for node selection menu intent', () => {
    expect(DbtNodeComponentSource).toContain('selectedForExecution');
    expect(DbtNodeComponentSource).toContain('data.selectedForExecution ?? selected');
    expect(DbtNodeComponentSource).toContain(
      'data.onToggleNodeSelection?.(id, !selectedForExecution)'
    );
  });

  it('routes schema resource drops through the node attachment command handler', () => {
    expect(DbtNodeComponentSource).toContain('CANVAS_WORKSPACE_RESOURCE_DRAG_MIME_TYPE');
    expect(DbtNodeComponentSource).toContain('parseCanvasWorkspaceResourceDragPayload');
    expect(DbtNodeComponentSource).toContain('onAttachSchemaToNode');
    expect(DbtNodeComponentSource).toContain('data.onAttachSchemaToNode?.(id, payload.schemaName)');
  });
});
