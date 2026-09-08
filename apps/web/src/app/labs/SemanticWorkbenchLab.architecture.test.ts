import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(import.meta.dirname, 'SemanticWorkbenchLab.tsx'), 'utf8');

describe('SemanticWorkbenchLab architecture', () => {
  it('delegates independent card movement to the production DVT viewport model', () => {
    expect(SOURCE).toContain('useCanvasViewportGraphModel');
    expect(SOURCE).toContain('onNodesChange={canvasProcess.onNodesChange}');
    expect(SOURCE).toContain('nodesDraggable');
    expect(SOURCE).not.toContain('useNodesState(');
    expect(SOURCE).not.toContain('applyNodeChanges(');
  });

  it('reuses the DVT data table and existing source sample callback', () => {
    expect(SOURCE).toContain('metadata?.sampleRows');
    expect(SOURCE).toContain('OperationalDrawerDataTable');
    expect(SOURCE).toContain('onOpenSourceDataSample: openSourceDataSample');
    expect(SOURCE).not.toContain('<table');
  });

  it('reuses the canonical Node Workbench without a second properties surface', () => {
    expect(SOURCE).toContain("from '../views/canvas/CanvasNodeWorkbenchOverlay'");
    expect(SOURCE).toContain('<CanvasNodeWorkbenchOverlay');
    expect(SOURCE).toContain('onInspectNode: handleInspectNode');
    expect(SOURCE).not.toContain("from '../views/canvas/CanvasNodeWorkbenchPanel'");
    expect(SOURCE).not.toContain("from '../components/ui/context-menu'");
  });

  it('keeps semantic and Canvas projections memoized across Workbench state changes', () => {
    expect(SOURCE).toContain('() => projectSemanticWorkbenchGraph(SEMANTIC_WORKBENCH_TRANSFORM),');
    expect(SOURCE).toContain('useMemo(buildCanvasProcess, [])');
  });

  it('renders grouped Substrait nodes and one factual read-only inspector', () => {
    expect(SOURCE).toContain('data-slot="semantic-workbench-node"');
    expect(SOURCE).toContain('data-slot="semantic-workbench-inspector"');
    expect(SOURCE).toContain('setSelectedSemanticId');
    expect(SOURCE).toContain('Tooltip');
    expect(SOURCE).toContain('Proyección semántica de solo lectura');
    expect(SOURCE).not.toContain('Impacto estimado');
    expect(SOURCE).not.toContain('Editar nodo');
  });
});
