import { describe, expect, it } from 'vitest';

import DbtNodeComponentSource from './DbtNodeComponent.tsx?raw';
import CanvasNodeMapperSource from '../../views/canvas/canvasNodeMapper.ts?raw';

describe('DbtNodeComponent architecture', () => {
  it('marks a visible semantic node handle as the React Flow drag surface', () => {
    expect(DbtNodeComponentSource).toContain('canvas-node-drag-handle');
    expect(DbtNodeComponentSource).not.toContain("styles.root, 'canvas-node-drag-surface");
    expect(CanvasNodeMapperSource).toContain("'.canvas-node-drag-handle'");
    expect(CanvasNodeMapperSource).toContain('dragHandle: CANVAS_NODE_DRAG_HANDLE_SELECTOR');
  });
});
