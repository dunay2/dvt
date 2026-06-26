/** Owned concern: project canonical node metadata into a passive table-like Inspector read model. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { projectDbtTestSemantics, type DbtTestSemanticsInput } from './dbtTestSemanticsPresenter';
import { buildTransformColumnOptions, readSelectedColumnRefs } from './dvtTransformColumnModel';

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
  metadata: Record<string, unknown>
): NodePropertyRow[] {
  const formatBytes = (value: number): string => {
    if (Math.abs(value) >= 1024 * 1024 * 1024) {
      return `${(value / (1024 * 1024 * 1024)).toFixed(1).replace(/\.0$/, '')} GB`;
    }
    if (Math.abs(value) >= 1024 * 1024) {
      return `${(value / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
    }
    if (Math.abs(value) >= 1024) {
      return `${(value / 1024).toFixed(1).replace(/\.0$/, '')} KB`;
    }
    return `${value} B`;
  };
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

  const byteSize = readNumber(metadata.byteSize) ?? readNumber(metadata.bytes);
  addRow(
    rows,
    'Size',
    readFirstString(metadata.size, metadata.sizeLabel) ??
      (byteSize == null ? undefined : formatBytes(byteSize))
  );

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

function buildTransformInputColumnRows({
  node,
  nodes,
  edges,
}: Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}>): readonly NodePropertyTableRow[] {
  if (node.role !== 'transform') {
    return [];
  }

  return buildTransformColumnOptions({
    node,
    nodes,
    edges,
    selectedColumnRefs: readSelectedColumnRefs(node.metadata),
  }).map((option) => ({
    id: option.columnRef,
    cells: {
      name: option.columnName,
      type: option.dataType,
      nullable: option.nullable === false ? 'not null' : option.nullable === true ? 'nullable' : '',
      source: option.sourceNodeName,
      reference: option.columnRef,
      selection: option.selected ? 'selected' : 'available',
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
  metadata: Record<string, unknown>,
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[]
): readonly NodePropertyTableRow[] {
  const canonicalTestLastRunStatus = node.kind.endsWith(':test') ? node.status : undefined;
  const canonicalTestLastRunDurationMs =
    node.kind.endsWith(':test') && node.lastDuration != null ? node.lastDuration * 1000 : undefined;
  const readDbtTest = (
    candidate: unknown
  ): Readonly<{
    type: string;
    severity?: string;
    expression?: string;
    selectedForExecution?: boolean;
    selectionState?: string;
    readinessImpact?: string;
    lastRunStatus?: string;
    lastRunDurationMs?: number;
  }> | null => {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return { type: candidate.trim() };
    }

    if (!isRecord(candidate)) {
      return null;
    }

    const directType = readFirstString(
      candidate.type,
      candidate.testType,
      candidate.test_name,
      candidate.name
    );
    if (directType != null) {
      return {
        type: directType,
        severity: readString(candidate.severity),
        expression: readFirstString(candidate.expression, candidate.sql, candidate.condition),
        selectedForExecution:
          readBoolean(candidate.selectedForExecution) ??
          readBoolean(candidate.executionSelected) ??
          readBoolean(candidate.selected),
        selectionState: readFirstString(candidate.selectionState, candidate.executionSelection),
        readinessImpact: readString(candidate.readinessImpact),
        lastRunStatus: readFirstString(
          candidate.lastRunStatus,
          candidate.runStatus,
          candidate.lastStatus
        ),
        lastRunDurationMs:
          readNumber(candidate.lastRunDurationMs) ??
          readNumber(candidate.lastDurationMs) ??
          readNumber(candidate.durationMs),
      };
    }

    for (const [testType, config] of Object.entries(candidate)) {
      const type = readString(testType);
      if (type == null) {
        continue;
      }

      const configRecord = asRecord(config);
      const values = readStringArray(configRecord.values);
      return {
        type,
        severity: readString(configRecord.severity),
        expression:
          values.length > 0
            ? `values: ${values.join(', ')}`
            : readFirstString(configRecord.expression, configRecord.sql, configRecord.condition),
        selectedForExecution:
          readBoolean(configRecord.selectedForExecution) ??
          readBoolean(configRecord.executionSelected) ??
          readBoolean(configRecord.selected),
        selectionState: readFirstString(
          configRecord.selectionState,
          configRecord.executionSelection
        ),
        readinessImpact: readString(configRecord.readinessImpact),
        lastRunStatus: readFirstString(
          configRecord.lastRunStatus,
          configRecord.runStatus,
          configRecord.lastStatus
        ),
        lastRunDurationMs:
          readNumber(configRecord.lastRunDurationMs) ??
          readNumber(configRecord.lastDurationMs) ??
          readNumber(configRecord.durationMs),
      };
    }

    return null;
  };
  const testSemanticCells = (test: DbtTestSemanticsInput): Record<string, string> =>
    projectDbtTestSemantics(test);
  const columnTestRows = (): readonly NodePropertyTableRow[] => {
    const columns = isRecord(metadata.columns) ? metadata.columns : {};

    return Object.entries(columns).flatMap(
      ([columnKey, columnCandidate]): readonly NodePropertyTableRow[] => {
        const column = asRecord(columnCandidate);
        const columnName = readString(column.name) ?? columnKey;
        const tests = Array.isArray(column.tests)
          ? column.tests
          : Array.isArray(column.dataTests)
            ? column.dataTests
            : [];

        return tests.flatMap((testCandidate): readonly NodePropertyTableRow[] => {
          const test = readDbtTest(testCandidate);
          if (test == null) {
            return [];
          }

          return [
            {
              id: `test:${node.id}:${columnName}:${test.type}`,
              cells: {
                name: `${test.type}(${columnName})`,
                type: test.type,
                target: `${node.name}.${columnName}`,
                column: columnName,
                severity: test.severity ?? '',
                expression: test.expression ?? '',
                ...testSemanticCells(test),
              },
            },
          ];
        });
      }
    );
  };
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
          ...testSemanticCells({
            type: readFirstString(candidate.type, candidate.testType) ?? '',
            severity: readString(candidate.severity),
            expression: readFirstString(candidate.expression, candidate.sql, candidate.condition),
            selectedForExecution:
              readBoolean(candidate.selectedForExecution) ??
              readBoolean(candidate.executionSelected) ??
              readBoolean(candidate.selected),
            selectionState: readFirstString(candidate.selectionState, candidate.executionSelection),
            readinessImpact: readString(candidate.readinessImpact),
            lastRunStatus: readFirstString(
              candidate.lastRunStatus,
              candidate.runStatus,
              candidate.lastStatus
            ),
            lastRunDurationMs:
              readNumber(candidate.lastRunDurationMs) ??
              readNumber(candidate.lastDurationMs) ??
              readNumber(candidate.durationMs),
          }),
        },
      },
    ];
  });
  const connectedTestRows = (): readonly NodePropertyTableRow[] => {
    const nodeById = new Map(nodes.map((candidate) => [candidate.id, candidate]));

    return edges
      .filter((edge) => edge.sourceId === node.id)
      .flatMap((edge): readonly NodePropertyTableRow[] => {
        const testNode = nodeById.get(edge.targetId);
        if (testNode == null || !testNode.kind.endsWith(':test')) {
          return [];
        }

        const testMetadata = asRecord(testNode.metadata);
        const test = readDbtTest(testMetadata);
        if (test == null) {
          return [];
        }

        const targetColumn = readFirstString(
          testMetadata.testTargetColumn,
          testMetadata.targetColumn,
          testMetadata.column
        );
        const targetModel =
          readFirstString(
            testMetadata.testTargetModel,
            testMetadata.targetModel,
            testMetadata.model
          ) ?? node.name;
        const target =
          readFirstString(testMetadata.testTarget, testMetadata.target) ??
          [targetModel, targetColumn].filter(Boolean).join('.');
        const lastRunDurationMs =
          test.lastRunDurationMs ??
          (testNode.lastDuration == null ? undefined : testNode.lastDuration * 1000);

        return [
          {
            id: `test:${testNode.id}`,
            cells: {
              name: testNode.name,
              type: test.type,
              target,
              column: targetColumn ?? '',
              severity: test.severity ?? '',
              expression: test.expression ?? '',
              ...testSemanticCells({
                ...test,
                lastRunStatus: test.lastRunStatus ?? testNode.status,
                lastRunDurationMs,
              }),
            },
          },
        ];
      });
  };
  const projectedRows = [...rows, ...columnTestRows(), ...connectedTestRows()];

  if (projectedRows.length > 0) {
    return projectedRows;
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
        ...testSemanticCells({
          type: testType ?? '',
          severity,
          selectedForExecution:
            readBoolean(metadata.selectedForExecution) ??
            readBoolean(metadata.executionSelected) ??
            readBoolean(metadata.selected),
          selectionState: readFirstString(metadata.selectionState, metadata.executionSelection),
          readinessImpact: readString(metadata.readinessImpact),
          lastRunStatus: readFirstString(
            metadata.lastRunStatus,
            metadata.runStatus,
            canonicalTestLastRunStatus
          ),
          lastRunDurationMs:
            readNumber(metadata.lastRunDurationMs) ??
            readNumber(metadata.lastDurationMs) ??
            readNumber(metadata.durationMs) ??
            canonicalTestLastRunDurationMs,
        }),
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
  const columnRows =
    columns.length > 0
      ? buildColumnRows(columns)
      : buildTransformInputColumnRows({ node, nodes, edges });
  const keyRows = buildKeyRows(metadata, columns);
  const indexRows = buildIndexRows(metadata);
  const foreignKeyRows = buildForeignKeyRows(metadata);
  const constraintRows = buildConstraintRows(metadata);
  const inputsOutputsRows = buildInputsOutputsRows(node, nodes, edges);
  const testRows = buildTestRows(node, metadata, nodes, edges);
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
        tableRows: columnRows,
        emptyState: columnRows.length === 0 ? 'No columns are recorded for this node.' : undefined,
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
