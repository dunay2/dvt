import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(import.meta.dirname, 'SemanticWorkbenchLab.tsx'), 'utf8');

describe('SemanticWorkbenchLab architecture', () => {
  it('delegates independent card movement to the production DVT viewport model', () => {
    expect(SOURCE).toContain('useCanvasViewportGraphModel');
    expect(SOURCE).toContain('onNodesChange={canvasProcess.onNodesChange}');
    expect(SOURCE).toContain('nodesDraggable');
    expect(SOURCE).not.toContain('applyNodeChanges(');
  });

  it('uses React Flow node state only to preserve movable semantic group geometry', () => {
    expect(SOURCE).toContain('useNodesState(');
    expect(SOURCE).toContain('positionsById');
    expect(SOURCE).toContain('onNodesChange={onSemanticNodesChange}');
  });

  it('reuses the DVT data table and existing source sample callback', () => {
    expect(SOURCE).toContain('metadata?.sampleRows');
    expect(SOURCE).toContain('fixture.projectTransformSample(fixture.transform)');
    expect(SOURCE).toContain('OperationalDrawerDataTable');
    expect(SOURCE).toContain('onOpenSourceDataSample: openSourceDataSample');
    expect(SOURCE).toContain('sourceDataSampleInteractionLabel:');
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
    expect(SOURCE).toContain('projectSemanticWorkbenchGraph(fixture.transform)');
    expect(SOURCE).toContain('useState(() => buildCanvasProcess(fixture))');
    expect(SOURCE).toContain('useCanvasViewportGraphModel(liveCanvasProjection)');
    expect(SOURCE).toContain('canonicalNodesById: new Map(');
    expect(SOURCE).not.toContain('useMemo(() => buildCanvasProcess(fixture), [fixture])');
  });

  it('routes Source field selection through the existing Substrait join authority', () => {
    expect(SOURCE).toContain('onToggleCanvasConnectionColumn: toggleConnectionColumn');
    expect(SOURCE).toContain('setDvtSubstraitJoinConnectionFieldSelected');
    expect(SOURCE).toContain('onEdgeClick={(_, edge) => setSelectedConnectionId(edge.id)}');
    expect(SOURCE).not.toContain('selectedSourceFields:');
  });

  it('renders grouped Substrait nodes and one factual read-only inspector', () => {
    expect(SOURCE).toContain('data-slot="semantic-workbench-node"');
    expect(SOURCE).toContain('data-slot="semantic-workbench-inspector"');
    expect(SOURCE).toContain('setSelectedSemanticId');
    expect(SOURCE).toContain('Tooltip');
    expect(SOURCE).toContain('setDvtSubstraitJoinPredicateFields');
    expect(SOURCE).toContain('addDvtSubstraitJoinPredicateCondition');
    expect(SOURCE).toContain('data-slot="semantic-workbench-left-field-select"');
    expect(SOURCE).toContain('data-slot="semantic-workbench-right-field-select"');
    expect(SOURCE).toContain('Aplicar condición');
    expect(SOURCE).toContain('data-slot="semantic-workbench-add-join-condition"');
    expect(SOURCE).toContain("detailLines.join(' · ')");
    expect(SOURCE).toContain('Conector de la condición adicional');
    expect(SOURCE).toContain('Comparador de la condición adicional');
    expect(SOURCE).toContain('DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS');
    expect(SOURCE).not.toContain('Impacto estimado');
    expect(SOURCE).not.toContain('Editar nodo');
  });
});
