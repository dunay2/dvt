import type {
  CoreNodeRole,
  CanonicalEdge,
  CanonicalNode,
  PluginNodeKind,
} from '../../types/canonical';
import type { DbtEdge, DbtNode, DbtNodeType } from '../../types/dbt';
import type { CanvasGraphStrategy } from '../graphStrategyContracts';

const DBT_PLUGIN_ID = 'dbt';
export const DBT_DRAG_MIME_TYPE = 'application/dbt-node';

const DBT_KIND_BY_TYPE: Record<DbtNodeType, PluginNodeKind> = {
  SOURCE: 'dbt:source',
  MODEL: 'dbt:model',
  SEED: 'dbt:seed',
  SNAPSHOT: 'dbt:snapshot',
  TEST: 'dbt:test',
  EXPOSURE: 'dbt:exposure',
  METRIC: 'dbt:metric',
  MACRO: 'dbt:macro',
};

const ROLE_BY_DBT_TYPE: Record<DbtNodeType, CoreNodeRole> = {
  SOURCE: 'input',
  MODEL: 'transform',
  SEED: 'input',
  SNAPSHOT: 'transform',
  TEST: 'check',
  EXPOSURE: 'output',
  METRIC: 'output',
  MACRO: 'control',
};

const EDGE_RELATION_BY_TYPE: Record<DbtEdge['type'], CanonicalEdge['relation']> = {
  source: 'lineage',
  ref: 'lineage',
  test: 'validation',
  exposure: 'consumption',
  metric: 'metric',
};

export function mapDbtTypeToPluginKind(type: DbtNodeType): PluginNodeKind {
  return DBT_KIND_BY_TYPE[type];
}

export function mapDbtNodeToCanonical(node: DbtNode): CanonicalNode {
  return {
    id: node.id,
    name: node.name,
    pluginId: DBT_PLUGIN_ID,
    kind: mapDbtTypeToPluginKind(node.type),
    role: ROLE_BY_DBT_TYPE[node.type],
    status: node.status,
    tags: node.tags,
    path: node.path,
    description: node.description,
    lastDuration: node.lastDuration,
    lastCost: node.lastCost,
    metadata: {
      package: node.package,
      dependencies: node.dependencies,
      compiledSql: node.compiledSql,
      config: node.config,
      columns: node.columns,
    },
  };
}

export function mapDbtEdgeToCanonical(edge: DbtEdge): CanonicalEdge {
  return {
    id: edge.id,
    sourceId: edge.source,
    targetId: edge.target,
    relation: EDGE_RELATION_BY_TYPE[edge.type],
  };
}

function isDbtNode(value: unknown): value is DbtNode {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<DbtNode>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.type === 'string' &&
    Array.isArray(candidate.tags) &&
    typeof candidate.package === 'string'
  );
}

function isDbtEdge(value: unknown): value is DbtEdge {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<DbtEdge>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.source === 'string' &&
    typeof candidate.target === 'string' &&
    typeof candidate.type === 'string'
  );
}

const buildDbtCanvasGraphStrategy = (id: string): CanvasGraphStrategy => ({
  id,
  mapNodeToCanonical: (node) => {
    if (!isDbtNode(node)) {
      return null;
    }
    return mapDbtNodeToCanonical(node);
  },
  mapEdgeToCanonical: (edge) => {
    if (!isDbtEdge(edge)) {
      return null;
    }
    return mapDbtEdgeToCanonical(edge);
  },
  parseDropPayload: (dataTransfer) => {
    const payload = dataTransfer.getData(DBT_DRAG_MIME_TYPE);
    if (!payload) {
      return null;
    }

    try {
      const parsed = JSON.parse(payload) as unknown;
      if (!isDbtNode(parsed)) {
        return null;
      }
      return mapDbtNodeToCanonical(parsed);
    } catch {
      return null;
    }
  },
});

export const dbtCanvasGraphStrategy: CanvasGraphStrategy = buildDbtCanvasGraphStrategy('dbt');
export const transformationCanvasGraphStrategy: CanvasGraphStrategy =
  buildDbtCanvasGraphStrategy('transformation');
