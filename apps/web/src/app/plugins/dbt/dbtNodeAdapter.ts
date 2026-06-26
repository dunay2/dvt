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

function readConfigString(config: DbtNode['config'], key: string): string | undefined {
  const value = config?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeSqlIdentifier(value: string | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }

  const identifier = value
    .trim()
    .replace(/^["'`[]+|["'`\]]+$/g, '')
    .split('.')
    .pop()
    ?.trim();

  return identifier != null && identifier.length > 0 ? identifier : undefined;
}

function readDbtTestType(nodeName: string, compiledSql: string | undefined): string | undefined {
  if (/^(test_)?not_null_/.test(nodeName)) {
    return 'not_null';
  }
  if (/^(test_)?unique_/.test(nodeName)) {
    return 'unique';
  }
  if (compiledSql != null && /\bis\s+null\b/i.test(compiledSql)) {
    return 'not_null';
  }
  if (
    compiledSql != null &&
    /\bgroup\s+by\b/i.test(compiledSql) &&
    /\bcount\s*\(/i.test(compiledSql)
  ) {
    return 'unique';
  }

  return undefined;
}

function readDbtTestTargetModel(node: DbtNode): string | undefined {
  const explicitTarget =
    readConfigString(node.config, 'targetModel') ??
    readConfigString(node.config, 'model') ??
    readConfigString(node.config, 'target');
  if (explicitTarget != null) {
    return explicitTarget;
  }

  return node.dependencies.length === 1 ? node.dependencies[0] : undefined;
}

function readColumnFromDbtTestName(
  nodeName: string,
  testType: string | undefined,
  targetModel: string | undefined
): string | undefined {
  if (testType == null) {
    return undefined;
  }

  const prefix = testType === 'not_null' ? /^(test_)?not_null_/ : /^(test_)?unique_/;
  const suffix = nodeName.replace(prefix, '').trim();
  if (suffix.length === 0) {
    return undefined;
  }

  if (targetModel != null) {
    const targetPrefix = `${targetModel}_`;
    if (suffix.startsWith(targetPrefix) && suffix.length > targetPrefix.length) {
      return suffix.slice(targetPrefix.length);
    }
  }

  return suffix;
}

function readColumnFromDbtTestSql(
  compiledSql: string | undefined,
  testType: string | undefined
): string | undefined {
  if (compiledSql == null || testType == null) {
    return undefined;
  }

  if (testType === 'not_null') {
    return normalizeSqlIdentifier(
      /\bwhere\s+([A-Za-z_][\w."`]*)\s+is\s+null\b/i.exec(compiledSql)?.[1]
    );
  }

  if (testType === 'unique') {
    return normalizeSqlIdentifier(/\bgroup\s+by\s+([A-Za-z_][\w."`]*)/i.exec(compiledSql)?.[1]);
  }

  return undefined;
}

function buildDbtTestMetadata(node: DbtNode): Record<string, string> {
  if (node.type !== 'TEST') {
    return {};
  }

  const testType = readDbtTestType(node.name, node.compiledSql);
  const testTargetModel = readDbtTestTargetModel(node);
  const testTargetColumn =
    readConfigString(node.config, 'targetColumn') ??
    readConfigString(node.config, 'column') ??
    readColumnFromDbtTestSql(node.compiledSql, testType) ??
    readColumnFromDbtTestName(node.name, testType, testTargetModel);
  const testTarget =
    testTargetModel != null && testTargetColumn != null
      ? `${testTargetModel}.${testTargetColumn}`
      : undefined;
  const severity = readConfigString(node.config, 'severity');

  return {
    ...(testType != null ? { testType } : {}),
    ...(testTargetModel != null ? { testTargetModel } : {}),
    ...(testTargetColumn != null ? { testTargetColumn } : {}),
    ...(testTarget != null ? { testTarget } : {}),
    ...(severity != null ? { severity } : {}),
  };
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
      ...node.metadata,
      package: node.package,
      dependencies: node.dependencies,
      compiledSql: node.compiledSql,
      config: node.config,
      columns: node.columns,
      ...buildDbtTestMetadata(node),
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
