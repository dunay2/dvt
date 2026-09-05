import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../../views/architecture.test.support';

const READ_MODEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'graphNodeCardReadModel.ts'
);
const REGISTRY_SOURCE = readArchitectureSiblingSource(import.meta.dirname, '../registry.ts');
const CONTRACT_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'graphNodeCardStrategyContracts.ts'
);
const DBT_CONTRIBUTIONS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../dbt/dbtContributions.ts'
);
const DBT_STRATEGY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../dbt/dbtGraphNodeCardStrategy.ts'
);
const DVT_CONTRIBUTIONS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../dvt/dvtContributions.ts'
);
const DVT_STRATEGY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../dvt/dvtGraphNodeCardStrategy.ts'
);
const DBT_NODE_CATALOG_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../nodeTypeCatalog.dbt.ts'
);
const DBT_PROJECT_PROJECTION_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../views/canvas/dbtProjectFileProjection.ts'
);
const SHARED_SOURCE_MODEL_STRATEGY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'sharedSourceModelGraphNodeCardStrategy.ts'
);
const DEFAULT_STRATEGY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'defaultGraphNodeCardStrategy.ts'
);
const GRAPH_CARD_RENDERER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'GraphNodeRenderer.tsx'
);
const DBT_RUNTIME_CONTRIBUTIONS_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../dbt/DbtNodeRenderer.tsx'
);

describe('Graph node card strategy architecture', () => {
  it('uses one product card strategy for equivalent Source and Model roles', () => {
    expect(CONTRACT_SOURCE).toContain('export type GraphNodeCardStrategy');
    expect(CONTRACT_SOURCE).toContain('GraphNodeCardReadModel');

    expect(READ_MODEL_SOURCE).not.toContain('dbtGraphNodeCardStrategy');
    expect(READ_MODEL_SOURCE).not.toContain('dvtGraphNodeCardStrategy');
    expect(READ_MODEL_SOURCE).not.toContain('../dbt/');
    expect(READ_MODEL_SOURCE).not.toContain('../dvt/');
    expect(READ_MODEL_SOURCE).toContain('defaultGraphNodeCardStrategy');
    expect(READ_MODEL_SOURCE).not.toContain("pluginId === 'dbt'");
    expect(READ_MODEL_SOURCE).not.toContain("pluginId === 'dvt'");
    expect(READ_MODEL_SOURCE).not.toContain("startsWith('dbt:'");
    expect(READ_MODEL_SOURCE).not.toContain("startsWith('dvt:'");

    expect(REGISTRY_SOURCE).toContain('graphNodeCardStrategies?:');
    expect(REGISTRY_SOURCE).toContain('function getGraphNodeCardStrategies(');
    expect(REGISTRY_SOURCE).toContain('sharedSourceModelGraphNodeCardStrategy');
    expect(DBT_CONTRIBUTIONS_SOURCE).toContain(
      'graphNodeCardStrategies: [dbtGraphNodeCardStrategy]'
    );
    expect(DVT_CONTRIBUTIONS_SOURCE).toContain(
      'graphNodeCardStrategies: [dvtGraphNodeCardStrategy]'
    );

    expect(DBT_STRATEGY_SOURCE).toContain("id: 'dbt-card'");
    expect(DBT_STRATEGY_SOURCE).toContain("node.pluginId === 'dbt'");
    expect(DBT_STRATEGY_SOURCE).toContain("node.kind.startsWith('dbt:')");

    expect(DVT_STRATEGY_SOURCE).toContain("id: 'dvt-card'");
    expect(DVT_STRATEGY_SOURCE).toContain("node.pluginId === 'dvt'");
    expect(DVT_STRATEGY_SOURCE).toContain("node.kind.startsWith('dvt:')");

    expect(SHARED_SOURCE_MODEL_STRATEGY_SOURCE).toContain("id: 'shared-source-model-card'");
    for (const kind of ['dvt:source', 'dvt:transform']) {
      expect(SHARED_SOURCE_MODEL_STRATEGY_SOURCE).toContain(`'${kind}'`);
    }
    for (const retiredKind of ['dbt:source', 'dbt:model']) {
      expect(SHARED_SOURCE_MODEL_STRATEGY_SOURCE).not.toContain(`'${retiredKind}'`);
      expect(DBT_NODE_CATALOG_SOURCE).not.toContain(`kind: '${retiredKind}'`);
      expect(DBT_PROJECT_PROJECTION_SOURCE).not.toContain(`kind: '${retiredKind}'`);
    }
    expect(DBT_STRATEGY_SOURCE).not.toContain("node.kind === 'dvt:source'");
    expect(DBT_STRATEGY_SOURCE).not.toContain("node.kind === 'dvt:transform'");
    expect(DVT_STRATEGY_SOURCE).not.toContain("node.kind === 'dvt:source'");
    expect(DVT_STRATEGY_SOURCE).not.toContain("node.kind === 'dvt:transform'");

    expect(DEFAULT_STRATEGY_SOURCE).toContain("id: 'default-card'");
    expect(DEFAULT_STRATEGY_SOURCE).toContain('matches: () => true');
  });

  it('keeps shared operational copy in component-owned tokens and retires action-button copy', () => {
    const copyTokensPath = path.resolve(import.meta.dirname, 'graphNodeCardCopyTokens.ts');

    expect(existsSync(copyTokensPath), 'graphNodeCardCopyTokens.ts must exist').toBe(true);

    const copyTokensSource = readFileSync(copyTokensPath, 'utf8');

    expect(copyTokensSource).toContain('resolveGraphNodeCardCopy');
    expect(copyTokensSource).not.toContain('nodeActionsLabel');

    for (const source of [
      DEFAULT_STRATEGY_SOURCE,
      DBT_STRATEGY_SOURCE,
      DVT_STRATEGY_SOURCE,
      SHARED_SOURCE_MODEL_STRATEGY_SOURCE,
    ]) {
      expect(source).not.toContain('nodeActionsLabel');
      expect(source).not.toContain("'Más acciones del nodo'");
      expect(source).not.toContain('"Más acciones del nodo"');
    }

    expect(DBT_STRATEGY_SOURCE).toContain('resolveGraphNodeCardCopy');
    expect(DVT_STRATEGY_SOURCE).toContain('resolveGraphNodeCardCopy');
    expect(SHARED_SOURCE_MODEL_STRATEGY_SOURCE).toContain('resolveGraphNodeCardCopy');
  });

  it('keeps graph card markup in a shared presentational view', () => {
    expect(GRAPH_CARD_RENDERER_SOURCE).toContain('GraphNodeCardView');
    expect(DBT_CONTRIBUTIONS_SOURCE).toContain('component: GraphNodeRenderer');
    expect(DBT_RUNTIME_CONTRIBUTIONS_SOURCE).not.toContain('function DbtNodeRenderer');

    for (const source of [GRAPH_CARD_RENDERER_SOURCE]) {
      expect(source).not.toContain('cardModel.metrics.map');
      expect(source).not.toContain('columnsExpanded');
      expect(source).not.toContain('graphVisualClasses.columnRow');
    }
  });
});
