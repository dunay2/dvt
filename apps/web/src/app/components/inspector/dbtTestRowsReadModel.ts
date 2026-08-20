/** Owned concern: project dbt test metadata into Node Workbench table rows. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { projectDbtTestSemantics, type DbtTestSemanticsInput } from './dbtTestSemanticsPresenter';

type DbtTestTableRow = Readonly<{
  id: string;
  cells: Readonly<Record<string, string>>;
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

function normalizeTestType(type: string): string {
  return type
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function readDbtTestExpression(type: string, config: Record<string, unknown>): string | undefined {
  const values = readStringArray(config.values);
  if (values.length > 0) {
    return `values: ${values.join(', ')}`;
  }

  const directExpression = readFirstString(config.expression, config.sql, config.condition);
  if (directExpression != null) {
    return directExpression;
  }

  if (normalizeTestType(type) !== 'relationships') {
    return undefined;
  }

  const argumentsRecord = asRecord(config.arguments);
  const relationTarget = readFirstString(
    argumentsRecord.to,
    argumentsRecord.target,
    argumentsRecord.targetModel,
    config.to,
    config.target,
    config.targetModel
  );
  const relationField = readFirstString(
    argumentsRecord.field,
    argumentsRecord.targetColumn,
    argumentsRecord.column,
    config.field,
    config.targetColumn,
    config.column
  );
  const relationshipExpression = [relationTarget, relationField].filter(Boolean).join('.');

  return relationshipExpression.length > 0 ? relationshipExpression : undefined;
}

function buildDbtTestSemanticsInput(
  type: string,
  config: Record<string, unknown>
): DbtTestSemanticsInput {
  return {
    type,
    severity: readString(config.severity),
    expression: readDbtTestExpression(type, config),
    selectedForExecution:
      readBoolean(config.selectedForExecution) ??
      readBoolean(config.executionSelected) ??
      readBoolean(config.selected),
    selectionState: readFirstString(config.selectionState, config.executionSelection),
    readinessImpact: readString(config.readinessImpact),
    lastRunStatus: readFirstString(config.lastRunStatus, config.runStatus, config.lastStatus),
    lastRunDurationMs:
      readNumber(config.lastRunDurationMs) ??
      readNumber(config.lastDurationMs) ??
      readNumber(config.durationMs),
  };
}

function readDbtTest(candidate: unknown): DbtTestSemanticsInput | null {
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
    return buildDbtTestSemanticsInput(directType, candidate);
  }

  for (const [testType, config] of Object.entries(candidate)) {
    const type = readString(testType);
    if (type == null) {
      continue;
    }

    return buildDbtTestSemanticsInput(type, asRecord(config));
  }

  return null;
}

function readConnectedDbtTest(testMetadata: Record<string, unknown>): DbtTestSemanticsInput {
  const explicitType = readFirstString(
    testMetadata.type,
    testMetadata.testType,
    testMetadata.test_name
  );
  if (explicitType != null) {
    return buildDbtTestSemanticsInput(explicitType, testMetadata);
  }

  for (const knownType of ['not_null', 'unique', 'accepted_values', 'relationships']) {
    if (Object.prototype.hasOwnProperty.call(testMetadata, knownType)) {
      return buildDbtTestSemanticsInput(knownType, asRecord(testMetadata[knownType]));
    }
  }

  return buildDbtTestSemanticsInput('', testMetadata);
}

function testSemanticCells(test: DbtTestSemanticsInput): Record<string, string> {
  return projectDbtTestSemantics(test);
}

function buildColumnTestRows(
  node: CanonicalNode,
  metadata: Record<string, unknown>
): readonly DbtTestTableRow[] {
  const columns = isRecord(metadata.columns) ? metadata.columns : {};

  return Object.entries(columns).flatMap(
    ([columnKey, columnCandidate]): readonly DbtTestTableRow[] => {
      const column = asRecord(columnCandidate);
      const columnName = readString(column.name) ?? columnKey;
      const tests = Array.isArray(column.tests)
        ? column.tests
        : Array.isArray(column.dataTests)
          ? column.dataTests
          : [];

      return tests.flatMap((testCandidate): readonly DbtTestTableRow[] => {
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
}

function buildMetadataTestRows(
  node: CanonicalNode,
  metadata: Record<string, unknown>
): readonly DbtTestTableRow[] {
  const tests = Array.isArray(metadata.tests) ? metadata.tests : [];

  return tests.flatMap((candidate): readonly DbtTestTableRow[] => {
    if (!isRecord(candidate)) {
      return [];
    }

    const name = readString(candidate.name);
    if (name == null) {
      return [];
    }

    const type = readFirstString(candidate.type, candidate.testType) ?? '';
    return [
      {
        id: name,
        cells: {
          name,
          type,
          target:
            readFirstString(candidate.target, candidate.targetModel, candidate.model) ?? node.name,
          column: readFirstString(candidate.targetColumn, candidate.column) ?? '',
          severity: readString(candidate.severity) ?? '',
          expression:
            readFirstString(candidate.expression, candidate.sql, candidate.condition) ?? '',
          ...testSemanticCells(
            buildDbtTestSemanticsInput(type, {
              ...candidate,
              expression: readFirstString(candidate.expression, candidate.sql, candidate.condition),
            })
          ),
        },
      },
    ];
  });
}

function buildConnectedTestRows({
  node,
  nodes,
  edges,
}: Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}>): readonly DbtTestTableRow[] {
  const nodeById = new Map(nodes.map((candidate) => [candidate.id, candidate]));

  return edges
    .filter((edge) => edge.sourceId === node.id)
    .flatMap((edge): readonly DbtTestTableRow[] => {
      const testNode = nodeById.get(edge.targetId);
      if (testNode == null || !testNode.kind.endsWith(':test')) {
        return [];
      }

      const testMetadata = asRecord(testNode.metadata);
      const canonicalMetadata = asRecord(testMetadata.dbtTest);
      const test =
        Object.keys(canonicalMetadata).length === 0
          ? readConnectedDbtTest(testMetadata)
          : buildDbtTestSemanticsInput(readString(canonicalMetadata.testType) ?? '', {
              ...testMetadata,
              ...canonicalMetadata,
            });
      const targetColumn = readFirstString(
        canonicalMetadata.targetColumn,
        testMetadata.testTargetColumn,
        testMetadata.targetColumn,
        testMetadata.column
      );
      const targetModelReference = readFirstString(
        canonicalMetadata.targetModelId,
        testMetadata.testTargetModel,
        testMetadata.targetModel,
        testMetadata.model
      );
      const targetModel =
        nodes.find((candidate) => candidate.id === targetModelReference)?.name ??
        targetModelReference ??
        node.name;
      const target =
        (Object.keys(canonicalMetadata).length === 0
          ? readFirstString(testMetadata.testTarget, testMetadata.target)
          : undefined) ?? [targetModel, targetColumn].filter(Boolean).join('.');
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
}

function buildFallbackTestNodeRows(
  node: CanonicalNode,
  metadata: Record<string, unknown>,
  nodes: readonly CanonicalNode[]
): readonly DbtTestTableRow[] {
  const canonicalTestLastRunStatus = node.kind.endsWith(':test') ? node.status : undefined;
  const canonicalTestLastRunDurationMs =
    node.kind.endsWith(':test') && node.lastDuration != null ? node.lastDuration * 1000 : undefined;
  const canonicalMetadata = asRecord(metadata.dbtTest);
  const targetModelReference = readFirstString(
    canonicalMetadata.targetModelId,
    metadata.testTargetModel,
    metadata.targetModel
  );
  const targetModel =
    nodes.find((candidate) => candidate.id === targetModelReference)?.name ?? targetModelReference;
  const targetColumn = readFirstString(
    canonicalMetadata.targetColumn,
    metadata.testTargetColumn,
    metadata.targetColumn
  );
  const target =
    Object.keys(canonicalMetadata).length === 0 ? readString(metadata.testTarget) : undefined;
  const severity = readFirstString(canonicalMetadata.severity, metadata.severity);
  const testType = readFirstString(canonicalMetadata.testType, metadata.testType, metadata.type);

  if (
    !node.kind.endsWith(':test') &&
    targetModel == null &&
    targetColumn == null &&
    target == null &&
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
        target: target ?? [targetModel, targetColumn].filter(Boolean).join('.'),
        column: targetColumn ?? '',
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

export function buildDbtTestRows({
  node,
  metadata,
  nodes,
  edges,
}: Readonly<{
  node: CanonicalNode;
  metadata: Record<string, unknown>;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}>): readonly DbtTestTableRow[] {
  const projectedRows = [
    ...buildMetadataTestRows(node, metadata),
    ...buildColumnTestRows(node, metadata),
    ...buildConnectedTestRows({ node, nodes, edges }),
  ];

  return projectedRows.length > 0
    ? projectedRows
    : buildFallbackTestNodeRows(node, metadata, nodes);
}
