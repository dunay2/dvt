/** Proves output inspection resolves canonical identity without a second expression authority. */
import { describe, expect, it } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { createDvtSubstraitProjectionOutput } from './canvasDvtSubstraitCalculatedColumn';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitColumnFunctions,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { projectCanvasOutputExpression } from './canvasOutputExpressionProjection';

function fixture(): DvtSubstraitProjectionDraft {
  return createDvtSubstraitProjectionDraft({
    source: {
      nodeId: 'orders',
      schema: 'raw',
      table: 'orders',
      sourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        sourceObjectId: 'raw.orders',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'postgres-main',
          provider: 'postgres',
        },
      },
      fields: [
        { name: 'customer', dataType: 'text' },
        { name: 'country', dataType: 'text' },
      ],
    },
    targetNodeId: 'transform-orders',
    outputs: [
      { fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' },
      { fieldId: 'output:country', name: 'country', sourceFieldName: 'country' },
    ],
  });
}

function node(draft: DvtSubstraitProjectionDraft): CanonicalNode {
  return applyDvtSubstraitSemanticDocument(
    {
      id: 'transform-orders',
      name: 'Orders',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
    },
    encodeDvtSubstraitProjectionDocument(draft)
  );
}

function scalar(
  draft: DvtSubstraitProjectionDraft,
  name: string,
  operands: [string, ...string[]],
  alias: string
): Extract<ReturnType<typeof createDvtSubstraitProjectionOutput>, { outcome: 'applied' }> {
  const dataTypes = operands.map(() => 'string');
  const capability = resolveDvtSubstraitColumnFunctions({ dataTypes, provider: 'postgres' }).find(
    (entry) => entry.name.toLowerCase() === name
  );
  expect(capability).toBeDefined();
  const result = createDvtSubstraitProjectionOutput(
    draft,
    {
      alias,
      expression: {
        kind: 'scalar-function',
        capabilityId: capability!.capabilityId,
        operandFieldIds: operands,
      },
    },
    { inputDataTypes: dataTypes, provider: 'postgres' }
  );
  if (result.outcome !== 'applied') throw new Error(result.reason);
  return result;
}

describe('canonical output expression inspection', () => {
  it('resolves a direct mapping by FieldId as one leaf without persisting an expression', () => {
    const transform = node(fixture());
    const before = JSON.stringify(transform);
    const result = projectCanvasOutputExpression(transform, 'output:customer');
    expect(result).toMatchObject({
      status: 'available',
      fieldId: 'output:customer',
      alias: 'customer',
    });
    if (result.status !== 'available') throw new Error(result.reason);
    expect(result.graph.nodes.map((entry) => entry.data.label)).toEqual(['FIELD\ncustomer']);
    expect(result.graph.edges).toHaveLength(0);
    expect(JSON.stringify(transform)).toBe(before);
    expect(projectCanvasOutputExpression(transform, 'customer').status).toBe('unavailable');
  });

  it('preserves nested unary and ordered branching arguments on document reload', () => {
    const trimmed = scalar(fixture(), 'trim', ['output:customer'], 'customer_trimmed');
    const upper = scalar(trimmed.draft, 'upper', [trimmed.createdFieldId], 'customer_upper');
    const pair = scalar(
      upper.draft,
      'concat',
      [upper.createdFieldId, 'output:country'],
      'customer_pair'
    );
    const transform = node(pair.draft);
    transform.metadata = {
      ...transform.metadata,
      columns: [{ name: 'customer_pair', operations: ['WRONG'] }],
    };
    const before = JSON.stringify(transform);
    const result = projectCanvasOutputExpression(transform, pair.createdFieldId);
    expect(result.status).toBe('available');
    if (result.status !== 'available') throw new Error(result.reason);
    expect(result.graph.nodes.map((entry) => entry.data.label.split('\n')[0])).toEqual([
      'CONCAT',
      'UPPER',
      'TRIM',
      'FIELD',
      'FIELD',
    ]);
    expect(result.graph.nodes[0]?.data.expression).toBe('concat(upper(trim(customer)), country)');
    const leaves = result.graph.nodes.filter((entry) => entry.data.semanticKind === 'field');
    expect(leaves.map((entry) => entry.data.label)).toEqual(['FIELD\ncustomer', 'FIELD\ncountry']);
    expect(leaves[0]!.position.x).toBeLessThan(leaves[1]!.position.x);
    expect(projectCanvasOutputExpression(JSON.parse(before), pair.createdFieldId)).toEqual(result);
    expect(JSON.stringify(transform)).toBe(before);
  });

  it.each([
    { kind: 'string-literal' as const, value: "O'Reilly" },
    { kind: 'timestamp-literal' as const, value: '2026-09-14T10:00:00.000Z' },
  ])('displays a typed $kind exactly', (expression) => {
    const added = createDvtSubstraitProjectionOutput(fixture(), { alias: 'constant', expression });
    if (added.outcome !== 'applied') throw new Error(added.reason);
    const result = projectCanvasOutputExpression(node(added.draft), added.createdFieldId);
    expect(result.status).toBe('available');
    if (result.status !== 'available') throw new Error(result.reason);
    expect(result.graph.nodes).toHaveLength(1);
    expect(result.graph.nodes[0]?.data.detail).toContain(expression.value);
    expect(result.graph.nodes[0]?.data.detail).not.toContain('[object Object]');
  });

  it('preserves all arguments of a variadic function and its nested unary operand', () => {
    const trimmed = scalar(fixture(), 'trim', ['output:customer'], 'trimmed');
    const combined = scalar(
      trimmed.draft,
      'coalesce',
      ['output:country', trimmed.createdFieldId, 'output:customer'],
      'combined'
    );
    const result = projectCanvasOutputExpression(node(combined.draft), combined.createdFieldId);
    if (result.status !== 'available') throw new Error(result.reason);
    expect(result.graph.nodes[0]?.data.expression).toBe(
      'coalesce(country, trim(customer), customer)'
    );
    expect(
      result.graph.edges
        .filter((edge) => edge.target === result.graph.nodes[0]?.id)
        .map((edge) => edge.label)
    ).toEqual(['1', '2', '3']);
  });

  it('retains admitted temporal enum arguments and UTC options', () => {
    const literal = createDvtSubstraitProjectionOutput(fixture(), {
      alias: 'at_time',
      expression: { kind: 'timestamp-literal', value: '2026-09-14T10:00:00.000Z' },
    });
    if (literal.outcome !== 'applied') throw new Error(literal.reason);
    const dataTypes = ['timestamp with time zone'];
    const capability = resolveDvtSubstraitColumnFunctions({ dataTypes, provider: 'postgres' }).find(
      (entry) => entry.name === 'extract year (UTC)'
    );
    expect(capability).toBeDefined();
    const extracted = createDvtSubstraitProjectionOutput(
      literal.draft,
      {
        alias: 'year_part',
        expression: {
          kind: 'scalar-function',
          capabilityId: capability!.capabilityId,
          operandFieldIds: [literal.createdFieldId],
        },
      },
      { inputDataTypes: dataTypes, provider: 'postgres' }
    );
    if (extracted.outcome !== 'applied') throw new Error(extracted.reason);
    const result = projectCanvasOutputExpression(node(extracted.draft), extracted.createdFieldId);
    if (result.status !== 'available') throw new Error(result.reason);
    expect(result.graph.nodes.map((entry) => entry.data.label.split('\n')[0])).toEqual([
      'EXTRACT',
      'ENUM',
      'VALUE',
      'VALUE',
    ]);
    expect(result.graph.nodes[0]?.data.detail).toContain('UTC');
    expect(result.graph.nodes[1]?.data.label).toBe('ENUM\nYEAR');
  });

  it('rejects absent authority, stale identity and unsupported window output without a partial tree', () => {
    const transform = node(fixture());
    expect(
      projectCanvasOutputExpression({ ...transform, metadata: {} }, 'output:customer').status
    ).toBe('unavailable');
    expect(projectCanvasOutputExpression(transform, 'missing').status).toBe('unavailable');
    const added = createDvtSubstraitProjectionOutput(fixture(), {
      alias: 'position',
      expression: { kind: 'row-number', orderFieldId: 'output:customer' },
    });
    if (added.outcome !== 'applied') throw new Error(added.reason);
    expect(projectCanvasOutputExpression(node(added.draft), added.createdFieldId).status).toBe(
      'unavailable'
    );
  });
});
