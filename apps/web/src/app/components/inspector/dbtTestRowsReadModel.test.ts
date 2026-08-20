import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { buildDbtTestRows } from './dbtTestRowsReadModel';

function buildModelNode(overrides: Partial<CanonicalNode> = {}): CanonicalNode {
  return {
    id: 'model-orders',
    name: 'fct_orders',
    pluginId: 'dbt',
    kind: 'dbt:model',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {},
    ...overrides,
  };
}

function expectRowCells(
  rows: readonly ReturnType<typeof buildDbtTestRows>[number][],
  id: string,
  expected: Record<string, string>
): void {
  expect(rows.find((row) => row.id === id)?.cells).toMatchObject(expected);
}

describe('dbtTestRowsReadModel', () => {
  it('projects manifest-style column tests into model, column and assertion semantics', () => {
    const node = buildModelNode({
      metadata: {
        columns: {
          customer_id: {
            data_type: 'integer',
            tests: [
              {
                relationships: {
                  arguments: {
                    to: "ref('dim_customers')",
                    field: 'customer_id',
                  },
                  severity: 'error',
                  selectedForExecution: true,
                  lastRunStatus: 'passed',
                  lastRunDurationMs: 1500,
                },
              },
            ],
          },
        },
      },
    });

    const rows = buildDbtTestRows({
      node,
      metadata: node.metadata as Record<string, unknown>,
      nodes: [node],
      edges: [],
    });

    expectRowCells(rows, 'test:model-orders:customer_id:relationships', {
      name: 'relationships(customer_id)',
      type: 'relationships',
      target: 'fct_orders.customer_id',
      column: 'customer_id',
      severity: 'error',
      expression: "ref('dim_customers').customer_id",
      assertion: "Value references ref('dim_customers').customer_id",
      selection: 'selected',
      readinessImpact: 'blocks run',
      lastRun: 'passed in 1.5s',
    });
  });

  it('projects connected dbt test nodes without inventing missing test types', () => {
    const modelNode = buildModelNode();
    const testNode = buildModelNode({
      id: 'test-orders-status',
      name: 'accepted_values_orders_status',
      kind: 'dbt:test',
      role: 'check',
      status: 'failed',
      lastDuration: 2.3,
      metadata: {
        accepted_values: {
          values: ['created', 'paid'],
          severity: 'warn',
        },
        testTargetColumn: 'status',
      },
    });
    const edge: CanonicalEdge = {
      id: 'edge-model-test',
      sourceId: modelNode.id,
      targetId: testNode.id,
      relation: 'validation',
    };

    const rows = buildDbtTestRows({
      node: modelNode,
      metadata: modelNode.metadata as Record<string, unknown>,
      nodes: [modelNode, testNode],
      edges: [edge],
    });

    expectRowCells(rows, 'test:test-orders-status', {
      name: 'accepted_values_orders_status',
      type: 'accepted_values',
      target: 'fct_orders.status',
      column: 'status',
      severity: 'warn',
      expression: 'values: created, paid',
      assertion: 'Value is one of created, paid',
      readinessImpact: 'warning',
      lastRun: 'failed in 2.3s',
    });
  });

  it.each([
    ['not_null', 'error'],
    ['unique', 'warn'],
  ] as const)(
    'projects canonical authored %s tests with %s severity for the connected model',
    (testType, severity) => {
      const modelNode = buildModelNode();
      const testNode = buildModelNode({
        id: `test-orders-${testType}`,
        name: `${testType}_orders_order_id`,
        kind: 'dbt:test',
        role: 'check',
        metadata: {
          dbtTest: {
            testType,
            targetModelId: modelNode.id,
            targetColumn: 'order_id',
            severity,
          },
        },
      });
      const edge: CanonicalEdge = {
        id: `edge-model-${testType}`,
        sourceId: modelNode.id,
        targetId: testNode.id,
        relation: 'validation',
      };

      const rows = buildDbtTestRows({
        node: modelNode,
        metadata: modelNode.metadata as Record<string, unknown>,
        nodes: [modelNode, testNode],
        edges: [edge],
      });

      expectRowCells(rows, `test:${testNode.id}`, {
        name: testNode.name,
        type: testType,
        target: `${modelNode.name}.order_id`,
        column: 'order_id',
        severity,
      });
    }
  );

  it('reopens a canonical authored test node with its visible target name', () => {
    const modelNode = buildModelNode();
    const testNode = buildModelNode({
      id: 'test-orders-order-id-canonical',
      name: 'unique_orders_order_id',
      kind: 'dbt:test',
      role: 'check',
      metadata: {
        dbtTest: {
          testType: 'unique',
          targetModelId: modelNode.id,
          targetColumn: 'order_id',
          severity: 'warn',
        },
      },
    });

    const rows = buildDbtTestRows({
      node: testNode,
      metadata: testNode.metadata as Record<string, unknown>,
      nodes: [modelNode, testNode],
      edges: [],
    });

    expectRowCells(rows, `test:${testNode.id}`, {
      name: testNode.name,
      type: 'unique',
      target: `${modelNode.name}.order_id`,
      column: 'order_id',
      severity: 'warn',
    });
  });

  it('falls back to canonical dbt test node status when no related model rows exist', () => {
    const testNode = buildModelNode({
      id: 'test-orders-order-id',
      name: 'unique_orders_order_id',
      kind: 'dbt:test',
      role: 'check',
      status: 'failed',
      lastDuration: 1.1,
      metadata: {
        testType: 'unique',
        testTargetModel: 'fct_orders',
        testTargetColumn: 'order_id',
        severity: 'error',
      },
    });

    const rows = buildDbtTestRows({
      node: testNode,
      metadata: testNode.metadata as Record<string, unknown>,
      nodes: [testNode],
      edges: [],
    });

    expectRowCells(rows, 'test:test-orders-order-id', {
      name: 'unique_orders_order_id',
      type: 'unique',
      target: 'fct_orders.order_id',
      column: 'order_id',
      severity: 'error',
      assertion: 'Values are unique',
      readinessImpact: 'blocks run',
      lastRun: 'failed in 1.1s',
    });
  });
});
