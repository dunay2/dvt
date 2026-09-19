import { describe, expect, it } from 'vitest';

import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import {
  resolveCanvasRelationalOperationChoices,
  type CanvasRelationalOperationAvailability,
} from './canvasRelationalOperationChoices';

function input(args: {
  nodeId: string;
  connectionId?: string;
  provider?: 'postgres' | 'snowflake';
  joinDataType?: CanvasDvtCompositionInput['fields'][number]['joinDataType'];
}): CanvasDvtCompositionInput {
  return {
    nodeId: args.nodeId,
    schema: 'raw',
    table: args.nodeId,
    sourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        provider: args.provider ?? 'postgres',
        connectionId: args.connectionId ?? 'warehouse-main',
      },
      sourceObjectId: `raw.${args.nodeId}`,
    },
    fields: [
      {
        name: 'id',
        dataType: args.joinDataType == null ? 'text' : args.joinDataType,
        joinDataType: args.joinDataType === undefined ? 'string' : args.joinDataType,
      },
    ],
  };
}

function availability(args: {
  inputs?: readonly CanvasDvtCompositionInput[];
  predicateAvailable?: boolean;
  readOnly?: boolean;
  unionAllAvailable?: boolean;
}): Record<string, CanvasRelationalOperationAvailability> {
  return Object.fromEntries(
    resolveCanvasRelationalOperationChoices({
      inputs: args.inputs ?? [input({ nodeId: 'orders' }), input({ nodeId: 'customers' })],
      predicateAvailable: args.predicateAvailable ?? false,
      readOnly: args.readOnly ?? false,
      unionAllAvailable: args.unionAllAvailable ?? false,
    }).map((choice) => [choice.operation, choice.availability])
  );
}

describe('resolveCanvasRelationalOperationChoices', () => {
  it('separates a pending JOIN predicate from an available schema-compatible UNION ALL', () => {
    expect(availability({ unionAllAvailable: true })).toEqual({
      inner_join: 'needs-predicate',
      left_join: 'needs-predicate',
      right_join: 'needs-predicate',
      full_outer_join: 'needs-predicate',
      union_all: 'available',
    });
  });

  it('reports schema alignment instead of offering an incompatible UNION ALL', () => {
    expect(availability({})).toEqual({
      inner_join: 'needs-predicate',
      left_join: 'needs-predicate',
      right_join: 'needs-predicate',
      full_outer_join: 'needs-predicate',
      union_all: 'needs-schema-alignment',
    });
  });

  it('offers INNER JOIN when a valid predicate proposal is already available', () => {
    expect(availability({ predicateAvailable: true }).inner_join).toBe('available');
    expect(availability({ predicateAvailable: true }).left_join).toBe('available');
    expect(availability({ predicateAvailable: true }).right_join).toBe('available');
    expect(availability({ predicateAvailable: true }).full_outer_join).toBe('available');
  });

  it('keeps target readiness separate from semantic admission', () => {
    expect(
      availability({
        inputs: [
          input({ nodeId: 'orders', connectionId: 'warehouse-a' }),
          input({ nodeId: 'customers', connectionId: 'warehouse-b' }),
        ],
      })
    ).toEqual({
      inner_join: 'target-unavailable',
      left_join: 'target-unavailable',
      right_join: 'target-unavailable',
      full_outer_join: 'target-unavailable',
      union_all: 'target-unavailable',
    });
  });

  it('admits an existing non-string canonical type on both inputs', () => {
    expect(
      availability({
        inputs: [
          input({ nodeId: 'orders', joinDataType: 'i64' }),
          input({ nodeId: 'customers', joinDataType: 'i64' }),
        ],
      }).inner_join
    ).toBe('needs-predicate');
  });

  it('reports unbound or unlike predicate operands as semantically unavailable', () => {
    expect(
      availability({
        inputs: [
          input({ nodeId: 'orders', joinDataType: null }),
          input({ nodeId: 'customers', joinDataType: null }),
        ],
      }).inner_join
    ).toBe('semantically-unavailable');
    expect(
      availability({
        inputs: [
          input({ nodeId: 'orders', joinDataType: 'i64' }),
          input({ nodeId: 'customers', joinDataType: 'bool' }),
        ],
      }).inner_join
    ).toBe('semantically-unavailable');
  });

  it('projects read-only state over otherwise available operations', () => {
    expect(availability({ readOnly: true, unionAllAvailable: true })).toEqual({
      inner_join: 'read-only',
      left_join: 'read-only',
      right_join: 'read-only',
      full_outer_join: 'read-only',
      union_all: 'read-only',
    });
  });
});
