import { describe, expect, it } from 'vitest';

import DbtNodeComponentSource from './DbtNodeComponent.tsx?raw';
import CanvasNodeMapperSource from '../../views/canvas/canvasNodeMapper.ts?raw';

describe('DbtNodeComponent architecture', () => {
  it('marks the visible node shell as the React Flow drag surface', () => {
    expect(DbtNodeComponentSource).toContain('canvas-node-drag-surface');
    expect(CanvasNodeMapperSource).toContain("'.canvas-node-drag-surface'");
    expect(CanvasNodeMapperSource).toContain('dragHandle: CANVAS_NODE_DRAG_HANDLE_SELECTOR');
  });
});
