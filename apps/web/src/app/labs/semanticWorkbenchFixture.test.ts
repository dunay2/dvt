import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from '../views/canvas/canvasDvtSubstraitSemanticDocument';
import { readDvtTransformAuthoringAuthority } from '../views/canvas/canvasDvtTransformAuthoringAuthority';
import clientFixture from './fixtures/client.json';
import orderDetailsFixture from './fixtures/order-details.json';
import ordersFixture from './fixtures/orders.json';
import {
  SEMANTIC_WORKBENCH_SOURCE,
  SEMANTIC_WORKBENCH_EDGE,
  SEMANTIC_WORKBENCH_TRANSFORM,
  buildSemanticWorkbenchFixture,
} from './semanticWorkbenchFixture';
import { loadSemanticWorkbenchDataset } from './semanticWorkbenchDataset';
describe('canonical lab fixture', () => {
  it('derives all three canonical source cards from the JSON dataset schemas', () => {
    const datasets = [
      loadSemanticWorkbenchDataset(ordersFixture),
      loadSemanticWorkbenchDataset(clientFixture),
      loadSemanticWorkbenchDataset(orderDetailsFixture),
    ];
    expect(SEMANTIC_WORKBENCH_SOURCE.map((source) => source.name)).toEqual([
      'Orders',
      'Client',
      'Order Details',
    ]);
    expect(SEMANTIC_WORKBENCH_SOURCE.map((source) => source.metadata?.columns)).toEqual(
      datasets.map((dataset) => dataset.columns)
    );
    expect(SEMANTIC_WORKBENCH_SOURCE.map((source) => source.metadata?.sampleRows)).toEqual(
      datasets.map((dataset) => dataset.rows)
    );
    expect(SEMANTIC_WORKBENCH_EDGE.map((edge) => edge.sourceId)).toEqual([
      'lab-source-orders',
      'lab-source-client',
      'lab-source-order_details',
    ]);
    expect(
      SEMANTIC_WORKBENCH_SOURCE.map(
        (source) =>
          (source.metadata?.sourceMetricEvidence as { rowCount: { value: number } }).rowCount.value
      )
    ).toEqual([8, 5, 10]);
  });

  it('derives every physical schema and both JOIN stages from canonical Substrait', () => {
    const authority = readDvtTransformAuthoringAuthority(SEMANTIC_WORKBENCH_TRANSFORM)!;
    const { index, schemas } = deriveSubstraitSchemas(
      decodeDvtSubstraitSemanticDocument(authority.semanticDocument)
    );
    const entries = [...index.relations.values()];
    expect(entries.filter((entry) => entry.relation.relType.case === 'join')).toHaveLength(2);
    const physical = entries.filter((entry) => entry.relation.relType.case === 'read');
    expect(physical).toHaveLength(SEMANTIC_WORKBENCH_SOURCE.length);
    for (const entry of physical) {
      const source = SEMANTIC_WORKBENCH_SOURCE.find(
        (node) => node.metadata?.tableName === entry.binding.displayName
      )!;
      const dataset = loadSemanticWorkbenchDataset(
        [ordersFixture, clientFixture, orderDetailsFixture].find(
          (value) => value.tableName === source.metadata?.tableName
        )
      );
      expect(entry.fields.map((field) => field.displayName)).toEqual(
        dataset.columns.map((column) => column.name)
      );
      const types = {
        integer: 'i64',
        numeric: 'fp64',
        text: 'string',
        boolean: 'bool',
        timestamp: 'precisionTimestampTz',
      };
      expect(schemas.get(entry.binding.relationId)!.map((field) => field.type.kind.case)).toEqual(
        dataset.columns.map((column) => types[column.type])
      );
    }
  });

  it('rejects Order Details rows that do not reference an existing order', () => {
    const invalidOrderDetails = structuredClone(orderDetailsFixture);
    invalidOrderDetails.rows[0]!.order_id = 'ORD-MISSING';

    expect(() => buildSemanticWorkbenchFixture({ orderDetails: invalidOrderDetails })).toThrow(
      'order_details.order_id references missing orders.order_id value "ORD-MISSING".'
    );
  });
  it('retains identities, types and nullability across persistence', () => {
    const document = decodeDvtSubstraitSemanticDocument(
      readDvtTransformAuthoringAuthority(SEMANTIC_WORKBENCH_TRANSFORM)!.semanticDocument
    );
    const reopened = decodeDvtSubstraitSemanticDocument(
      encodeDvtSubstraitSemanticDocument(document)
    );
    expect(reopened.sidecar).toEqual(document.sidecar);
    expect(deriveSubstraitSchemas(reopened).schemas).toEqual(
      deriveSubstraitSchemas(document).schemas
    );
  });
});
