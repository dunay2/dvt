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

  it('reuses the DVT data table and existing source sample callback', () => {
    expect(labSource).toContain('metadata?.sampleRows');
    expect(labSource).toContain('OperationalDrawerDataTable');
    expect(labSource).toContain('onOpenSourceDataSample: openSourceDataSample');
    expect(labSource).not.toContain('<table');
  });
});
