import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(import.meta.dirname, 'SemanticWorkbenchLab.tsx'), 'utf8');
const PANEL = readFileSync(
  join(import.meta.dirname, '../views/canvas/SemanticTransformFocusPanel.tsx'),
  'utf8'
);
const JOIN_CONDITION_EDITOR = readFileSync(
  join(import.meta.dirname, '../views/canvas/SemanticWorkbenchJoinConditionEditor.tsx'),
  'utf8'
);

describe('SemanticWorkbenchLab architecture', () => {
  it('delegates independent card movement to the production DVT viewport model', () => {
    expect(SOURCE).toContain('useCanvasViewportGraphModel');
    expect(SOURCE).toContain('onNodesChange={canvasProcess.onNodesChange}');
    expect(SOURCE).toContain('nodesDraggable');
    expect(SOURCE).not.toContain('applyNodeChanges(');
  });

  it('uses React Flow node state only to preserve movable semantic group geometry', () => {
    expect(PANEL).toContain('useNodesState(');
    expect(PANEL).toContain('const positions = new Map(');
    expect(PANEL).toContain('onNodesChange={onNodesChange}');
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
    expect(SOURCE).toContain('<SemanticTransformFocusPanel');
    expect(PANEL).toContain('projectSemanticWorkbenchGraph(transform)');
    expect(SOURCE).toContain('useState(() => buildCanvasProcess(fixture))');
    expect(SOURCE).toContain('useCanvasViewportGraphModel(liveCanvasProjection)');
    expect(SOURCE).toContain('canonicalNodesById: new Map(');
    expect(SOURCE).not.toContain('useMemo(() => buildCanvasProcess(fixture), [fixture])');
  });

  it('routes Source field selection through the existing Substrait join authority', () => {
    expect(SOURCE).toContain('onToggleCanvasColumnOutput: toggleConnectionColumn');
    expect(SOURCE).toContain('setDvtSubstraitJoinConnectionFieldSelected');
    expect(SOURCE).toContain('onEdgeClick={(_, edge) => setSelectedConnectionId(edge.id)}');
    expect(SOURCE).not.toContain('selectedSourceFields:');
  });

  it('renders grouped Substrait nodes and one factual read-only inspector', () => {
    expect(PANEL).toContain('data-slot="semantic-workbench-node"');
    expect(PANEL).toContain('data-slot="semantic-workbench-inspector"');
    expect(PANEL).toContain('setSelectedSemanticId');
    expect(PANEL).toContain('Tooltip');
    expect(PANEL).toContain('setDvtSubstraitJoinPredicateFields');
    expect(PANEL).toContain('addDvtSubstraitJoinPredicateCondition');
    expect(PANEL).toContain('updateDvtSubstraitJoinPredicateCondition');
    expect(PANEL).toContain('removeDvtSubstraitJoinPredicateCondition');
    expect(PANEL).toContain('data-slot="semantic-workbench-left-field-select"');
    expect(PANEL).toContain('data-slot="semantic-workbench-right-field-select"');
    expect(PANEL).toContain('Aplicar condición');
    expect(JOIN_CONDITION_EDITOR).toContain('label="Añadir condición"');
    expect(PANEL).toContain("details.join(' · ')");
    expect(PANEL).toContain('selectedSemantic?.data.joinOperand');
    expect(JOIN_CONDITION_EDITOR).toContain('Conector de la condición adicional');
    expect(JOIN_CONDITION_EDITOR).toContain('Comparador de la condición adicional');
    expect(PANEL).toContain('DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS');
    expect(PANEL).not.toContain('Impacto estimado');
    expect(PANEL).not.toContain('Editar nodo');
  });

  it('uses one symmetric operand editor for both sides of an additional JOIN condition', () => {
    expect(PANEL).toContain('<SemanticWorkbenchJoinConditionEditor');
    expect(PANEL).not.toContain('<SemanticWorkbenchJoinOperandEditor');
    expect(JOIN_CONDITION_EDITOR.match(/<SemanticWorkbenchJoinOperandEditor/g)).toHaveLength(2);
    expect(JOIN_CONDITION_EDITOR).toContain('conditionDraft.left');
    expect(JOIN_CONDITION_EDITOR).toContain('conditionDraft.right');
    expect(JOIN_CONDITION_EDITOR).toContain('Editar condición');
    expect(JOIN_CONDITION_EDITOR).toContain('Eliminar condición');
    expect(PANEL).not.toContain('rightSourceFieldId: string | null;');
  });
});
