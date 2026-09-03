/** Owned concern: project one provenance-preserving DBT model artifact from canonical graph state. */
import { ConnectedSourceRefSchema, WAREHOUSE_CONNECTION_TYPE } from '@dvt/contracts';

import { buildCanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createDbtNodeAuthoringMetadata,
  type DbtNodeAuthoringMetadata,
} from './canvasDbtAuthoringModel';
import {
  resolveDbtModelProjectionColumns,
  validateDbtModelProjectionColumns,
} from './canvasDbtModelColumnAuthoring';
import { createDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';
import {
  isObjectFilePostgresNode,
  resolveObjectFilePostgresAuthoringMetadata,
} from './objectFilePostgresAuthoringModel';
import { quoteSqlIdentifier } from './canvasSqlIdentifier';

export type DbtModelArtifactSource = Readonly<{
  sourceName: string;
  schemaName: string;
  tableName: string;
  schemaBinding?: 'object-file-postgres-scope';
}>;

export type DbtModelArtifactProjection = Readonly<{
  modelNodeId: string;
  name: string;
  path: string;
  language: 'sql';
  materialized: string;
  provenance: 'authored' | 'generated';
  outputColumns: readonly string[];
  body: string;
  content: string;
  origin: Readonly<{
    nodeId: string;
    sql: string;
  }>;
  source?: DbtModelArtifactSource;
}>;

export type DbtModelArtifactProjectionResult =
  | Readonly<{
      ok: true;
      artifact: DbtModelArtifactProjection;
    }>
  | Readonly<{
      ok: false;
      reason:
        | 'not_dbt_model'
        | 'origin_required'
        | 'origin_metadata_unavailable'
        | 'origin_columns_unavailable'
        | 'projection_columns_invalid';
      message: string;
    }>;

type ProjectDbtModelArtifactArgs = Readonly<{
  modelNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
  authoringMetadata?: DbtNodeAuthoringMetadata;
}>;

type DbtModelOriginProjection = Readonly<{
  nodeId: string;
  nodeName: string;
  sql: string;
  columnNames: readonly string[];
  source?: DbtModelArtifactSource;
}>;

export function normalizeDbtArtifactIdentifier(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  return normalized.length > 0 ? normalized : fallback;
}

function isDbtSource(node: CanonicalNode): boolean {
  return node.pluginId === 'dbt' && node.kind === 'dbt:source';
}

function isWarehouseSource(node: CanonicalNode): boolean {
  return node.pluginId === 'dvt.warehouse-source' && node.kind === 'dvt:source';
}

function isDbtModel(node: CanonicalNode): boolean {
  return node.pluginId === 'dbt' && node.kind === 'dbt:model';
}

function isCompatibleOrigin(node: CanonicalNode): boolean {
  return (
    isDbtSource(node) ||
    isWarehouseSource(node) ||
    isObjectFilePostgresNode(node) ||
    isDbtModel(node)
  );
}

export function resolveCompatibleDbtModelOrigins(
  args: Pick<ProjectDbtModelArtifactArgs, 'modelNode' | 'nodes' | 'edges'>
): readonly CanonicalNode[] {
  const nodeById = new Map(args.nodes.map((node) => [node.id, node]));
  return args.edges
    .filter((edge) => edge.targetId === args.modelNode.id)
    .map((edge) => nodeById.get(edge.sourceId))
    .filter((node): node is CanonicalNode => node != null && isCompatibleOrigin(node));
}

function projectSourceOrigin(
  origin: CanonicalNode
): DbtModelOriginProjection | DbtModelArtifactProjectionResult {
  if (isDbtSource(origin)) {
    const metadata = createDbtNodeAuthoringMetadata(origin);
    return {
      nodeId: origin.id,
      nodeName: origin.name,
      sql: `{{ source('${metadata.sourceName}', '${metadata.tableName}') }}`,
      columnNames: [],
      source: {
        sourceName: metadata.sourceName,
        schemaName: metadata.schemaName,
        tableName: metadata.tableName,
      },
    };
  }

  if (isObjectFilePostgresNode(origin)) {
    const metadata = resolveObjectFilePostgresAuthoringMetadata(origin);
    if (metadata == null) {
      return {
        ok: false,
        reason: 'origin_metadata_unavailable',
        message: `DBT source origin "${origin.name}" has incomplete object-file staging metadata.`,
      };
    }
    const sourceName = metadata.target.schema;
    return {
      nodeId: origin.id,
      nodeName: origin.name,
      sql: `{{ source('${sourceName}', '${metadata.target.relation}') }}`,
      columnNames: metadata.columns.map((column) => column.targetColumn),
      source: {
        sourceName,
        schemaName: metadata.target.schema,
        tableName: metadata.target.relation,
        schemaBinding: 'object-file-postgres-scope',
      },
    };
  }

  const connectedSourceRef = ConnectedSourceRefSchema.safeParse(
    origin.metadata?.connectedSourceRef
  );
  if (!connectedSourceRef.success || origin.metadata?.sourceObjectId !== undefined) {
    return {
      ok: false,
      reason: 'origin_metadata_unavailable',
      message: `DBT source origin "${origin.name}" does not expose a valid connected source binding.`,
    };
  }
  const provider = connectedSourceRef.data.connectionRef.provider;
  if (!WAREHOUSE_CONNECTION_TYPE.some((supportedProvider) => supportedProvider === provider)) {
    return {
      ok: false,
      reason: 'origin_metadata_unavailable',
      message: `DBT source origin "${origin.name}" uses unsupported connection provider "${provider}".`,
    };
  }

  const metadata = createDvtNodeAuthoringMetadata(origin);
  if (metadata?.kind !== 'source') {
    return {
      ok: false,
      reason: 'origin_metadata_unavailable',
      message: `DBT source origin "${origin.name}" does not expose warehouse source metadata.`,
    };
  }

  return {
    nodeId: origin.id,
    nodeName: origin.name,
    sql: `{{ source('${metadata.alias}', '${metadata.table}') }}`,
    columnNames: [],
    source: {
      sourceName: metadata.alias,
      schemaName: metadata.schema,
      tableName: metadata.table,
    },
  };
}

function resolveOriginProjection(
  args: ProjectDbtModelArtifactArgs,
  metadata: DbtNodeAuthoringMetadata,
  ancestorModelIds: ReadonlySet<string>
): DbtModelOriginProjection | DbtModelArtifactProjectionResult {
  const selectedSourceId = metadata.selectedSourceId.trim();
  const compatibleOrigins = resolveCompatibleDbtModelOrigins(args);
  const origin =
    selectedSourceId.length > 0
      ? compatibleOrigins.find((candidate) => candidate.id === selectedSourceId)
      : compatibleOrigins.length === 1
        ? compatibleOrigins[0]
        : undefined;

  if (origin == null) {
    return {
      ok: false,
      reason: 'origin_required',
      message: `DBT model "${args.modelNode.name}" must select a connected source or model origin.`,
    };
  }

  if (isDbtSource(origin) || isWarehouseSource(origin) || isObjectFilePostgresNode(origin)) {
    const projection = projectSourceOrigin(origin);
    if ('ok' in projection) {
      return projection;
    }
    if (projection.columnNames.length > 0) {
      return projection;
    }
    return {
      ...projection,
      columnNames: buildCanvasNodePresentationTruth({
        node: origin,
        nodes: args.nodes,
        edges: args.edges,
      }).columns.visible.map((column) => column.name),
    };
  }

  const originMetadata = createDbtNodeAuthoringMetadata(origin);
  const authoredOriginColumns = buildCanvasNodePresentationTruth({
    node: origin,
    nodes: [origin],
    edges: [],
  }).columns.declared.map((column) => column.name);
  const originColumns =
    authoredOriginColumns.length === 0 && originMetadata.modelSql == null
      ? projectDbtModelArtifactInternal(
          { modelNode: origin, nodes: args.nodes, edges: args.edges },
          ancestorModelIds
        )
      : null;
  if (originColumns != null && !originColumns.ok) return originColumns;
  const declaredProjectionRejection = validateDbtModelProjectionColumns(
    originMetadata.projectionColumns,
    authoredOriginColumns
  );
  if (authoredOriginColumns.length > 0 && declaredProjectionRejection != null) {
    return {
      ok: false,
      reason: 'projection_columns_invalid',
      message: `DBT model "${origin.name}" has an invalid generated-column projection.`,
    };
  }
  const columnNames =
    originColumns?.artifact.outputColumns ??
    resolveDbtModelProjectionColumns(originMetadata.projectionColumns, authoredOriginColumns)
      .filter((column) => column.output)
      .map((column) => column.name);
  if (columnNames.length === 0) {
    return {
      ok: false,
      reason: 'origin_columns_unavailable',
      message: `DBT model origin "${origin.name}" does not expose canonical output columns.`,
    };
  }

  return {
    nodeId: origin.id,
    nodeName: origin.name,
    sql: `{{ ref('${normalizeDbtArtifactIdentifier(origin.name, origin.id)}') }}`,
    columnNames,
  };
}

function buildGeneratedBody(origin: DbtModelOriginProjection): string {
  const selection = origin.columnNames.map((columnName, index) => {
    const quotedColumn = quoteSqlIdentifier(columnName);
    const separator = index === origin.columnNames.length - 1 ? '' : ',';
    return `  origin.${quotedColumn} as ${quotedColumn}${separator}`;
  });
  return ['select', ...selection, `from ${origin.sql} as origin`].join('\n');
}

function buildArtifactContent(materialized: string, body: string): string {
  return [`{{ config(materialized='${materialized}') }}`, '', body, ''].join('\n');
}

function projectDbtModelArtifactInternal(
  args: ProjectDbtModelArtifactArgs,
  ancestorModelIds: ReadonlySet<string>
): DbtModelArtifactProjectionResult {
  if (!isDbtModel(args.modelNode)) {
    return {
      ok: false,
      reason: 'not_dbt_model',
      message: `Node "${args.modelNode.name}" is not a DBT model.`,
    };
  }
  if (ancestorModelIds.has(args.modelNode.id)) {
    return {
      ok: false,
      reason: 'origin_required',
      message: `DBT model "${args.modelNode.name}" cannot use a cyclic model origin.`,
    };
  }

  const metadata = args.authoringMetadata ?? createDbtNodeAuthoringMetadata(args.modelNode);
  const nextAncestorModelIds = new Set(ancestorModelIds);
  nextAncestorModelIds.add(args.modelNode.id);
  const origin = resolveOriginProjection(args, metadata, nextAncestorModelIds);
  if ('ok' in origin) {
    return origin;
  }

  const authoredBody = metadata.modelSql;
  const hasAuthoredBody = authoredBody != null && authoredBody.trim().length > 0;
  if (!hasAuthoredBody && origin.columnNames.length === 0) {
    return {
      ok: false,
      reason: 'origin_columns_unavailable',
      message: `DBT model origin "${origin.nodeName}" does not expose canonical columns.`,
    };
  }
  const projectionRejection = hasAuthoredBody
    ? null
    : validateDbtModelProjectionColumns(metadata.projectionColumns, origin.columnNames);
  if (projectionRejection != null) {
    return {
      ok: false,
      reason: 'projection_columns_invalid',
      message: `DBT model "${args.modelNode.name}" has an invalid generated-column projection.`,
    };
  }
  const generatedColumnNames = resolveDbtModelProjectionColumns(
    metadata.projectionColumns,
    origin.columnNames
  )
    .filter((column) => column.output)
    .map((column) => column.name);
  const body = hasAuthoredBody
    ? authoredBody
    : buildGeneratedBody({ ...origin, columnNames: generatedColumnNames });
  const name = normalizeDbtArtifactIdentifier(args.modelNode.name, args.modelNode.id);
  const outputColumns = hasAuthoredBody
    ? buildCanvasNodePresentationTruth({
        node: args.modelNode,
        nodes: [args.modelNode],
        edges: [],
      }).columns.declared.map((column) => column.name)
    : generatedColumnNames;

  return {
    ok: true,
    artifact: {
      modelNodeId: args.modelNode.id,
      name,
      path: `models/${name}.sql`,
      language: 'sql',
      materialized: metadata.materialized,
      provenance: hasAuthoredBody ? 'authored' : 'generated',
      outputColumns,
      body,
      content: buildArtifactContent(metadata.materialized, body),
      origin: {
        nodeId: origin.nodeId,
        sql: origin.sql,
      },
      ...(origin.source == null ? {} : { source: origin.source }),
    },
  };
}

export function projectDbtModelArtifact(
  args: ProjectDbtModelArtifactArgs
): DbtModelArtifactProjectionResult {
  return projectDbtModelArtifactInternal(args, new Set());
}
