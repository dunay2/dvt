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
  it('uses the DBT snapshot strategy explicitly instead of the Canvas authoring default', () => {
    expect(GRAPH_STRATEGY_REGISTRY_SOURCE).toContain("const DEFAULT_STRATEGY_ID = 'transformation'");
    expect(LINEAGE_VIEW_DATA_SOURCE).toContain("resolveCanvasGraphStrategy('dbt')");
    expect(LINEAGE_VIEW_DATA_SOURCE).not.toMatch(/resolveCanvasGraphStrategy\(\s*\)/);
  });
});
