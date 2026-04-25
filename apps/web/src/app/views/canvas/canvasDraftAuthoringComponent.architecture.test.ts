import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const DRAFT_AUTHORING_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDraftAuthoring.ts'
);
const DRAFT_SESSION_BASELINE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDraftSessionBaseline.ts'
);
const NODE_DUPLICATE_HANDLERS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasNodeDuplicateHandlers.ts'
);
const NODE_DUPLICATE_COMMAND_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasDuplicateNodeCommand.ts'
);
const GRAPH_HANDLER_CONTRACTS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasGraphHandlerContracts.ts'
);
const NODE_DROP_AGGREGATE_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasNodeDropAggregate.ts'
);
const GRAPH_STRATEGY_REGISTRY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../plugins/graphStrategyRegistry.ts'
);
const DBT_NODE_ADAPTER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../plugins/dbt/dbtNodeAdapter.ts'
);

describe('canvas draft authoring component architecture', () => {
  it('keeps signature policy pure and duplicate view fallout outside React state updaters', () => {
    expect(DRAFT_AUTHORING_SOURCE).toContain(
      'Owned concern: compose Canvas semantic graph state'
    );
    expect(DRAFT_AUTHORING_SOURCE).toContain('serializeCanvasDraftAuthoringSignature');
    expect(DRAFT_AUTHORING_SOURCE).toContain('serializeCanvasDraftAuthoringBaselineSignature');
    expect(DRAFT_AUTHORING_SOURCE).toContain(
      'serializeWorkspaceGraphDraftStructuralSignature'
    );
    expect(DRAFT_AUTHORING_SOURCE).not.toContain("from './canvasDraftSession'");

    expect(DRAFT_SESSION_BASELINE_SOURCE).toContain(
      'serializeWorkspaceGraphDraftStructuralSignature'
    );

    expect(NODE_DUPLICATE_HANDLERS_SOURCE).not.toContain('useEffect');
    expect(NODE_DUPLICATE_HANDLERS_SOURCE).toContain('latestNodesRef.current = nodes');
    expect(NODE_DUPLICATE_HANDLERS_SOURCE).not.toContain('setNodes((existingNodes)');
  });

  it('keeps plugin graph strategies and authoring metadata behind neutral contracts', () => {
    expect(DRAFT_AUTHORING_SOURCE).toContain("from './canvasAuthoringMetadata'");
    expect(DRAFT_AUTHORING_SOURCE).not.toContain('function cloneMetadata');
    expect(NODE_DUPLICATE_COMMAND_SOURCE).toContain("from './canvasAuthoringMetadata'");
    expect(NODE_DUPLICATE_COMMAND_SOURCE).not.toContain('structuredClone');

    expect(GRAPH_HANDLER_CONTRACTS_SOURCE).toContain(
      "from '../../plugins/graphStrategyContracts'"
    );
    expect(NODE_DUPLICATE_COMMAND_SOURCE).toContain(
      "from '../../plugins/graphStrategyContracts'"
    );
    expect(NODE_DROP_AGGREGATE_SOURCE).toContain(
      "from '../../plugins/graphStrategyContracts'"
    );
    expect(GRAPH_STRATEGY_REGISTRY_SOURCE).toContain(
      "from './graphStrategyContracts'"
    );
    expect(DBT_NODE_ADAPTER_SOURCE).toContain("from '../graphStrategyContracts'");

    expect(GRAPH_HANDLER_CONTRACTS_SOURCE).not.toContain('dbtNodeAdapter');
    expect(NODE_DUPLICATE_COMMAND_SOURCE).not.toContain('dbtNodeAdapter');
    expect(NODE_DROP_AGGREGATE_SOURCE).not.toContain('dbtNodeAdapter');
  });
});
