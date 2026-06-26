import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import DbtNodeComponentSource from './DbtNodeComponent.tsx?raw';
import CanvasNodeMapperSource from '../../views/canvas/canvasNodeMapper.ts?raw';

const CANVAS_NODE_SHELL_PATH = resolve(import.meta.dirname, 'CanvasNodeShell.tsx');
const CANVAS_NODE_CONTEXT_MENU_VIEW_PATH = resolve(
  import.meta.dirname,
  'CanvasNodeContextMenuView.tsx'
);
const CANVAS_NODE_CONTEXT_MENU_PRIMITIVES_PATH = resolve(
  import.meta.dirname,
  'CanvasNodeContextMenuPrimitives.tsx'
);

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

  it('renders node context-menu actions from the governed read model', () => {
    expect(DbtNodeComponentSource).toContain('buildCanvasNodeContextMenuModel');
    expect(DbtNodeComponentSource).toContain('CanvasNodeContextMenuActionId');
  });

  it('delegates React Flow shell markup to the shared CanvasNodeShell template', () => {
    expect(existsSync(CANVAS_NODE_SHELL_PATH)).toBe(true);
    expect(existsSync(CANVAS_NODE_CONTEXT_MENU_VIEW_PATH)).toBe(true);
    expect(existsSync(CANVAS_NODE_CONTEXT_MENU_PRIMITIVES_PATH)).toBe(true);
    const canvasNodeShellSource = readFileSync(CANVAS_NODE_SHELL_PATH, 'utf8');
    const canvasNodeContextMenuViewSource = readFileSync(
      CANVAS_NODE_CONTEXT_MENU_VIEW_PATH,
      'utf8'
    );
    const canvasNodeContextMenuPrimitivesSource = readFileSync(
      CANVAS_NODE_CONTEXT_MENU_PRIMITIVES_PATH,
      'utf8'
    );

    expect(DbtNodeComponentSource).toContain('CanvasNodeShell');
    expect(DbtNodeComponentSource).not.toContain('Handle,');
    expect(DbtNodeComponentSource).not.toContain('position={Position.');
    expect(DbtNodeComponentSource).not.toContain('ContextMenuTrigger');
    expect(DbtNodeComponentSource).not.toContain('ContextMenuContent');

    expect(canvasNodeShellSource).toContain("from '@xyflow/react'");
    expect(canvasNodeShellSource).toContain('ContextMenuTrigger');
    expect(canvasNodeShellSource).toContain('CanvasNodeContextMenuView');
    expect(canvasNodeShellSource).not.toContain('ContextMenuContent');
    expect(canvasNodeContextMenuViewSource).toContain("from './CanvasNodeContextMenuPrimitives'");
    expect(canvasNodeContextMenuViewSource).not.toContain("from '../ui/context-menu'");
    expect(canvasNodeContextMenuViewSource).not.toContain('className=');
    expect(canvasNodeContextMenuViewSource).not.toContain('text-[10px]');
    expect(canvasNodeContextMenuPrimitivesSource).toContain('ContextMenuContent');
    expect(canvasNodeContextMenuPrimitivesSource).toContain(
      'const canvasNodeContextMenuClassNames'
    );
  });
});
