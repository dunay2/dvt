import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const LINEAGE_VIEW_DATA_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useLineageViewData.ts'
);
const GRAPH_STRATEGY_REGISTRY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../plugins/graphStrategyRegistry.ts'
);

describe('lineage graph strategy boundary', () => {
  it('projects the workspace DBT snapshot without resolving a Canvas authoring runtime', () => {
    expect(GRAPH_STRATEGY_REGISTRY_SOURCE).toContain(
      "const DEFAULT_STRATEGY_ID = 'transformation'"
    );
    expect(LINEAGE_VIEW_DATA_SOURCE).toContain("useWorkspaceGraphForViewQuery('lineage', 60_000)");
    expect(LINEAGE_VIEW_DATA_SOURCE).toContain('projectLineageGraph(rawNodes, rawEdges)');
    expect(LINEAGE_VIEW_DATA_SOURCE).not.toContain('resolveCanvasGraphStrategy');
    expect(LINEAGE_VIEW_DATA_SOURCE).not.toContain('graphStrategyRegistry');
  });
});
