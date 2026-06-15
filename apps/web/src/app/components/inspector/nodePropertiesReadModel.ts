/** Owned concern: project canonical node metadata into a passive table-like Inspector read model. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

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
  | 'code'
  | 'summary';

export type NodePropertyRow = Readonly<{
  label: string;
  value: string;
}>;

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
  code?: string;
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

function addRow(rows: NodePropertyRow[], label: string, value: string | undefined | null): void {
  if (value != null && value.trim().length > 0) {
    rows.push({ label, value });
  }
}

function readColumns(value: unknown): readonly InspectorColumn[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((candidate): readonly InspectorColumn[] => {
    if (!isRecord(candidate)) {
      return [];
    }

    const name = readString(candidate.name);
    if (name == null) {
      return [];
    }

    return [
      {
        name,
        type: readString(candidate.type) ?? 'unknown',
        nullable: readBoolean(candidate.nullable),
        primaryKey: readBoolean(candidate.primaryKey) ?? readBoolean(candidate.isPrimaryKey),
        defaultValue: readFirstString(candidate.default, candidate.defaultValue),
        comment: readFirstString(candidate.description, candidate.comment),
      },
    ];
  });
}

function buildGeneralRows(
  node: CanonicalNode,
  metadata: Record<string, unknown>
): NodePropertyRow[] {
  const config = asRecord(metadata.config);
  const dbt = asRecord(metadata.dbt);
  const rows: NodePropertyRow[] = [];

  addRow(rows, 'Name', node.name);
  addRow(rows, 'Node ID', node.id);
  addRow(rows, 'Kind', node.kind);
  addRow(rows, 'Role', formatWords(node.role));
  addRow(rows, 'Status', formatWords(node.status));
  addRow(rows, 'Plugin', node.pluginId);
  addRow(rows, 'Package', readFirstString(dbt.packageName, metadata.packageName, metadata.package));
  addRow(
    rows,
    'Materialization',
    readFirstString(
      config.materialization,
      config.materialized,
      dbt.materialized,
      metadata.materialization,
      metadata.materialized
    )
  );
  addRow(rows, 'Database', readFirstString(config.database, metadata.database, dbt.databaseName));
  addRow(rows, 'Schema', readFirstString(config.schema, metadata.schema, dbt.schemaName));
  addRow(rows, 'Table', readFirstString(config.table, metadata.tableName, dbt.tableName));
  addRow(rows, 'Source', readFirstString(config.alias, metadata.sourceName, dbt.sourceName));
  addRow(rows, 'Path', node.path ?? readString(metadata.path));
  addRow(rows, 'Owner', readString(metadata.owner));

  const rowCount = readNumber(metadata.rowCount) ?? readNumber(metadata.rows);
  if (rowCount != null) {
    addRow(rows, 'Rows', new Intl.NumberFormat('en-US').format(rowCount));
  }

  addRow(rows, 'Size', readFirstString(metadata.size, metadata.sizeLabel));

  if (node.lastDuration != null) {
    addRow(rows, 'Duration', `${node.lastDuration}s`);
  }
  if (node.lastCost != null) {
    addRow(rows, 'Cost', `$${node.lastCost.toFixed(2)}`);
  }

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
  addRow(rows, 'Description', node.description);
  addRow(rows, 'Comment', readFirstString(metadata.comment, metadata.comments));
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

  addRow(rows, 'Upstream nodes', upstreamNodes.length > 0 ? upstreamNodes.join(', ') : '0');
  addRow(rows, 'Downstream nodes', downstreamNodes.length > 0 ? downstreamNodes.join(', ') : '0');
  addRow(rows, 'Tags', node.tags.length > 0 ? node.tags.join(', ') : '0');
  return rows;
}

function buildInputsOutputsRows(
  node: CanonicalNode,
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[]
): readonly NodePropertyTableRow[] {
  const nodeById = new Map(nodes.map((candidate) => [candidate.id, candidate]));
  const rows: NodePropertyTableRow[] = [];

  for (const edge of edges) {
    if (edge.targetId === node.id) {
      const upstreamNode = nodeById.get(edge.sourceId);
      rows.push({
        id: `input:${edge.id}`,
        cells: {
          direction: 'Input',
          node: upstreamNode?.name ?? edge.sourceId,
          nodeId: edge.sourceId,
          relation: edge.relation,
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

function buildTestRows(
  node: CanonicalNode,
  metadata: Record<string, unknown>
): readonly NodePropertyTableRow[] {
  const tests = Array.isArray(metadata.tests) ? metadata.tests : [];
  const rows = tests.flatMap((candidate): readonly NodePropertyTableRow[] => {
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
          type: readFirstString(candidate.type, candidate.testType) ?? '',
          target:
            readFirstString(candidate.target, candidate.targetModel, candidate.model) ?? node.name,
          column: readFirstString(candidate.targetColumn, candidate.column) ?? '',
          severity: readString(candidate.severity) ?? '',
          expression:
            readFirstString(candidate.expression, candidate.sql, candidate.condition) ?? '',
        },
      },
    ];
  });

  if (rows.length > 0) {
    return rows;
  }

  const testTargetModel = readFirstString(metadata.testTargetModel, metadata.targetModel);
  const testTargetColumn = readFirstString(metadata.testTargetColumn, metadata.targetColumn);
  const testTarget = readFirstString(metadata.testTarget);
  const severity = readString(metadata.severity);
  const testType = readFirstString(metadata.testType, metadata.type);

  if (
    !node.kind.endsWith(':test') &&
    testTargetModel == null &&
    testTargetColumn == null &&
    testTarget == null &&
    severity == null &&
    testType == null
  ) {
    return [];
  }

  return [
    {
      id: `test:${node.id}`,
      cells: {
        name: node.name,
        type: testType ?? '',
        target: testTarget ?? [testTargetModel, testTargetColumn].filter(Boolean).join('.'),
        column: testTargetColumn ?? '',
        severity: severity ?? '',
      },
    },
  ];
}

function createSection({
  id,
  label,
  rows = [],
  tableRows = [],
  emptyState,
  code,
}: Readonly<{
  id: NodePropertySectionId;
  label: string;
  rows?: readonly NodePropertyRow[];
  tableRows?: readonly NodePropertyTableRow[];
  emptyState?: string;
  code?: string;
}>): NodePropertySection {
  return {
    id,
    label,
    rows,
    tableRows,
    ...(emptyState != null ? { emptyState } : {}),
    ...(code != null ? { code } : {}),
  };
}

export function buildNodePropertiesReadModel({
  node,
  nodes,
  edges,
}: BuildNodePropertiesReadModelArgs): NodePropertiesReadModel {
  const metadata = asRecord(node.metadata);
  const config = asRecord(metadata.config);
  const columns = readColumns(metadata.columns);
  const keyRows = buildKeyRows(metadata, columns);
  const indexRows = buildIndexRows(metadata);
  const foreignKeyRows = buildForeignKeyRows(metadata);
  const constraintRows = buildConstraintRows(metadata);
  const inputsOutputsRows = buildInputsOutputsRows(node, nodes, edges);
  const testRows = buildTestRows(node, metadata);
  const code =
    readString(metadata.compiledSql) ?? readString(metadata.sql) ?? readString(config.sql);

  return {
    nodeId: node.id,
    nodeName: node.name,
    sections: [
      createSection({
        id: 'general',
        label: 'General',
        rows: buildGeneralRows(node, metadata),
      }),
      createSection({
        id: 'columns',
        label: 'Columns',
        tableRows: buildColumnRows(columns),
        emptyState: columns.length === 0 ? 'No columns are recorded for this node.' : undefined,
      }),
      createSection({
        id: 'inputs-outputs',
        label: 'Inputs / Outputs',
        tableRows: inputsOutputsRows,
        emptyState:
          inputsOutputsRows.length === 0
            ? 'No graph inputs or outputs are recorded for this node.'
            : undefined,
      }),
      createSection({
        id: 'tests',
        label: 'Tests',
        tableRows: testRows,
        emptyState:
          testRows.length === 0
            ? 'No dbt or data-quality tests are recorded for this node.'
            : undefined,
      }),
      createSection({
        id: 'keys',
        label: 'Keys',
        tableRows: keyRows,
        emptyState: keyRows.length === 0 ? 'No keys are recorded for this node.' : undefined,
      }),
      createSection({
        id: 'indexes',
        label: 'Indexes',
        tableRows: indexRows,
        emptyState: indexRows.length === 0 ? 'No indexes are recorded for this node.' : undefined,
      }),
      createSection({
        id: 'foreign-keys',
        label: 'Foreign Keys',
        tableRows: foreignKeyRows,
        emptyState:
          foreignKeyRows.length === 0 ? 'No foreign keys are recorded for this node.' : undefined,
      }),
      createSection({
        id: 'constraints',
        label: 'Constraints',
        tableRows: constraintRows,
        emptyState:
          constraintRows.length === 0
            ? 'No table constraints are recorded for this node.'
            : undefined,
      }),
      createSection({
        id: 'comments',
        label: 'Comments',
        rows: buildCommentRows(node, metadata),
        emptyState:
          node.description == null && readFirstString(metadata.comment, metadata.comments) == null
            ? 'No comments are recorded for this node.'
            : undefined,
      }),
      createSection({
        id: 'code',
        label: 'Code',
        code,
        emptyState:
          code == null ? 'No SQL or generated code is recorded for this node.' : undefined,
      }),
      createSection({
        id: 'summary',
        label: 'Summary',
        rows: buildSummaryRows(node, nodes, edges),
      }),
    ],
  };
}
