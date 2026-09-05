import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const NODE_DUPLICATE_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasNodeDuplicateHandlers.ts'
);
const GRAPH_HANDLER_CONTRACTS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasGraphHandlerContracts.ts'
);
const NODE_DROP_AGGREGATE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasNodeDropAggregate.ts'
);
const GRAPH_STRATEGY_CONTRACTS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../plugins/graphStrategyContracts.ts'
);
const SURFACE_STRATEGY_CONTRACTS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../plugins/canvasSurfaceStrategyContracts.ts'
);
const DVT_TRANSFORMATION_STRATEGY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../plugins/dvt/transformationGraphStrategy.ts'
);

describe('canvas draft authoring component architecture', () => {
  it('keeps source-text tripwires only for import ownership that runtime tests cannot observe', () => {
    expect(GRAPH_HANDLER_CONTRACTS_SOURCE).toContain("from '../../plugins/graphStrategyContracts'");
    expect(DVT_TRANSFORMATION_STRATEGY_SOURCE).toContain(
      'export const transformationCanvasGraphStrategy'
    );

    expect(GRAPH_STRATEGY_CONTRACTS_SOURCE).not.toContain('authoringPolicy');
    expect(GRAPH_STRATEGY_CONTRACTS_SOURCE).not.toContain('surfacePolicy');
    expect(SURFACE_STRATEGY_CONTRACTS_SOURCE).toContain('CanvasSurfaceStrategy');
    expect(SURFACE_STRATEGY_CONTRACTS_SOURCE).toContain('contextual-overlay');
    expect(DVT_TRANSFORMATION_STRATEGY_SOURCE).not.toContain('authoringPolicy');
    expect(NODE_DROP_AGGREGATE_SOURCE).not.toContain('CanvasGraphStrategy');
    expect(NODE_DROP_AGGREGATE_SOURCE).not.toContain('graphStrategy');
    expect(NODE_DUPLICATE_HANDLERS_SOURCE).not.toContain('setNodes((existingNodes)');
  });
});
