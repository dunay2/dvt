import type { CanonicalEdge, CanonicalNode } from '../types/canonical';
import {
  appendDvtSubstraitInnerJoinInput,
  createDvtSubstraitStringInnerJoinDraft,
  decodeDvtSubstraitInnerJoinDocument,
  encodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitNInputJoinDraft,
  type DvtSubstraitJoinComparisonOperator,
  type DvtSubstraitJoinDataType,
  type DvtSubstraitJoinPredicateOperand,
  type DvtSubstraitJoinSource,
} from '../views/canvas/canvasDvtSubstraitJoinComposition';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from '../views/canvas/canvasDvtTransformAuthoringAuthority';
import clientFixture from './fixtures/client.json';
import orderDetailsFixture from './fixtures/order-details.json';
import ordersFixture from './fixtures/orders.json';
import { loadSemanticWorkbenchDataset } from './semanticWorkbenchDataset';

const SUBSTRAIT_TYPE_BY_DATASET_TYPE = {
  integer: 'i64',
  numeric: 'fp64',
  text: 'string',
  boolean: 'bool',
  timestamp: 'precisionTimestampTz',
} as const satisfies Record<
  ReturnType<typeof loadSemanticWorkbenchDataset>['columns'][number]['type'],
  DvtSubstraitJoinDataType
>;

const BASE_TRANSFORM: CanonicalNode = {
  id: 'lab-transform-orders-client',
  name: 'Orders + Client + Details',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: ['semantic-workbench'],
  metadata: {},
};

export function buildSemanticWorkbenchFixture(
  input: {
    orders?: unknown;
    client?: unknown;
    orderDetails?: unknown;
  } = {}
) {
  type Dataset = ReturnType<typeof loadSemanticWorkbenchDataset>;
  const orders = loadSemanticWorkbenchDataset(input.orders ?? ordersFixture);
  const clients = loadSemanticWorkbenchDataset(input.client ?? clientFixture);
  const orderDetails = loadSemanticWorkbenchDataset(input.orderDetails ?? orderDetailsFixture);
  const clientIds = new Set(clients.rows.map((row) => row.client_id));
  orders.rows.forEach((row) => {
    if (!clientIds.has(row.client_id)) {
      throw new Error(
        `orders.client_id references missing client.client_id value "${String(row.client_id)}".`
      );
    }
  });
  const orderIds = new Set(orders.rows.map((row) => row.order_id));
  orderDetails.rows.forEach((row) => {
    if (!orderIds.has(row.order_id)) {
      throw new Error(
        `order_details.order_id references missing orders.order_id value "${String(row.order_id)}".`
      );
    }
  });

  const buildSourceNode = (dataset: Dataset): CanonicalNode => {
    const logicalPayloadBytes = new TextEncoder().encode(JSON.stringify(dataset.rows)).byteLength;
    return {
      id: `lab-source-${dataset.tableName}`,
      name: dataset.displayName,
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: ['semantic-workbench', 'json-fixture'],
      metadata: {
        schema: dataset.schema,
        tableName: dataset.tableName,
        sampleRows: dataset.rows,
        sourceMetricEvidence: {
          observedAt: dataset.observedAt,
          observationScope: { kind: 'snapshot' },
          rowCount: {
            value: dataset.rows.length,
            provenance: 'measured',
            method: 'data-scan',
            confidence: 'exact',
          },
          byteSize: {
            value: logicalPayloadBytes,
            provenance: 'measured',
            method: 'data-scan',
            confidence: 'exact',
            basis: 'logical-payload',
          },
        },
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'semantic-workbench-local-json',
            provider: 'postgres',
          },
          sourceObjectId: `${dataset.schema}.${dataset.tableName}`,
        },
        columns: dataset.columns,
      },
    };
  };
  const buildJoinSource = (node: CanonicalNode, dataset: Dataset): DvtSubstraitJoinSource => ({
    nodeId: node.id,
    schema: dataset.schema,
    table: dataset.tableName,
    sourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'semantic-workbench-local-json',
        provider: 'postgres',
      },
      sourceObjectId: `${dataset.schema}.${dataset.tableName}`,
    },
  });

  const sources = [
    buildSourceNode(orders),
    buildSourceNode(clients),
    buildSourceNode(orderDetails),
  ] as const;
  const join = createDvtSubstraitStringInnerJoinDraft({
    left: {
      source: buildJoinSource(sources[0], orders),
      fields: orders.columns.map((column) => column.name),
      fieldTypes: orders.columns.map((column) => SUBSTRAIT_TYPE_BY_DATASET_TYPE[column.type]),
    },
    right: {
      source: buildJoinSource(sources[1], clients),
      fields: clients.columns.map((column) => column.name),
      fieldTypes: clients.columns.map((column) => SUBSTRAIT_TYPE_BY_DATASET_TYPE[column.type]),
    },
    leftFieldName: 'client_id',
    rightFieldName: 'client_id',
    targetNodeId: BASE_TRANSFORM.id,
  });
  const initialInspection = inspectDvtSubstraitNInputJoinDraft(join);
  if (!initialInspection.ok) throw new Error('Expected the admitted Orders and Client join.');
  const orderIdFieldId = initialInspection.projection.outputs.find(
    (output) => output.source.inputIndex === 0 && output.source.name === 'order_id'
  )?.source.fieldId;
  if (orderIdFieldId == null) throw new Error('Expected orders.order_id in the join outputs.');
  const joinedWithDetails = appendDvtSubstraitInnerJoinInput(join, {
    source: buildJoinSource(sources[2], orderDetails),
    fields: orderDetails.columns.map((column) => column.name),
    fieldTypes: orderDetails.columns.map((column) => SUBSTRAIT_TYPE_BY_DATASET_TYPE[column.type]),
    predicate: {
      leftSourceFieldId: orderIdFieldId,
      rightFieldName: 'order_id',
    },
    selectedFields: orderDetails.columns.map((column) => column.name),
  });
  if (joinedWithDetails === join)
    throw new Error('Expected Order Details to join through N-source.');
  const transform = applyDvtSubstraitSemanticDocument(
    BASE_TRANSFORM,
    encodeDvtSubstraitInnerJoinDocument(joinedWithDetails)
  );
  const datasets = [orders, clients, orderDetails] as const;
  const projectTransformSample = (currentTransform: CanonicalNode) => {
    try {
      const authority = readDvtTransformAuthoringAuthority(currentTransform);
      if (authority == null) return null;
      const inspection = inspectDvtSubstraitNInputJoinDraft(
        decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument)
      );
      if (!inspection.ok) return null;

      const datasetsBySourceObjectId = new Map<string, Dataset>(
        datasets.map((dataset) => [`${dataset.schema}.${dataset.tableName}`, dataset] as const)
      );
      const resolvedInputRows = inspection.projection.inputs.map(
        (input) => datasetsBySourceObjectId.get(input.sourceRef.sourceObjectId)?.rows
      );
      if (resolvedInputRows.some((rows) => rows == null) || resolvedInputRows[0] == null) {
        return null;
      }
      const inputRows = resolvedInputRows as readonly (typeof orders.rows)[];
      type DatasetRow = (typeof orders.rows)[number];
      type JoinedRow = Map<number, DatasetRow>;
      const fieldById = new Map(
        inspection.projection.inputs.flatMap((input, inputIndex) =>
          input.fields.map(
            (field) =>
              [
                field.fieldId,
                { inputIndex, fieldName: field.name, dataType: field.dataType },
              ] as const
          )
        )
      );
      let joinedRows: JoinedRow[] = inputRows[0]!.map(
        (row) => new Map<number, DatasetRow>([[0, row]])
      );

      for (const [predicateIndex, predicate] of inspection.projection.joins.entries()) {
        const rightInputIndex = predicateIndex + 1;
        const left = fieldById.get(predicate.leftSourceFieldId);
        const right = fieldById.get(predicate.rightSourceFieldId);
        const rightRows = inputRows[rightInputIndex];
        if (
          left == null ||
          right == null ||
          right.inputIndex !== rightInputIndex ||
          left.inputIndex >= rightInputIndex ||
          rightRows == null
        ) {
          return null;
        }
        joinedRows = joinedRows.flatMap((joined) =>
          rightRows.flatMap((rightRow) => {
            const candidate = new Map(joined).set(rightInputIndex, rightRow);
            const operandValue = (operand: DvtSubstraitJoinPredicateOperand) => {
              if (operand.kind === 'literal') return operand.literal;
              const field = fieldById.get(operand.sourceFieldId);
              if (field == null) return null;
              const value = candidate.get(field.inputIndex)?.[field.fieldName];
              return value === undefined ? null : { dataType: field.dataType, value };
            };
            const compareOperands = (
              leftOperand: DvtSubstraitJoinPredicateOperand,
              rightOperand: DvtSubstraitJoinPredicateOperand,
              operator: DvtSubstraitJoinComparisonOperator
            ) => {
              const leftValue = operandValue(leftOperand);
              const rightValue = operandValue(rightOperand);
              if (
                leftValue == null ||
                rightValue == null ||
                leftValue.dataType !== rightValue.dataType
              ) {
                return false;
              }
              const comparison = (() => {
                if (leftValue.dataType === 'i64') {
                  const left = BigInt(leftValue.value);
                  const right = BigInt(rightValue.value);
                  return left === right ? 0 : left < right ? -1 : 1;
                }
                if (leftValue.dataType === 'fp64') {
                  const left = Number(leftValue.value);
                  const right = Number(rightValue.value);
                  return left === right ? 0 : left < right ? -1 : 1;
                }
                if (leftValue.dataType === 'precisionTimestampTz') {
                  const left = Date.parse(String(leftValue.value));
                  const right = Date.parse(String(rightValue.value));
                  return left === right ? 0 : left < right ? -1 : 1;
                }
                if (leftValue.dataType === 'bool') {
                  return Number(leftValue.value) - Number(rightValue.value);
                }
                const left = String(leftValue.value);
                const right = String(rightValue.value);
                return left === right ? 0 : left < right ? -1 : 1;
              })();
              if (operator === 'equal') return comparison === 0;
              if (operator === 'not_equal') return comparison !== 0;
              if (operator === 'gt') return comparison > 0;
              if (operator === 'gte') return comparison >= 0;
              if (operator === 'lt') return comparison < 0;
              return comparison <= 0;
            };
            let matches = compareOperands(
              { kind: 'field', sourceFieldId: predicate.leftSourceFieldId },
              { kind: 'field', sourceFieldId: predicate.rightSourceFieldId },
              predicate.operator ?? 'equal'
            );
            for (const condition of predicate.additionalConditions ?? []) {
              const conditionMatches = compareOperands(
                condition.left,
                condition.right,
                condition.operator ?? 'equal'
              );
              matches =
                (condition.combination ?? 'and') === 'and'
                  ? matches && conditionMatches
                  : matches || conditionMatches;
            }
            return matches ? [candidate] : [];
          })
        );
      }

      return {
        columns: inspection.projection.outputs.map((output) => ({ name: output.name })),
        rows: joinedRows.map((joined) => ({
          values: inspection.projection.outputs.map((output) => {
            const value = joined.get(output.source.inputIndex)?.[output.source.name];
            return value == null ? null : String(value);
          }),
        })),
      };
    } catch {
      return null;
    }
  };
  const edges: readonly CanonicalEdge[] = sources.map((source) => ({
    id: `${source.id}-${transform.id}`,
    sourceId: source.id,
    targetId: transform.id,
    relation: 'lineage',
  }));
  return Object.freeze({
    sources: Object.freeze(sources),
    transform,
    edges: Object.freeze(edges),
    projectTransformSample,
  });
}

export const {
  sources: SEMANTIC_WORKBENCH_SOURCE,
  transform: SEMANTIC_WORKBENCH_TRANSFORM,
  edges: SEMANTIC_WORKBENCH_EDGE,
} = buildSemanticWorkbenchFixture();
