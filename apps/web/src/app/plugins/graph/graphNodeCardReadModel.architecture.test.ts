import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../../views/architecture.test.support';

const READ_MODEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'graphNodeCardReadModel.ts'
);
const CONTRACT_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'graphNodeCardStrategyContracts.ts'
);
const DBT_STRATEGY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../dbt/dbtGraphNodeCardStrategy.ts'
);
const DVT_STRATEGY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../dvt/dvtGraphNodeCardStrategy.ts'
);
const DEFAULT_STRATEGY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'defaultGraphNodeCardStrategy.ts'
);
const GRAPH_CARD_RENDERER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'GraphNodeRenderer.tsx'
);
const DBT_NODE_RENDERER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../dbt/DbtNodeRenderer.tsx'
);

describe('Graph node card strategy architecture', () => {
  it('keeps plugin-specific card decisions outside the generic graph read model', () => {
    expect(CONTRACT_SOURCE).toContain('export type GraphNodeCardStrategy');
    expect(CONTRACT_SOURCE).toContain('GraphNodeCardReadModel');

    expect(READ_MODEL_SOURCE).toContain('GRAPH_NODE_CARD_STRATEGIES');
    expect(READ_MODEL_SOURCE).toContain('dbtGraphNodeCardStrategy');
    expect(READ_MODEL_SOURCE).toContain('dvtGraphNodeCardStrategy');
    expect(READ_MODEL_SOURCE).toContain('defaultGraphNodeCardStrategy');
    expect(READ_MODEL_SOURCE).not.toContain("pluginId === 'dbt'");
    expect(READ_MODEL_SOURCE).not.toContain("pluginId === 'dvt'");
    expect(READ_MODEL_SOURCE).not.toContain("startsWith('dbt:'");
    expect(READ_MODEL_SOURCE).not.toContain("startsWith('dvt:'");

    expect(DBT_STRATEGY_SOURCE).toContain("id: 'dbt-card'");
    expect(DBT_STRATEGY_SOURCE).toContain("node.pluginId === 'dbt'");
    expect(DBT_STRATEGY_SOURCE).toContain("node.kind.startsWith('dbt:')");

    expect(DVT_STRATEGY_SOURCE).toContain("id: 'dvt-card'");
    expect(DVT_STRATEGY_SOURCE).toContain("node.pluginId === 'dvt'");
    expect(DVT_STRATEGY_SOURCE).toContain("node.kind.startsWith('dvt:')");

    expect(DEFAULT_STRATEGY_SOURCE).toContain("id: 'default-card'");
    expect(DEFAULT_STRATEGY_SOURCE).toContain('matches: () => true');
  });

  it('keeps graph card markup in a shared presentational view', () => {
    expect(GRAPH_CARD_RENDERER_SOURCE).toContain('GraphNodeCardView');
    expect(DBT_NODE_RENDERER_SOURCE).toContain('GraphNodeCardView');

    for (const source of [GRAPH_CARD_RENDERER_SOURCE, DBT_NODE_RENDERER_SOURCE]) {
      expect(source).not.toContain('cardModel.metrics.map');
      expect(source).not.toContain('columnsExpanded');
      expect(source).not.toContain('graphVisualClasses.columnRow');
    }
  });
});
