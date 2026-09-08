import { describe, expect, it } from 'vitest';

import labSource from './SemanticWorkbenchLab.tsx?raw';

describe('Semantic Workbench Canvas movement architecture', () => {
  it('delegates independent card movement to the production DVT viewport model', () => {
    expect(labSource).toContain('useCanvasViewportGraphModel');
    expect(labSource).toContain('onNodesChange={canvasProcess.onNodesChange}');
    expect(labSource).toContain('nodesDraggable');
    expect(labSource).not.toContain('useNodesState(');
    expect(labSource).not.toContain('applyNodeChanges(');
  });
});
