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

  it('renders grouped Substrait nodes and one factual read-only inspector', () => {
    expect(labSource).toContain('data-slot="semantic-workbench-node"');
    expect(labSource).toContain('data-slot="semantic-workbench-inspector"');
    expect(labSource).toContain('setSelectedSemanticId');
    expect(labSource).toContain('Tooltip');
    expect(labSource).toContain('Proyección semántica de solo lectura');
    expect(labSource).not.toContain('Impacto estimado');
    expect(labSource).not.toContain('Editar nodo');
  });
});
