import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const GRAPH_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasGraphHandlers.ts'
);
const CONNECTION_AGGREGATE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasConnectionAggregate.ts'
);

describe('useCanvasGraphHandlers architecture', () => {
  it('stays as a composition seam over the graph interaction capabilities', () => {
    expect(GRAPH_HANDLERS_SOURCE).toContain('useCanvasEdgeAuthoringHandlers');
    expect(GRAPH_HANDLERS_SOURCE).toContain('useCanvasSelectionHandlers');
    expect(GRAPH_HANDLERS_SOURCE).toContain('useCanvasLayoutHandlers');
    expect(GRAPH_HANDLERS_SOURCE).toContain('useCanvasNodeAuthoringHandlers');
    expect(GRAPH_HANDLERS_SOURCE).toContain('canvasGraphHandlerContractBuilders.edgeAuthoring');
    expect(GRAPH_HANDLERS_SOURCE).toContain('canvasGraphHandlerContractBuilders.selection');
    expect(GRAPH_HANDLERS_SOURCE).toContain('canvasGraphHandlerContractBuilders.layout');
    expect(GRAPH_HANDLERS_SOURCE).toContain('canvasGraphHandlerContractBuilders.nodeAuthoring');
    expect(GRAPH_HANDLERS_SOURCE).toContain('interactionState');
    expect(GRAPH_HANDLERS_SOURCE).toContain('interactionEffects');
    expect(GRAPH_HANDLERS_SOURCE).toContain('interactionPolicy');
    expect(GRAPH_HANDLERS_SOURCE).toContain('interactionContracts');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('buildCanvasEdgeAuthoringContracts');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('buildCanvasSelectionContracts');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('buildCanvasLayoutContracts');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('buildCanvasNodeAuthoringContracts');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('useCallback(');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('useMemo(');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('useRef(');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('useState(');
    expect(GRAPH_HANDLERS_SOURCE).not.toContain('toast.');
  });

  it('keeps Canvas edge admission on the shared connection evaluator', () => {
    expect(CONNECTION_AGGREGATE_SOURCE).toContain('evaluateConnection(');
    expect(CONNECTION_AGGREGATE_SOURCE).not.toContain('evaluateConnectionPolicy');
    expect(CONNECTION_AGGREGATE_SOURCE).not.toContain('hasDuplicateEdge');
    expect(CONNECTION_AGGREGATE_SOURCE).not.toContain('wouldCreateCycle');
    expect(CONNECTION_AGGREGATE_SOURCE).not.toContain('rejectCrossPluginIncomingInputEdge');
  });
});
