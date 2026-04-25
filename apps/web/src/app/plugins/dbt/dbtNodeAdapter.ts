/** Owned concern: project trusted DBT graph payloads into canonical Canvas graph primitives. */
import type {
  CoreNodeRole,
  CanonicalEdge,
  CanonicalNode,
  PluginNodeKind,
} from '../../types/canonical';
import { isCanonicalNodeStatus, isRecord } from '../../types/canonicalGuards';
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

const DBT_NODE_TYPES = new Set<string>(Object.keys(DBT_KIND_BY_TYPE));
const DBT_EDGE_TYPES = new Set<string>(Object.keys(EDGE_RELATION_BY_TYPE));

function hasStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isDbtNodeType(value: unknown): value is DbtNodeType {
  return typeof value === 'string' && DBT_NODE_TYPES.has(value);
}

function isDbtNodeStatus(value: unknown): value is DbtNode['status'] {
  return isCanonicalNodeStatus(value);
}

function isDbtEdgeType(value: unknown): value is DbtEdge['type'] {
  return typeof value === 'string' && DBT_EDGE_TYPES.has(value);
}

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
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isDbtNodeType(value.type) &&
    typeof value.package === 'string' &&
    typeof value.path === 'string' &&
    hasStringArray(value.tags) &&
    isDbtNodeStatus(value.status) &&
    hasStringArray(value.dependencies)
  );
}

function isDbtEdge(value: unknown): value is DbtEdge {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.source === 'string' &&
    typeof value.target === 'string' &&
    isDbtEdgeType(value.type)
  );
}

export const dbtCanvasGraphStrategy: CanvasGraphStrategy = {
  id: 'dbt',
  authoringPolicy: {
    canvasKind: 'dbt',
  },
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
};
