import type { VisualTransformRecipeV1 } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  VisualTransformSqlCompilationError,
  compileVisualTransformRecipeToPostgresSql,
} from './canvasVisualTransformSqlCompiler';

const SOURCE_BINDING = {
  nodeId: 'source-orders',
  schema: 'raw',
  table: 'orders',
  alias: 'source orders',
} as const;

const RECIPE: VisualTransformRecipeV1 = {
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
      id: 'output-user-id',
      name: 'user_id',
      dataType: 'text',
      expression: {
        inputs: [{ nodeId: 'source-orders', columnName: 'principal_id' }],
        operations: [{ kind: 'passthrough' }],
      },
    },
    {
      id: 'output-event-date',
      name: 'event_date',
      dataType: 'date',
      expression: {
        inputs: [{ nodeId: 'source-orders', columnName: 'created_at' }],
        operations: [{ kind: 'cast', targetType: 'date' }],
      },
    },
    {
      id: 'output-event-type',
      name: 'event_type_clean',
      dataType: 'text',
      expression: {
        inputs: [{ nodeId: 'source-orders', columnName: 'event_type' }],
        operations: [
          { kind: 'function', functionId: 'trim', args: [] },
          { kind: 'function', functionId: 'upper', args: [] },
          { kind: 'function', functionId: 'coalesce', args: ['UNKNOWN'] },
        ],
      },
    },
    {
      id: 'output-full-name',
      name: 'full_name',
      dataType: 'text',
      expression: {
        inputs: [
          { nodeId: 'source-orders', columnName: 'first_name' },
          { nodeId: 'source-orders', columnName: 'last_name' },
        ],
        operations: [
          { kind: 'function', functionId: 'concat', args: [' '] },
          { kind: 'function', functionId: 'upper', args: [] },
        ],
      },
    },
    {
      id: 'output-origin',
      name: 'origin',
      dataType: 'text',
      expression: {
        inputs: [],
        operations: [{ kind: 'constant', value: "visual's recipe" }],
      },
    },
  ],
  filters: [
    {
      id: 'filter-active',
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
};

describe('Visual transform PostgreSQL compiler', () => {
  it('compiles the bounded V1 recipe into deterministic, safely quoted SQL', () => {
    const sql = compileVisualTransformRecipeToPostgresSql({
      recipe: RECIPE,
      sourceBinding: SOURCE_BINDING,
    });

    expect(sql).toBe(
      [
        'select',
        '  "source orders"."order_id" as "order_id",',
        '  "source orders"."principal_id" as "user_id",',
        '  cast("source orders"."created_at" as date) as "event_date",',
        `  coalesce(upper(trim("source orders"."event_type")), 'UNKNOWN') as "event_type_clean",`,
        `  upper(concat_ws(' ', "source orders"."first_name", "source orders"."last_name")) as "full_name",`,
        `  'visual''s recipe' as "origin"`,
        'from "raw"."orders" as "source orders"',
        `where "source orders"."status" = 'active'`,
        '  and "source orders"."deleted_at" is null;',
        '',
      ].join('\n')
    );
    expect(
      compileVisualTransformRecipeToPostgresSql({
        recipe: structuredClone(RECIPE),
        sourceBinding: { ...SOURCE_BINDING },
      })
    ).toBe(sql);
  });

  it('accepts the timestamptz cast exposed by visual authoring', () => {
    const recipe: VisualTransformRecipeV1 = {
      ...RECIPE,
      outputs: [
        {
          id: 'output-event-time',
          name: 'event_time',
          dataType: 'timestamptz',
          expression: {
            inputs: [{ nodeId: 'source-orders', columnName: 'created_at' }],
            operations: [{ kind: 'cast', targetType: 'timestamptz' }],
          },
        },
      ],
      filters: [],
    };

    expect(compileVisualTransformRecipeToPostgresSql({ recipe, sourceBinding: SOURCE_BINDING })).toBe(
      [
        'select',
        '  cast("source orders"."created_at" as timestamptz) as "event_time"',
        'from "raw"."orders" as "source orders";',
        '',
      ].join('\n')
    );
  });

  it('fails closed for missing outputs, unrelated inputs, unsafe casts, and invalid function args', () => {
    const cases: readonly [VisualTransformRecipeV1, string][] = [
      [{ ...RECIPE, outputs: [] }, 'empty_outputs'],
      [
        {
          ...RECIPE,
          outputs: [
            {
              ...RECIPE.outputs[0]!,
              expression: {
                ...RECIPE.outputs[0]!.expression,
                inputs: [{ nodeId: 'other-source', columnName: 'order_id' }],
              },
            },
          ],
        },
        'unknown_input_node',
      ],
      [
        {
          ...RECIPE,
          outputs: [
            {
              ...RECIPE.outputs[0]!,
              expression: {
                ...RECIPE.outputs[0]!.expression,
                operations: [{ kind: 'cast', targetType: 'date); drop table orders; --' }],
              },
            },
          ],
        },
        'unsupported_cast_type',
      ],
      [
        {
          ...RECIPE,
          outputs: [
            {
              ...RECIPE.outputs[0]!,
              expression: {
                ...RECIPE.outputs[0]!.expression,
                operations: [{ kind: 'function', functionId: 'upper', args: ['unexpected'] }],
              },
            },
          ],
        },
        'invalid_function_arguments',
      ],
    ];

    for (const [recipe, expectedCode] of cases) {
      expect(() =>
        compileVisualTransformRecipeToPostgresSql({ recipe, sourceBinding: SOURCE_BINDING })
      ).toThrowError(expect.objectContaining({ code: expectedCode }));
    }
  });

  it('does not let constant operations silently discard lineage inputs', () => {
    const recipe: VisualTransformRecipeV1 = {
      ...RECIPE,
      outputs: [
        {
          ...RECIPE.outputs[0]!,
          expression: {
            ...RECIPE.outputs[0]!.expression,
            operations: [{ kind: 'constant', value: 1 }],
          },
        },
      ],
    };

    try {
      compileVisualTransformRecipeToPostgresSql({ recipe, sourceBinding: SOURCE_BINDING });
      throw new Error('Expected compilation to fail.');
    } catch (error) {
      expect(error).toBeInstanceOf(VisualTransformSqlCompilationError);
      expect(error).toMatchObject({ code: 'constant_with_inputs' });
    }
  });

  it('compiles null equality with PostgreSQL null semantics', () => {
    const sql = compileVisualTransformRecipeToPostgresSql({
      recipe: {
        ...RECIPE,
        filters: [
          {
            id: 'filter-null',
            input: { nodeId: 'source-orders', columnName: 'deleted_at' },
            operator: 'equals',
            value: null,
          },
          {
            id: 'filter-not-null',
            input: { nodeId: 'source-orders', columnName: 'processed_at' },
            operator: 'not_equals',
            value: null,
          },
        ],
      },
      sourceBinding: SOURCE_BINDING,
    });

    expect(sql).toContain('where "source orders"."deleted_at" is null');
    expect(sql).toContain('  and "source orders"."processed_at" is not null;');
    expect(sql).not.toContain('= null');
    expect(sql).not.toContain('<> null');
  });

  it('fails closed when an ordered comparison receives null', () => {
    const recipe: VisualTransformRecipeV1 = {
      ...RECIPE,
      filters: [
        {
          id: 'filter-invalid-null',
          input: { nodeId: 'source-orders', columnName: 'created_at' },
          operator: 'greater_than',
          value: null,
        },
      ],
    };

    expect(() =>
      compileVisualTransformRecipeToPostgresSql({ recipe, sourceBinding: SOURCE_BINDING })
    ).toThrowError(expect.objectContaining({ code: 'invalid_filter_value' }));
  });
});