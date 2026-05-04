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
});
