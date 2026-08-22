import { describe, expect, it } from 'vitest';

import {
  DvtTransformAuthoringAuthorityV1Schema,
  VisualTransformRecipeV1Schema,
  canonicalizeVisualTransformRecipeV1,
  serializeVisualTransformRecipeV1,
} from '../src/index.js';

const VISUAL_RECIPE = {
  version: 'v1',
  outputs: [
    {
      id: 'output-order-id',
      name: 'order_id',
      dataType: 'integer',
      expression: {
        inputs: [{ nodeId: 'source-orders', columnName: 'order_id' }],
        operations: [{ kind: 'passthrough' }],
      },
    },
    {
      id: 'output-customer-name',
      name: 'customer_name',
      expression: {
        inputs: [
          { nodeId: 'source-orders', columnName: 'first_name' },
          { nodeId: 'source-orders', columnName: 'last_name' },
        ],
        operations: [
          { kind: 'function', functionId: 'concat', args: [' '] },
          { kind: 'function', functionId: 'trim', args: [] },
          { kind: 'function', functionId: 'upper', args: [] },
          { kind: 'cast', targetType: 'text' },
        ],
      },
    },
  ],
  filters: [
    {
      id: 'filter-active-orders',
      input: { nodeId: 'source-orders', columnName: 'status' },
      operator: 'equals',
      value: 'active',
    },
    {
      id: 'filter-not-deleted',
      input: { nodeId: 'source-orders', columnName: 'deleted_at' },
      operator: 'is_null',
    },
  ],
} as const;

const GROUPED_RECIPE = {
  version: 'v1',
  outputs: [
    {
      id: 'output-country',
      name: 'country',
      expression: {
        inputs: [{ nodeId: 'source-orders', columnName: 'country' }],
        operations: [{ kind: 'passthrough' }],
      },
    },
    {
      id: 'output-customers',
      name: 'customers',
      expression: {
        inputs: [{ nodeId: 'source-orders', columnName: 'customer_id' }],
        operations: [{ kind: 'aggregate', functionId: 'count', distinct: true }],
      },
    },
    {
      id: 'output-orders',
      name: 'orders',
      expression: {
        inputs: [{ nodeId: 'source-orders', columnName: 'order_id' }],
        operations: [{ kind: 'aggregate', functionId: 'count' }],
      },
    },
    {
      id: 'output-revenue',
      name: 'revenue',
      expression: {
        inputs: [{ nodeId: 'source-orders', columnName: 'amount' }],
        operations: [{ kind: 'aggregate', functionId: 'sum' }],
      },
    },
    {
      id: 'output-rows',
      name: 'rows',
      expression: {
        inputs: [],
        operations: [{ kind: 'aggregate', functionId: 'count' }],
      },
    },
  ],
  filters: [
    {
      id: 'filter-paid',
      input: { nodeId: 'source-orders', columnName: 'status' },
      operator: 'equals',
      value: 'PAID',
    },
  ],
  groupBy: ['output-country'],
  having: [
    {
      id: 'having-orders',
      outputId: 'output-orders',
      operator: 'greater_than',
      value: 10,
    },
  ],
} as const;

describe('VisualTransformRecipeV1 contract', () => {
  it('accepts the bounded V1 recipe and preserves semantic array order', () => {
    expect(VisualTransformRecipeV1Schema.parse(VISUAL_RECIPE)).toEqual(VISUAL_RECIPE);
    expect(canonicalizeVisualTransformRecipeV1(VISUAL_RECIPE)).toEqual(VISUAL_RECIPE);
  });

  it('keeps existing V1 serialization byte-stable when grouping fields are absent', () => {
    const first = serializeVisualTransformRecipeV1(VISUAL_RECIPE);
    const second = serializeVisualTransformRecipeV1({
      filters: VISUAL_RECIPE.filters,
      outputs: VISUAL_RECIPE.outputs,
      version: 'v1',
    });

    expect(first).toBe(second);
    expect(JSON.parse(first)).toEqual(VISUAL_RECIPE);
  });

  it('accepts grouped outputs, bounded aggregates, COUNT(*) and HAVING', () => {
    expect(VisualTransformRecipeV1Schema.parse(GROUPED_RECIPE)).toEqual(GROUPED_RECIPE);
    expect(canonicalizeVisualTransformRecipeV1(GROUPED_RECIPE)).toEqual(GROUPED_RECIPE);
    expect(JSON.parse(serializeVisualTransformRecipeV1(GROUPED_RECIPE))).toEqual(GROUPED_RECIPE);
  });

  it('rejects duplicate stable output, filter and HAVING ids', () => {
    const duplicateOutput = {
      ...VISUAL_RECIPE,
      outputs: [VISUAL_RECIPE.outputs[0], VISUAL_RECIPE.outputs[0]],
    };
    const duplicateFilter = {
      ...VISUAL_RECIPE,
      filters: [VISUAL_RECIPE.filters[0], VISUAL_RECIPE.filters[0]],
    };
    const duplicateHaving = {
      ...GROUPED_RECIPE,
      having: [GROUPED_RECIPE.having[0], GROUPED_RECIPE.having[0]],
    };

    expect(VisualTransformRecipeV1Schema.safeParse(duplicateOutput).success).toBe(false);
    expect(VisualTransformRecipeV1Schema.safeParse(duplicateFilter).success).toBe(false);
    expect(VisualTransformRecipeV1Schema.safeParse(duplicateHaving).success).toBe(false);
  });

  it('rejects unknown operations, functions, fields, and blank column references', () => {
    const baseOutput = VISUAL_RECIPE.outputs[0];

    expect(
      VisualTransformRecipeV1Schema.safeParse({
        ...VISUAL_RECIPE,
        outputs: [
          {
            ...baseOutput,
            expression: { ...baseOutput.expression, operations: [{ kind: 'join' }] },
          },
        ],
      }).success
    ).toBe(false);
    expect(
      VisualTransformRecipeV1Schema.safeParse({
        ...VISUAL_RECIPE,
        outputs: [
          {
            ...baseOutput,
            expression: {
              ...baseOutput.expression,
              operations: [{ kind: 'function', functionId: 'arbitrary_sql', args: [] }],
            },
          },
        ],
      }).success
    ).toBe(false);
    expect(
      VisualTransformRecipeV1Schema.safeParse({ ...VISUAL_RECIPE, geometry: { x: 1, y: 2 } })
        .success
    ).toBe(false);
    expect(
      VisualTransformRecipeV1Schema.safeParse({
        ...VISUAL_RECIPE,
        outputs: [
          {
            ...baseOutput,
            expression: {
              ...baseOutput.expression,
              inputs: [{ nodeId: 'source-orders', columnName: '  ' }],
            },
          },
        ],
      }).success
    ).toBe(false);
  });

  it('requires filter values only for comparison operators', () => {
    expect(
      VisualTransformRecipeV1Schema.safeParse({
        ...VISUAL_RECIPE,
        filters: [
          {
            id: 'missing-value',
            input: { nodeId: 'source-orders', columnName: 'status' },
            operator: 'equals',
          },
        ],
      }).success
    ).toBe(false);
    expect(
      VisualTransformRecipeV1Schema.safeParse({
        ...VISUAL_RECIPE,
        filters: [
          {
            id: 'invalid-null-value',
            input: { nodeId: 'source-orders', columnName: 'deleted_at' },
            operator: 'is_null',
            value: null,
          },
        ],
      }).success
    ).toBe(false);
  });

  it('rejects invalid aggregate shapes without introducing a generic expression model', () => {
    const countDistinctStar = {
      ...GROUPED_RECIPE,
      outputs: [
        GROUPED_RECIPE.outputs[0],
        {
          id: 'output-invalid',
          name: 'invalid',
          expression: {
            inputs: [],
            operations: [{ kind: 'aggregate', functionId: 'count', distinct: true }],
          },
        },
      ],
      groupBy: ['output-country'],
      having: [],
    };
    const sumWithoutInput = {
      ...GROUPED_RECIPE,
      outputs: [
        GROUPED_RECIPE.outputs[0],
        {
          id: 'output-invalid',
          name: 'invalid',
          expression: {
            inputs: [],
            operations: [{ kind: 'aggregate', functionId: 'sum' }],
          },
        },
      ],
      groupBy: ['output-country'],
      having: [],
    };
    const aggregateBeforeScalar = {
      ...GROUPED_RECIPE,
      outputs: [
        GROUPED_RECIPE.outputs[0],
        {
          id: 'output-invalid',
          name: 'invalid',
          expression: {
            inputs: [{ nodeId: 'source-orders', columnName: 'order_id' }],
            operations: [
              { kind: 'aggregate', functionId: 'count' },
              { kind: 'cast', targetType: 'text' },
            ],
          },
        },
      ],
      groupBy: ['output-country'],
      having: [],
    };

    expect(VisualTransformRecipeV1Schema.safeParse(countDistinctStar).success).toBe(false);
    expect(VisualTransformRecipeV1Schema.safeParse(sumWithoutInput).success).toBe(false);
    expect(VisualTransformRecipeV1Schema.safeParse(aggregateBeforeScalar).success).toBe(false);
  });

  it('fails closed for mixed grain, invalid group references and non-aggregate HAVING targets', () => {
    expect(
      VisualTransformRecipeV1Schema.safeParse({
        ...GROUPED_RECIPE,
        groupBy: [],
      }).success
    ).toBe(false);
    expect(
      VisualTransformRecipeV1Schema.safeParse({
        ...GROUPED_RECIPE,
        groupBy: ['missing-output'],
      }).success
    ).toBe(false);
    expect(
      VisualTransformRecipeV1Schema.safeParse({
        ...GROUPED_RECIPE,
        groupBy: ['output-country', 'output-country'],
      }).success
    ).toBe(false);
    expect(
      VisualTransformRecipeV1Schema.safeParse({
        ...GROUPED_RECIPE,
        groupBy: ['output-orders'],
      }).success
    ).toBe(false);
    expect(
      VisualTransformRecipeV1Schema.safeParse({
        ...GROUPED_RECIPE,
        having: [
          {
            id: 'having-country',
            outputId: 'output-country',
            operator: 'equals',
            value: 'ES',
          },
        ],
      }).success
    ).toBe(false);
  });
});

describe('DvtTransformAuthoringAuthorityV1 contract', () => {
  it('accepts exactly one editable authority per mode', () => {
    expect(
      DvtTransformAuthoringAuthorityV1Schema.parse({
        version: 'v1',
        mode: 'visual',
        recipe: VISUAL_RECIPE,
      })
    ).toEqual({ version: 'v1', mode: 'visual', recipe: VISUAL_RECIPE });
    expect(DvtTransformAuthoringAuthorityV1Schema.parse({ version: 'v1', mode: 'sql' })).toEqual({
      version: 'v1',
      mode: 'sql',
    });
  });

  it('rejects a recipe on SQL authority and editable SQL on visual authority', () => {
    expect(
      DvtTransformAuthoringAuthorityV1Schema.safeParse({
        version: 'v1',
        mode: 'sql',
        recipe: VISUAL_RECIPE,
      }).success
    ).toBe(false);
    expect(
      DvtTransformAuthoringAuthorityV1Schema.safeParse({
        version: 'v1',
        mode: 'visual',
        recipe: VISUAL_RECIPE,
        sql: 'select * from orders',
      }).success
    ).toBe(false);
  });
});
