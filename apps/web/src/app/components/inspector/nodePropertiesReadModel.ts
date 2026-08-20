/** Owned concern: project canonical node metadata into a passive table-like Inspector read model. */
import { ConnectedSourceRefSchema, type ConnectionRef } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasNodePresentationCopy } from '../canvas/canvasNodePresentationCopy.contract';
import type {
  CanvasNodeCodeLanguage,
  CanvasNodePresentationColumn,
  CanvasNodePresentationTruth,
} from '../canvas/canvasNodePresentationTruth.contract';
import { readSourceObjectMetricEvidence } from '../../services/workspace/sourceObjectMetricEvidence';
import {
  describeSourceObjectMetricEvidence,
  formatSourceObjectMetricByteDetail,
  formatSourceObjectMetricByteSize,
} from '../../services/workspace/sourceObjectMetricEvidencePresentation';
import { buildDbtTestRows } from './dbtTestRowsReadModel';
import { buildCanvasNodePresentationTruth } from '../canvas/canvasNodePresentationTruth';
import { resolveInheritedDvtConnectionRef } from '../../views/canvas/canvasDvtAuthoringModel';

export type NodePropertySectionId =
  | 'general'
  | 'columns'
  | 'inputs-outputs'
  | 'tests'
  | 'keys'
  | 'indexes'
  | 'foreign-keys'
  | 'constraints'
  | 'comments'
  | 'sink'
  | 'code'
  | 'summary';

export type NodePropertyRow = Readonly<{
  id: NodePropertyRowId;
  label: string;
  value: string;
  detail?: string;
  tone?: 'measured' | 'estimated';
}>;

export const NODE_PROPERTY_ROW_ID = Object.freeze({
  name: 'name',
  nodeId: 'node-id',
  kind: 'kind',
  role: 'role',
  status: 'status',
  plugin: 'plugin',
  package: 'package',
  materialization: 'materialization',
  connection: 'connection',
  database: 'database',
  schema: 'schema',
  table: 'table',
  source: 'source',
  path: 'path',
  owner: 'owner',
  rows: 'rows',
  size: 'size',
  duration: 'duration',
  cost: 'cost',
  destination: 'destination',
  writeMode: 'write-mode',
  partitionStrategy: 'partition-strategy',
  description: 'description',
  comment: 'comment',
  upstreamNodes: 'upstream-nodes',
  downstreamNodes: 'downstream-nodes',
  tags: 'tags',
} as const);

export type NodePropertyRowId = (typeof NODE_PROPERTY_ROW_ID)[keyof typeof NODE_PROPERTY_ROW_ID];

export type NodePropertyTableRow = Readonly<{
  id: string;
  cells: Readonly<Record<string, string>>;
}>;

export type NodePropertySection = Readonly<{
  id: NodePropertySectionId;
  label: string;
  rows: readonly NodePropertyRow[];
  tableRows: readonly NodePropertyTableRow[];
  emptyState?: string;
  description?: string;
  code?: string;
  codeLanguage?: CanvasNodeCodeLanguage;
  codePath?: string;
  columnLabels?: Readonly<Record<string, string>>;
}>;

export type NodePropertiesReadModel = Readonly<{
  nodeId: string;
  nodeName: string;
  sections: readonly NodePropertySection[];
}>;

type BuildNodePropertiesReadModelArgs = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  presentationCopy?: CanvasNodePresentationCopy;
  presentationTruth?: CanvasNodePresentationTruth;
}>;

type InspectorColumn = Readonly<{
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  defaultValue?: string;
  comment?: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((candidate): readonly string[] => {
    const text = readString(candidate);
    return text == null ? [] : [text];
  });
}

function readFirstString(...values: readonly unknown[]): string | undefined {
  for (const value of values) {
    const text = readString(value);
    if (text != null) {
      return text;
    }
  }

  return undefined;
}

function formatWords(value: string): string {
  const words = value.replace(/[_-]+/g, ' ').trim();
  return words.length > 0 ? words.charAt(0).toUpperCase() + words.slice(1) : value;
}

function addRow(
  rows: NodePropertyRow[],
  id: NodePropertyRowId,
  label: string,
  value: string | undefined | null
): void {
  if (value != null && value.trim().length > 0) {
    rows.push({ id, label, value });
  }
}

function readColumns(value: unknown): readonly InspectorColumn[] {
  const readColumn = (candidate: unknown, fallbackName?: string): readonly InspectorColumn[] => {
    if (!isRecord(candidate)) {
      return [];
    }

    const name = readString(candidate.name) ?? fallbackName;
    if (name == null) {
      return [];
    }

    return [
      {
        name,
        type: readFirstString(candidate.type, candidate.dataType, candidate.data_type) ?? 'unknown',
        nullable: readBoolean(candidate.nullable),
        primaryKey: readBoolean(candidate.primaryKey) ?? readBoolean(candidate.isPrimaryKey),
        defaultValue: readFirstString(candidate.default, candidate.defaultValue),
        comment: readFirstString(candidate.description, candidate.comment),
      },
    ];
  };

  if (Array.isArray(value)) {
    return value.flatMap((candidate): readonly InspectorColumn[] => readColumn(candidate));
  }

  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, candidate]): readonly InspectorColumn[] =>
      readColumn(candidate, key)
    );
  }

  return [];
}

function buildGeneralRows(
  node: CanonicalNode,
  metadata: Record<string, unknown>,
  locale = 'en-US'
): NodePropertyRow[] {
  const config = asRecord(metadata.config);
  const dbt = asRecord(metadata.dbt);
  const rows: NodePropertyRow[] = [];
  const numberFormatter = new Intl.NumberFormat(locale);

  addRow(rows, NODE_PROPERTY_ROW_ID.name, 'Name', node.name);
  addRow(rows, NODE_PROPERTY_ROW_ID.nodeId, 'Node ID', node.id);
  addRow(rows, NODE_PROPERTY_ROW_ID.kind, 'Kind', node.kind);
  addRow(rows, NODE_PROPERTY_ROW_ID.role, 'Role', formatWords(node.role));
  addRow(rows, NODE_PROPERTY_ROW_ID.status, 'Status', formatWords(node.status));
  addRow(rows, NODE_PROPERTY_ROW_ID.plugin, 'Plugin', node.pluginId);
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.package,
    'Package',
    readFirstString(dbt.packageName, metadata.packageName, metadata.package)
  );
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.materialization,
    'Materialization',
    readFirstString(
      config.materialization,
      config.materialized,
      dbt.materialized,
      metadata.materialization,
      metadata.materialized
    )
  );
  const connectedSourceRef = ConnectedSourceRefSchema.safeParse(metadata.connectedSourceRef);
  if (connectedSourceRef.success) {
    addRow(
      rows,
      NODE_PROPERTY_ROW_ID.connection,
      'Connection',
      [
        readString(metadata.connectionName),
        connectedSourceRef.data.connectionRef.provider,
        connectedSourceRef.data.connectionRef.connectionId,
      ]
        .filter((value): value is string => value != null)
        .join(' · ')
    );
  }
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.database,
    'Database',
    readFirstString(config.database, metadata.database, dbt.databaseName)
  );
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.schema,
    'Schema',
    readFirstString(config.schema, metadata.schema, dbt.schemaName)
  );
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.table,
    'Table',
    readFirstString(config.table, metadata.tableName, dbt.tableName)
  );
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.source,
    'Source',
    readFirstString(config.alias, metadata.sourceName, dbt.sourceName)
  );
  addRow(rows, NODE_PROPERTY_ROW_ID.path, 'Path', node.path ?? readString(metadata.path));
  addRow(rows, NODE_PROPERTY_ROW_ID.owner, 'Owner', readString(metadata.owner));

  const sourceMetricEvidence = readSourceObjectMetricEvidence(metadata.sourceMetricEvidence);
  const rowCount =
    sourceMetricEvidence?.rowCount.value ??
    readNumber(metadata.rowCount) ??
    readNumber(metadata.rows);
  if (rowCount != null) {
    const value = numberFormatter.format(rowCount);
    rows.push(
      sourceMetricEvidence === null
        ? { id: NODE_PROPERTY_ROW_ID.rows, label: 'Rows', value }
        : {
            id: NODE_PROPERTY_ROW_ID.rows,
            label: 'Rows',
            value,
            tone: sourceMetricEvidence.rowCount.provenance,
            detail: describeSourceObjectMetricEvidence({
              metric: sourceMetricEvidence.rowCount,
              subject: `${value} ${rowCount === 1 ? 'record' : 'records'}`,
              evidence: sourceMetricEvidence,
            }),
          }
    );
  }

  if (sourceMetricEvidence !== null) {
    const byteSize = sourceMetricEvidence.byteSize.value;
    const compactSize = formatSourceObjectMetricByteSize(byteSize);
    rows.push({
      id: NODE_PROPERTY_ROW_ID.size,
      label: 'Size',
      value:
        sourceMetricEvidence.byteSize.provenance === 'estimated'
          ? `Estimated ${compactSize}`
          : compactSize,
      tone: sourceMetricEvidence.byteSize.provenance,
      detail: describeSourceObjectMetricEvidence({
        metric: sourceMetricEvidence.byteSize,
        subject: formatSourceObjectMetricByteDetail(byteSize, numberFormatter),
        evidence: sourceMetricEvidence,
        basis: sourceMetricEvidence.byteSize.basis,
      }),
    });
  } else {
    const byteSize = readNumber(metadata.byteSize) ?? readNumber(metadata.bytes);
    const estimatedByteSize = readNumber(metadata.estimatedByteSize);
    addRow(
      rows,
      NODE_PROPERTY_ROW_ID.size,
      'Size',
      readFirstString(metadata.size, metadata.sizeLabel) ??
        (byteSize == null
          ? estimatedByteSize == null
            ? undefined
            : `Estimated ${formatSourceObjectMetricByteSize(estimatedByteSize)}`
          : formatSourceObjectMetricByteSize(byteSize))
    );
  }

  if (node.lastDuration != null) {
    addRow(rows, NODE_PROPERTY_ROW_ID.duration, 'Duration', `${node.lastDuration}s`);
  }
  if (node.lastCost != null) {
    addRow(rows, NODE_PROPERTY_ROW_ID.cost, 'Cost', `$${node.lastCost.toFixed(2)}`);
  }

  return rows;
}

function buildSinkRows(node: CanonicalNode, metadata: Record<string, unknown>): NodePropertyRow[] {
  if (node.kind !== 'dvt:sink') {
    return [];
  }

  const config = asRecord(metadata.config);
  const database = readFirstString(config.database, metadata.database);
  const schema = readFirstString(config.schema, metadata.schema);
  const table = readFirstString(config.table, metadata.tableName);
  const rows: NodePropertyRow[] = [];

  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.destination,
    'Destination',
    [database, schema, table]
      .flatMap((part): readonly string[] => {
        const value = readString(part);
        return value == null ? [] : [value];
      })
      .join('.')
  );
  addRow(rows, NODE_PROPERTY_ROW_ID.database, 'Database', database);
  addRow(rows, NODE_PROPERTY_ROW_ID.schema, 'Schema', schema);
  addRow(rows, NODE_PROPERTY_ROW_ID.table, 'Table', table);
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.materialization,
    'Materialization',
    readFirstString(config.materialization, config.materialized, metadata.materialization)
  );
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.writeMode,
    'Write mode',
    readFirstString(config.writeMode, metadata.writeMode)
  );
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.partitionStrategy,
    'Partition strategy',
    readFirstString(config.partitionStrategy, metadata.partitionStrategy)
  );

  return rows;
}

function buildColumnRows(columns: readonly InspectorColumn[]): readonly NodePropertyTableRow[] {
  return columns.map((column) => ({
    id: column.name,
    cells: {
      name: column.name,
      type: column.type,
      nullable: column.nullable === false ? 'not null' : column.nullable === true ? 'nullable' : '',
      key: column.primaryKey ? 'PK' : '',
      default: column.defaultValue ?? '',
      comment: column.comment ?? '',
    },
  }));
}

function buildInheritedColumnRows(
  columns: readonly CanvasNodePresentationColumn[]
): readonly NodePropertyTableRow[] {
  return columns.map((column) => ({
    id: column.reference ?? `${column.sourceNodeId ?? 'input'}.${column.name}`,
    cells: {
      name: column.name,
      type: column.type,
      nullable: column.nullable === false ? 'not null' : column.nullable === true ? 'nullable' : '',
      source: column.sourceNodeName ?? column.sourceNodeId ?? '',
      reference: column.reference ?? '',
      selection: column.selected ? 'selected' : 'available',
    },
  }));
}

function interpolatePresentationTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (resolved, [key, value]) => resolved.replaceAll(`{${key}}`, value),
    template
  );
}

function localizePresentationValue(
  value: string,
  presentationCopy: CanvasNodePresentationCopy | undefined
): string {
  return presentationCopy?.valueLabels?.[value.trim().toLowerCase()] ?? value;
}

function localizePropertyRows(
  rows: readonly NodePropertyRow[],
  presentationCopy: CanvasNodePresentationCopy | undefined
): readonly NodePropertyRow[] {
  return rows.map((row) => ({
    ...row,
    label: presentationCopy?.rowLabels?.[row.id] ?? row.label,
    value: localizePresentationValue(row.value, presentationCopy),
  }));
}

function localizePropertyTableRows(
  rows: readonly NodePropertyTableRow[],
  presentationCopy: CanvasNodePresentationCopy | undefined
): readonly NodePropertyTableRow[] {
  return rows.map((row) => ({
    ...row,
    cells: Object.fromEntries(
      Object.entries(row.cells).map(([key, value]) => [
        key,
        localizePresentationValue(value, presentationCopy),
      ])
    ),
  }));
}

function buildKeyRows(
  metadata: Record<string, unknown>,
  columns: readonly InspectorColumn[]
): readonly NodePropertyTableRow[] {
  const rows: NodePropertyTableRow[] = [];
  const primaryKeyColumns = columns
    .filter((column) => column.primaryKey)
    .map((column) => column.name);

  if (primaryKeyColumns.length > 0) {
    rows.push({
      id: `pk:${primaryKeyColumns.join(',')}`,
      cells: {
        name: 'Primary key',
        columns: primaryKeyColumns.join(', '),
        type: 'primary',
      },
    });
  }

  const uniqueKeys = Array.isArray(metadata.uniqueKeys) ? metadata.uniqueKeys : [];
  for (const candidate of uniqueKeys) {
    if (!isRecord(candidate)) {
      continue;
    }

    const name = readString(candidate.name);
    const keyColumns = readStringArray(candidate.columns);
    if (name == null || keyColumns.length === 0) {
      continue;
    }

    rows.push({
      id: `unique:${name}`,
      cells: {
        name,
        columns: keyColumns.join(', '),
        type: 'unique',
      },
    });
  }

  return rows;
}

function buildIndexRows(metadata: Record<string, unknown>): readonly NodePropertyTableRow[] {
  const indexes = Array.isArray(metadata.indexes) ? metadata.indexes : [];
  return indexes.flatMap((candidate): readonly NodePropertyTableRow[] => {
    if (!isRecord(candidate)) {
      return [];
    }

    const name = readString(candidate.name);
    if (name == null) {
      return [];
    }

    return [
      {
        id: name,
        cells: {
          name,
          type: readString(candidate.type) ?? '',
          columns: readStringArray(candidate.columns).join(', '),
          unique: readBoolean(candidate.unique) ? 'yes' : 'no',
        },
      },
    ];
  });
}

function buildForeignKeyRows(metadata: Record<string, unknown>): readonly NodePropertyTableRow[] {
  const foreignKeys = Array.isArray(metadata.foreignKeys) ? metadata.foreignKeys : [];
  return foreignKeys.flatMap((candidate): readonly NodePropertyTableRow[] => {
    if (!isRecord(candidate)) {
      return [];
    }

    const name = readString(candidate.name);
    if (name == null) {
      return [];
    }

    return [
      {
        id: name,
        cells: {
          name,
          localColumns: readStringArray(candidate.localColumns).join(', '),
          referencedTable: readString(candidate.referencedTable) ?? '',
          referencedColumns: readStringArray(candidate.referencedColumns).join(', '),
        },
      },
    ];
  });
}

function buildConstraintRows(metadata: Record<string, unknown>): readonly NodePropertyTableRow[] {
  const constraints = Array.isArray(metadata.constraints) ? metadata.constraints : [];
  return constraints.flatMap((candidate): readonly NodePropertyTableRow[] => {
    if (!isRecord(candidate)) {
      return [];
    }

    const name = readString(candidate.name);
    if (name == null) {
      return [];
    }

    return [
      {
        id: name,
        cells: {
          name,
          type: readString(candidate.type) ?? 'check',
          expression: readString(candidate.expression) ?? readString(candidate.check) ?? '',
        },
      },
    ];
  });
}

function buildCommentRows(
  node: CanonicalNode,
  metadata: Record<string, unknown>
): NodePropertyRow[] {
  const rows: NodePropertyRow[] = [];
  addRow(rows, NODE_PROPERTY_ROW_ID.description, 'Description', node.description);
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.comment,
    'Comment',
    readFirstString(metadata.comment, metadata.comments)
  );
  return rows;
}

function buildSummaryRows(
  node: CanonicalNode,
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[]
): NodePropertyRow[] {
  const rows: NodePropertyRow[] = [];
  const nodeById = new Map(nodes.map((candidate) => [candidate.id, candidate]));
  const upstreamNodes = edges
    .filter((edge) => edge.targetId === node.id)
    .map((edge) => nodeById.get(edge.sourceId)?.name ?? edge.sourceId);
  const downstreamNodes = edges
    .filter((edge) => edge.sourceId === node.id)
    .map((edge) => nodeById.get(edge.targetId)?.name ?? edge.targetId);

  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.upstreamNodes,
    'Upstream nodes',
    upstreamNodes.length > 0 ? upstreamNodes.join(', ') : '0'
  );
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.downstreamNodes,
    'Downstream nodes',
    downstreamNodes.length > 0 ? downstreamNodes.join(', ') : '0'
  );
  addRow(
    rows,
    NODE_PROPERTY_ROW_ID.tags,
    'Tags',
    node.tags.length > 0 ? node.tags.join(', ') : '0'
  );
  return rows;
}

function buildInputsOutputsRows(
  node: CanonicalNode,
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[]
): readonly NodePropertyTableRow[] {
  const nodeById = new Map(nodes.map((candidate) => [candidate.id, candidate]));
  const rows: NodePropertyTableRow[] = [];
  const inheritedConnectionRef =
    node.pluginId === 'dvt' && node.kind === 'dvt:sql_transform'
      ? resolveInheritedDvtConnectionRef({ node, nodes, edges })
      : undefined;
  const inheritedConnection =
    inheritedConnectionRef == null
      ? undefined
      : `${inheritedConnectionRef.provider} · ${inheritedConnectionRef.connectionId}`;
  let inheritedConnectionProjected = false;

  for (const edge of edges) {
    if (edge.targetId === node.id) {
      const upstreamNode = nodeById.get(edge.sourceId);
      const upstreamConnectionRef =
        upstreamNode == null || inheritedConnectionRef == null
          ? undefined
          : resolveInheritedDvtConnectionRef({ node: upstreamNode, nodes, edges });
      const projectsInheritedConnection =
        !inheritedConnectionProjected &&
        inheritedConnectionRef != null &&
        upstreamConnectionRef != null &&
        sameConnectionRef(inheritedConnectionRef, upstreamConnectionRef);
      inheritedConnectionProjected ||= projectsInheritedConnection;
      rows.push({
        id: `input:${edge.id}`,
        cells: {
          direction: 'Input',
          node: upstreamNode?.name ?? edge.sourceId,
          nodeId: edge.sourceId,
          relation: edge.relation,
          ...(projectsInheritedConnection && inheritedConnection != null
            ? { connection: inheritedConnection }
            : {}),
        },
      });
    }

    if (edge.sourceId === node.id) {
      const downstreamNode = nodeById.get(edge.targetId);
      rows.push({
        id: `output:${edge.id}`,
        cells: {
          direction: 'Output',
          node: downstreamNode?.name ?? edge.targetId,
          nodeId: edge.targetId,
          relation: edge.relation,
        },
      });
    }
  }

  return rows;
}

function sameConnectionRef(left: ConnectionRef, right: ConnectionRef): boolean {
  return left.provider === right.provider && left.connectionId === right.connectionId;
}

function createSection({
  id,
  label,
  rows = [],
  tableRows = [],
  emptyState,
  description,
  code,
  codeLanguage,
  codePath,
  columnLabels,
}: Readonly<{
  id: NodePropertySectionId;
  label: string;
  rows?: readonly NodePropertyRow[];
  tableRows?: readonly NodePropertyTableRow[];
  emptyState?: string;
  description?: string;
  code?: string;
  codeLanguage?: CanvasNodeCodeLanguage;
  codePath?: string;
  columnLabels?: Readonly<Record<string, string>>;
}>): NodePropertySection {
  return {
    id,
    label,
    rows,
    tableRows,
    ...(emptyState != null ? { emptyState } : {}),
    ...(description != null ? { description } : {}),
    ...(code != null ? { code } : {}),
    ...(codeLanguage != null ? { codeLanguage } : {}),
    ...(codePath != null ? { codePath } : {}),
    ...(columnLabels != null ? { columnLabels } : {}),
  };
}

export function buildNodePropertiesReadModel({
  node,
  nodes,
  edges,
  presentationCopy,
  presentationTruth: suppliedPresentationTruth,
}: BuildNodePropertiesReadModelArgs): NodePropertiesReadModel {
  const metadata = asRecord(node.metadata);
  const columns = readColumns(metadata.columns);
  const presentationTruth =
    suppliedPresentationTruth ?? buildCanvasNodePresentationTruth({ node, nodes, edges });
  const columnRows = localizePropertyTableRows(
    presentationTruth.columns.visibleProvenance === 'declared'
      ? buildColumnRows(columns)
      : presentationTruth.columns.visibleProvenance === 'mixed'
        ? buildInheritedColumnRows(presentationTruth.columns.visible)
        : buildInheritedColumnRows(presentationTruth.columns.inherited),
    presentationCopy
  );
  const keyRows = localizePropertyTableRows(buildKeyRows(metadata, columns), presentationCopy);
  const indexRows = localizePropertyTableRows(buildIndexRows(metadata), presentationCopy);
  const foreignKeyRows = localizePropertyTableRows(buildForeignKeyRows(metadata), presentationCopy);
  const constraintRows = localizePropertyTableRows(buildConstraintRows(metadata), presentationCopy);
  const inputsOutputsRows = localizePropertyTableRows(
    buildInputsOutputsRows(node, nodes, edges),
    presentationCopy
  );
  const testRows = localizePropertyTableRows(
    buildDbtTestRows({ node, metadata, nodes, edges }),
    presentationCopy
  );
  const sinkRows = localizePropertyRows(buildSinkRows(node, metadata), presentationCopy);
  const codeTruth =
    presentationTruth.code.kind === 'inline' || presentationTruth.code.kind === 'generated'
      ? presentationTruth.code
      : undefined;
  const columnsDescription =
    presentationCopy == null
      ? undefined
      : presentationTruth.columns.visibleProvenance === 'declared'
        ? interpolatePresentationTemplate(presentationCopy.declaredColumnsDetailTemplate, {
            count: String(presentationTruth.columns.visibleCount),
          })
        : presentationTruth.columns.visibleProvenance === 'inherited'
          ? interpolatePresentationTemplate(presentationCopy.inheritedColumnsDetailTemplate, {
              count: String(presentationTruth.columns.visibleCount),
            })
          : presentationTruth.columns.visibleProvenance === 'mixed'
            ? interpolatePresentationTemplate(presentationCopy.mixedColumnsDetailTemplate, {
                declared: String(presentationTruth.columns.declaredCount),
                available: String(
                  presentationTruth.columns.visibleCount - presentationTruth.columns.declaredCount
                ),
              })
            : presentationCopy.noColumnsDetail;
  const codeDescription =
    presentationCopy == null
      ? undefined
      : presentationTruth.code.kind === 'workspace-file'
        ? interpolatePresentationTemplate(presentationCopy.workspaceCodeDetailTemplate, {
            path: presentationTruth.code.path,
          })
        : presentationTruth.code.kind === 'generated'
          ? interpolatePresentationTemplate(presentationCopy.generatedCodeDetailTemplate, {
              path: presentationTruth.code.path,
            })
          : undefined;
  const sectionLabels = presentationCopy?.sectionLabels;
  const sectionEmptyStates = presentationCopy?.sectionEmptyStates;
  const columnLabels = presentationCopy?.columnLabels;

  return {
    nodeId: node.id,
    nodeName: node.name,
    sections: [
      createSection({
        id: 'general',
        label: sectionLabels?.general ?? 'General',
        rows: localizePropertyRows(
          buildGeneralRows(node, metadata, presentationCopy?.locale),
          presentationCopy
        ),
      }),
      createSection({
        id: 'columns',
        label: sectionLabels?.columns ?? presentationCopy?.columnsLabel ?? 'Columns',
        tableRows: columnRows,
        columnLabels,
        description: columnsDescription,
        emptyState:
          columnRows.length === 0
            ? (sectionEmptyStates?.columns ?? 'No columns are recorded for this node.')
            : undefined,
      }),
      createSection({
        id: 'inputs-outputs',
        label: sectionLabels?.['inputs-outputs'] ?? 'Inputs / Outputs',
        tableRows: inputsOutputsRows,
        columnLabels,
        emptyState:
          inputsOutputsRows.length === 0
            ? (sectionEmptyStates?.['inputs-outputs'] ??
              'No graph inputs or outputs are recorded for this node.')
            : undefined,
      }),
      createSection({
        id: 'tests',
        label: sectionLabels?.tests ?? 'Tests',
        tableRows: testRows,
        columnLabels,
        emptyState:
          testRows.length === 0
            ? (sectionEmptyStates?.tests ??
              'No dbt or data-quality tests are recorded for this node.')
            : undefined,
      }),
      createSection({
        id: 'keys',
        label: sectionLabels?.keys ?? 'Keys',
        tableRows: keyRows,
        columnLabels,
        emptyState:
          keyRows.length === 0
            ? (sectionEmptyStates?.keys ?? 'No keys are recorded for this node.')
            : undefined,
      }),
      createSection({
        id: 'indexes',
        label: sectionLabels?.indexes ?? 'Indexes',
        tableRows: indexRows,
        columnLabels,
        emptyState:
          indexRows.length === 0
            ? (sectionEmptyStates?.indexes ?? 'No indexes are recorded for this node.')
            : undefined,
      }),
      createSection({
        id: 'foreign-keys',
        label: sectionLabels?.['foreign-keys'] ?? 'Foreign Keys',
        tableRows: foreignKeyRows,
        columnLabels,
        emptyState:
          foreignKeyRows.length === 0
            ? (sectionEmptyStates?.['foreign-keys'] ??
              'No foreign keys are recorded for this node.')
            : undefined,
      }),
      createSection({
        id: 'constraints',
        label: sectionLabels?.constraints ?? 'Constraints',
        tableRows: constraintRows,
        columnLabels,
        emptyState:
          constraintRows.length === 0
            ? (sectionEmptyStates?.constraints ??
              'No table constraints are recorded for this node.')
            : undefined,
      }),
      createSection({
        id: 'comments',
        label: sectionLabels?.comments ?? 'Comments',
        rows: localizePropertyRows(buildCommentRows(node, metadata), presentationCopy),
        emptyState:
          node.description == null && readFirstString(metadata.comment, metadata.comments) == null
            ? (sectionEmptyStates?.comments ?? 'No comments are recorded for this node.')
            : undefined,
      }),
      ...(node.kind === 'dvt:sink'
        ? [
            createSection({
              id: 'sink',
              label: sectionLabels?.sink ?? 'Sink',
              rows: sinkRows,
              emptyState:
                sinkRows.length === 0
                  ? (sectionEmptyStates?.sink ??
                    'No sink target or write policy is recorded for this node.')
                  : undefined,
            }),
          ]
        : []),
      createSection({
        id: 'code',
        label: sectionLabels?.code ?? presentationCopy?.codeLabel ?? 'Code',
        code: codeTruth?.content,
        codeLanguage: codeTruth?.language,
        codePath: codeTruth?.path,
        description: codeDescription,
        emptyState:
          presentationTruth.code.kind === 'unavailable'
            ? (presentationCopy?.codeUnavailableMessage ??
              'No SQL or generated code is recorded for this node.')
            : undefined,
      }),
      createSection({
        id: 'summary',
        label: sectionLabels?.summary ?? 'Summary',
        rows: localizePropertyRows(buildSummaryRows(node, nodes, edges), presentationCopy),
      }),
    ],
  };
}
